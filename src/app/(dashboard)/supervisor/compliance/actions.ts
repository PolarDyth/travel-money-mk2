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
import type { Json } from "@/types";

const AcknowledgeAlertSchema = z.object({
  alertId: z.string().uuid(),
});

const ResolveAlertSchema = z.object({
  alertId: z.string().uuid(),
  resolutionNotes: z.string().min(5).max(1000),
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

async function getAlertForAction(alertId: string, branchId: string): Promise<ActionResult<{ id: string; branch_id: string; resolved_at: string | null }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('compliance_alerts')
    .select('id, branch_id, resolved_at')
    .eq('id', alertId)
    .single();

  if (error || !data) {
    const appError = new DatabaseError(
      error?.message || "Alert not found",
      "Compliance alert not found."
    )
    return createErrorResult(
      appError.code,
      appError.message,
      appError.userMessage
    );
  }

  if (data.branch_id !== branchId) {
    const error = new AuthorizationError(
      "Alert belongs to different branch",
      "You cannot modify alerts from other branches."
    )
    return createErrorResult(
      error.code,
      error.message,
      error.userMessage
    );
  }

  if (data.resolved_at) {
    const error = new ValidationError(
      "Alert already resolved",
      "This alert has already been resolved and cannot be modified."
    )
    return createErrorResult(
      error.code,
      error.message,
      error.userMessage
    );
  }

  return createSuccessResult(data);
}

export async function acknowledgeComplianceAlert(input: z.infer<typeof AcknowledgeAlertSchema>): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const error = new AuthError(authError?.message || "Not authenticated");
      captureError(error, { action: "acknowledgeComplianceAlert" });
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage
      );
    }

    const parsed = AcknowledgeAlertSchema.safeParse(input);
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

    const alertResult = await getAlertForAction(parsed.data.alertId, profileResult.data.branch_id);
    if (!alertResult.success || !alertResult.data) {
      return createErrorResult(
        alertResult.error?.code || ErrorCode.INTERNAL_ERROR,
        alertResult.error?.message || "Failed to get alert",
        alertResult.error?.userMessage || "An unexpected error occurred"
      );
    }

    const { error } = await supabase
      .from('compliance_alerts')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user.id,
      })
      .eq('id', parsed.data.alertId)
      .is('acknowledged_at', null);

    if (error) {
      const appError = formatSupabaseError(error);
      const dbError = new DatabaseError(
        appError.message,
        "Failed to acknowledge compliance alert.",
        { ...appError.details, alertId: parsed.data.alertId }
      );
      captureError(dbError, {
        action: "acknowledgeComplianceAlert",
        alertId: parsed.data.alertId
      });
      return createErrorResult(
        dbError.code,
        dbError.message,
        dbError.userMessage,
        dbError.details
      );
    }

    // Log compliance event
    const { error: logError } = await supabase
      .from('transaction_audit_log')
      .insert({
        action: 'compliance_alert_acknowledged',
        action_type: 'update',
        performed_by: user.id,
        transaction_id: parsed.data.alertId, // Using alert_id as transaction_id for audit trail
        details: { alert_id: parsed.data.alertId } as Json,
      } as { action: string; action_type: "update"; performed_by: string; transaction_id: string; details: Json });

    if (logError) {
      captureError(new DatabaseError(
        logError.message,
        "Failed to log compliance event."
      ), { action: "acknowledgeComplianceAlert", alertId: parsed.data.alertId });
    }

    revalidatePath('/supervisor/compliance');
    revalidatePath('/supervisor');
    return createSuccessResult();
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error));
    captureError(appError, { action: "acknowledgeComplianceAlert" });
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred while acknowledging the alert. Please try again.",
      { originalError: appError.message }
    );
  }
}

