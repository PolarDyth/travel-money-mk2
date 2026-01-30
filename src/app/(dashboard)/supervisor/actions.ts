'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { hasRoleOrHigher, type UserRole } from '@/types';
import {
  ValidationError,
  AuthError,
  AuthorizationError,
  DatabaseError,
  ErrorCode,
  formatZodError,
  formatSupabaseError,
  captureError
} from "@/lib/errors";
import { createErrorResult, createSuccessResult, ActionResult } from "@/lib/types/response";

const TillActionSchema = z.object({
  session_id: z.string().uuid(),
  reason: z.string().min(5).max(500),
});

async function getSupervisorProfile(userId: string): Promise<ActionResult<{ id: string; role: UserRole; branch_id: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('id, role, is_active, branch_id')
    .eq('id', userId)
    .single();

  if (error || !data) {
    const appError = new DatabaseError(
      error?.message || "Profile not found",
      "Supervisor profile not found or inactive."
    )
    return createErrorResult(
      appError.code,
      appError.message,
      appError.userMessage
    );
  }

  if (!data.is_active) {
    const error = new AuthError("Account is inactive", "Your account is inactive. Please contact your administrator.")
    return createErrorResult(
      error.code,
      error.message,
      error.userMessage
    );
  }

  if (!hasRoleOrHigher(data.role as UserRole, 'supervisor')) {
    const error = new AuthorizationError(
      "User does not have supervisor role",
      "You need supervisor or higher permissions to perform this action."
    )
    return createErrorResult(
      error.code,
      error.message,
      error.userMessage
    );
  }

  return createSuccessResult(data);
}

async function getSessionForAction(sessionId: string): Promise<ActionResult<{ id: string; status: string; branch_id: string; operator_id: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('drawer_sessions')
    .select('id, status, branch_id, operator_id')
    .eq('id', sessionId)
    .single();

  if (error || !data) {
    const appError = new DatabaseError(
      error?.message || "Session not found",
      "Drawer session not found."
    )
    return createErrorResult(
      appError.code,
      appError.message,
      appError.userMessage
    );
  }

  if (data.status !== 'open') {
    const error = new DatabaseError(
      `Session status is ${data.status}, not open`,
      "Only open sessions can be suspended or closed."
    )
    return createErrorResult(
      error.code,
      error.message,
      error.userMessage,
      { currentStatus: data.status }
    );
  }

  return createSuccessResult(data);
}

export async function suspendDrawerSession(input: z.infer<typeof TillActionSchema>): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const error = new AuthError(authError?.message || "Not authenticated");
      captureError(error, { action: "suspendDrawerSession" });
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage
      );
    }

    const parsed = TillActionSchema.safeParse(input);
    if (!parsed.success) {
      const errorMessage = formatZodError(parsed.error)
      const error = new ValidationError(errorMessage, "Invalid input provided.")
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage,
        error.details
      );
    }

    const profileResult = await getSupervisorProfile(user.id);
    if (!profileResult.success || !profileResult.data) {
      return createErrorResult(
        profileResult.error?.code || ErrorCode.INTERNAL_ERROR,
        profileResult.error?.message || "Failed to get supervisor profile",
        profileResult.error?.userMessage || "An unexpected error occurred"
      );
    }

    const sessionResult = await getSessionForAction(parsed.data.session_id);
    if (!sessionResult.success || !sessionResult.data) {
      return createErrorResult(
        sessionResult.error?.code || ErrorCode.INTERNAL_ERROR,
        sessionResult.error?.message || "Failed to get session",
        sessionResult.error?.userMessage || "An unexpected error occurred"
      );
    }

    if (sessionResult.data.branch_id !== profileResult.data.branch_id) {
      const error = new AuthorizationError(
        "Attempted to modify session from different branch",
        "Cannot modify sessions for another branch."
      )
      captureError(error, {
        action: "suspendDrawerSession",
        userBranchId: profileResult.data.branch_id,
        sessionBranchId: sessionResult.data.branch_id
      })
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage
      );
    }

    const { error } = await supabase
      .from('drawer_sessions')
      .update({
        status: 'suspended',
        closing_notes: `Suspended: ${parsed.data.reason}`,
      })
      .eq('id', parsed.data.session_id)
      .eq('status', 'open');

    if (error) {
      const appError = formatSupabaseError(error);
      const dbError = new DatabaseError(
        appError.message,
        "Failed to suspend drawer session.",
        { ...appError.details, sessionId: parsed.data.session_id }
      );
      captureError(dbError, {
        action: "suspendDrawerSession",
        sessionId: parsed.data.session_id
      });
      return createErrorResult(
        dbError.code,
        dbError.message,
        dbError.userMessage,
        dbError.details
      );
    }

    const { error: notificationError } = await supabase
      .from('operator_notifications')
      .insert({
        operator_id: sessionResult.data.operator_id,
        session_id: parsed.data.session_id,
        type: 'till_suspended',
        message: `Your till was suspended by a supervisor. Reason: ${parsed.data.reason}`,
      });

    if (notificationError) {
      // Non-critical error - log but don't fail
      captureError(new DatabaseError(
        notificationError.message,
        "Failed to create operator notification."
      ), { action: "suspendDrawerSession", sessionId: parsed.data.session_id });
    }

    revalidatePath('/supervisor');
    return createSuccessResult();
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error));
    captureError(appError, { action: "suspendDrawerSession" });
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred while suspending drawer. Please try again.",
      { originalError: appError.message }
    );
  }
}

