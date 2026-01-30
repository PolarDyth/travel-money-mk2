'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  AuthError,
  BusinessLogicError,
  DatabaseError,
  ErrorCode,
  formatSupabaseError,
  captureError
} from "@/lib/errors";
import { createErrorResult, createSuccessResult, ActionResult } from "@/lib/types/response";
import { withTransaction } from "@/lib/supabase/transaction";

export async function openDrawerSession(input: {
  counts: Array<{ denomination_id: string; count: number }>;
  total_gbp: number;
  branch_id: string;
  notes?: string;
}): Promise<ActionResult<{ sessionId: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const error = new AuthError(authError?.message || "User not authenticated");
      captureError(error, { action: "openDrawerSession" });
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage
      );
    }

    // Check for existing open session
    const { data: existingSession } = await supabase
      .from('drawer_sessions')
      .select('id')
      .eq('operator_id', user.id)
      .eq('status', 'open')
      .maybeSingle();

    if (existingSession) {
      const error = new BusinessLogicError(
        ErrorCode.DRAWER_ALREADY_OPEN,
        "User already has an open drawer session",
        "You already have an open drawer session. Please close it before opening a new one.",
        { operatorId: user.id, existingSessionId: existingSession.id }
      );
      captureError(error, { operatorId: user.id, action: "openDrawerSession" });
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage,
        error.details
      );
    }

    // Execute atomically: create session and denomination counts
    const result = await withTransaction(supabase, async (supabase) => {
      // 1. Create Session
      const { data: session, error: sessionError } = await supabase
        .from('drawer_sessions')
        .insert({
          branch_id: input.branch_id,
          operator_id: user.id,
          opening_verified_by: user.id,
          opened_at: new Date().toISOString(),
          opening_float_gbp: input.total_gbp,
          status: 'open',
          till_number: 1
        })
        .select()
        .single();

      if (sessionError) {
        const appError = formatSupabaseError(sessionError);
        throw new DatabaseError(
          appError.message,
          appError.userMessage,
          { ...appError.details, branchId: input.branch_id, operatorId: user.id }
        );
      }

      // 2. Insert Denomination Counts
      if (input.counts.length > 0) {
        const { error: countsError } = await supabase
          .from('drawer_denomination_counts')
          .insert(
            input.counts.map((c) => ({
              session_id: session.id,
              denomination_id: c.denomination_id,
              quantity: c.count,
              count_type: 'opening',
            }))
          );

        if (countsError) {
          const appError = formatSupabaseError(countsError);
          throw new DatabaseError(
            appError.message,
            appError.userMessage,
            { ...appError.details, sessionId: session.id }
          );
        }
      }

      return session.id;
    });

    if (!result.success) {
      return result;
    }

    revalidatePath('/operator');
    revalidatePath('/operator/drawer');
    return createSuccessResult({ sessionId: result.data || '' });
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error));
    captureError(appError, { action: "openDrawerSession" });
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred while opening drawer. Please try again.",
      { originalError: appError.message }
    );
  }
}

export async function closeDrawerSession(input: {
  counts: Array<{ denomination_id: string; count: number }>;
  total_gbp: number;
  expected_gbp?: number;
  session_id: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const error = new AuthError(authError?.message || "User not authenticated");
      captureError(error, { action: "closeDrawerSession" });
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage
      );
    }

    // 1. Update Session
    const { error: sessionError } = await supabase
      .from('drawer_sessions')
      .update({
        closing_verified_by: user.id,
        closed_at: new Date().toISOString(),
        closing_float_gbp: input.total_gbp,
        expected_float_gbp: input.expected_gbp,
        status: 'closed',
        closing_notes: input.notes,
      })
      .eq('id', input.session_id)
      .eq('operator_id', user.id);

    if (sessionError) {
      const appError = formatSupabaseError(sessionError);
      const error = new DatabaseError(
        appError.message,
        appError.userMessage,
        { ...appError.details, sessionId: input.session_id, operatorId: user.id }
      );
      captureError(error, { action: "closeDrawerSession", sessionId: input.session_id });
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage,
        error.details
      );
    }

    // 2. Insert Denomination Counts
    if (input.counts.length > 0) {
      const { error: countsError } = await supabase
        .from('drawer_denomination_counts')
        .insert(
          input.counts.map((c) => ({
            session_id: input.session_id,
            denomination_id: c.denomination_id,
            quantity: c.count,
            count_type: 'closing',
          }))
        );

      if (countsError) {
        const appError = formatSupabaseError(countsError);
        const error = new DatabaseError(
          appError.message,
          "Session closed, but failed to record individual counts.",
          { ...appError.details, sessionId: input.session_id }
        );
        captureError(error, { action: "closeDrawerSession", sessionId: input.session_id });
        // This is bad state - session closed but counts missing.
        // We'll return error but, session is closed.
        return createErrorResult(
          error.code,
          error.message,
          error.userMessage,
          error.details
        );
      }
    }

    revalidatePath('/operator');
    revalidatePath('/operator/drawer');
    return createSuccessResult();
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error));
    captureError(appError, { action: "closeDrawerSession" });
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred while closing drawer. Please try again.",
      { originalError: appError.message }
    );
  }
}