export async function resolveComplianceAlert(input: z.infer<typeof ResolveAlertSchema>): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const error = new AuthError(authError?.message || "Not authenticated");
      captureError(error, { action: "resolveComplianceAlert" });
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage
      );
    }

    const parsed = ResolveAlertSchema.safeParse(input);
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

    const alertResult = await getAlertForAction(parsed.data.alertId, profileResult.data.branch_id);
    if (!alertResult.success || !alertResult.data) {
      return createErrorResult(
        alertResult.error?.code || ErrorCode.INTERNAL_ERROR,
        alertResult.error?.message || "Failed to get alert",
        alertResult.error?.userMessage || "An unexpected error occurred"
      );
    }

    const { error } = await supabase
      .from('compliance_alerts')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_notes: parsed.data.resolutionNotes,
      })
      .eq('id', parsed.data.alertId)
      .is('resolved_at', null);

    if (error) {
      const appError = formatSupabaseError(error);
      const dbError = new DatabaseError(
        appError.message,
        "Failed to resolve compliance alert.",
        { ...appError.details, alertId: parsed.data.alertId }
      );
      captureError(dbError, {
        action: "resolveComplianceAlert",
        alertId: parsed.data.alertId
      });
      return createErrorResult(
        dbError.code,
        dbError.message,
        dbError.userMessage,
        dbError.details
      );
    }

    // Log compliance event
    const { error: logError } = await supabase
      .from('transaction_audit_log')
      .insert({
        action: 'compliance_alert_resolved',
        action_type: 'update',
        performed_by: user.id,
        transaction_id: parsed.data.alertId, // Using alert_id as transaction_id for audit trail
        details: { alert_id: parsed.data.alertId, resolution_notes: parsed.data.resolutionNotes } as Json,
      } as { action: string; action_type: "update"; performed_by: string; transaction_id: string; details: Json });

    if (logError) {
      captureError(new DatabaseError(
        logError.message,
        "Failed to log compliance event."
      ), { action: "resolveComplianceAlert", alertId: parsed.data.alertId });
    }

    revalidatePath('/supervisor/compliance');
    revalidatePath('/supervisor');
    return createSuccessResult();
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error));
    captureError(appError, { action: "resolveComplianceAlert" });
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred while resolving the alert. Please try again.",
      { originalError: appError.message }
    );
  }
}

export async function escalateComplianceAlert(input: z.infer<typeof ResolveAlertSchema>): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const error = new AuthError(authError?.message || "Not authenticated");
      captureError(error, { action: "escalateComplianceAlert" });
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage
      );
    }

    const parsed = ResolveAlertSchema.safeParse(input);
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

    const alertResult = await getAlertForAction(parsed.data.alertId, profileResult.data.branch_id);
    if (!alertResult.success || !alertResult.data) {
      return createErrorResult(
        alertResult.error?.code || ErrorCode.INTERNAL_ERROR,
        alertResult.error?.message || "Failed to get alert",
        alertResult.error?.userMessage || "An unexpected error occurred"
      );
    }

    // Get managers/admins in the same branch
    const { data: escalationTargets } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('branch_id', profileResult.data.branch_id)
      .in('role', ['manager', 'admin'])
      .eq('is_active', true);

    // Create notifications for escalation targets (using operator_notifications)
    // Note: This is not ideal for manager notifications but works for now
    // Ideally, there would be a separate manager_notifications table
    if (escalationTargets && escalationTargets.length > 0) {
      const notifications = escalationTargets.map(target => ({
        operator_id: target.id,
        type: 'compliance_escalation' as const,
        message: `Compliance alert escalated. Notes: ${parsed.data.resolutionNotes}`,
      }));

      const { error: notificationError } = await supabase
        .from('operator_notifications')
        .insert(notifications);

      if (notificationError) {
        captureError(new DatabaseError(
          notificationError.message,
          "Failed to create escalation notifications."
        ), { action: "escalateComplianceAlert", alertId: parsed.data.alertId });
      }
    }

    // Update alert to acknowledge it
    const { error } = await supabase
      .from('compliance_alerts')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user.id,
      })
      .eq('id', parsed.data.alertId)
      .is('acknowledged_at', null);

    if (error) {
      const appError = formatSupabaseError(error);
      const dbError = new DatabaseError(
        appError.message,
        "Failed to escalate compliance alert.",
        { ...appError.details, alertId: parsed.data.alertId }
      );
      captureError(dbError, {
        action: "escalateComplianceAlert",
        alertId: parsed.data.alertId
      });
      return createErrorResult(
        dbError.code,
        dbError.message,
        dbError.userMessage,
        dbError.details
      );
    }

    // Log compliance event
    const { error: logError } = await supabase
      .from('transaction_audit_log')
      .insert({
        action: 'compliance_alert_escalated',
        action_type: 'update',
        performed_by: user.id,
        transaction_id: parsed.data.alertId, // Using alert_id as transaction_id for audit trail
        details: { alert_id: parsed.data.alertId, escalation_notes: parsed.data.resolutionNotes } as Json,
      } as { action: string; action_type: "update"; performed_by: string; transaction_id: string; details: Json });

    if (logError) {
      captureError(new DatabaseError(
        logError.message,
        "Failed to log compliance event."
      ), { action: "escalateComplianceAlert", alertId: parsed.data.alertId });
    }

    revalidatePath('/supervisor/compliance');
    revalidatePath('/supervisor');
    return createSuccessResult();
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error));
    captureError(appError, { action: "escalateComplianceAlert" });
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred while escalating the alert. Please try again.",
      { originalError: appError.message }
    );
  }
}