export async function forceCloseDrawerSession(input: z.infer<typeof TillActionSchema>): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const error = new AuthError(authError?.message || "Not authenticated");
      captureError(error, { action: "forceCloseDrawerSession" });
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage
      );
    }

    const parsed = TillActionSchema.safeParse(input);
    if (!parsed.success) {
      const errorMessage = formatZodError(parsed.error)
      const error = new ValidationError(errorMessage, "Invalid input provided.")
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage,
        error.details
      );
    }

    const profileResult = await getSupervisorProfile(user.id);
    if (!profileResult.success || !profileResult.data) {
      return createErrorResult(
        profileResult.error?.code || ErrorCode.INTERNAL_ERROR,
        profileResult.error?.message || "Failed to get supervisor profile",
        profileResult.error?.userMessage || "An unexpected error occurred"
      );
    }

    const sessionResult = await getSessionForAction(parsed.data.session_id);
    if (!sessionResult.success || !sessionResult.data) {
      return createErrorResult(
        sessionResult.error?.code || ErrorCode.INTERNAL_ERROR,
        sessionResult.error?.message || "Failed to get session",
        sessionResult.error?.userMessage || "An unexpected error occurred"
      );
    }

    if (sessionResult.data.branch_id !== profileResult.data.branch_id) {
      const error = new AuthorizationError(
        "Attempted to modify session from different branch",
        "Cannot modify sessions for another branch."
      )
      captureError(error, {
        action: "forceCloseDrawerSession",
        userBranchId: profileResult.data.branch_id,
        sessionBranchId: sessionResult.data.branch_id
      })
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage
      );
    }

    const { error } = await supabase
      .from('drawer_sessions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closing_verified_by: user.id,
        closing_notes: `Force closed: ${parsed.data.reason}`,
      })
      .eq('id', parsed.data.session_id)
      .eq('status', 'open');

    if (error) {
      const appError = formatSupabaseError(error);
      const dbError = new DatabaseError(
        appError.message,
        "Failed to force close drawer session.",
        { ...appError.details, sessionId: parsed.data.session_id }
      );
      captureError(dbError, {
        action: "forceCloseDrawerSession",
        sessionId: parsed.data.session_id
      });
      return createErrorResult(
        dbError.code,
        dbError.message,
        dbError.userMessage,
        dbError.details
      );
    }

    const { error: notificationError } = await supabase
      .from('operator_notifications')
      .insert({
        operator_id: sessionResult.data.operator_id,
        session_id: parsed.data.session_id,
        type: 'till_force_closed',
        message: `Your till was force closed by a supervisor. Reason: ${parsed.data.reason}`,
      });

    if (notificationError) {
      // Non-critical error - log but don't fail
      captureError(new DatabaseError(
        notificationError.message,
        "Failed to create operator notification."
      ), { action: "forceCloseDrawerSession", sessionId: parsed.data.session_id });
    }

    revalidatePath('/supervisor');
    return createSuccessResult();
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error));
    captureError(appError, { action: "forceCloseDrawerSession" });
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred while force closing drawer. Please try again.",
      { originalError: appError.message }
    );
  }
}
