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
import type { Json } from '@/types';

const UpdateAlertSchema = z.object({
  alertId: z.string().uuid(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  description: z.string().min(5).max(2000).optional(),
});

const UpdateCustomerRiskSchema = z.object({
  customerId: z.string().uuid(),
  riskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  watchlist: z.boolean().optional(),
  watchlistReason: z.string().max(500).optional(),
});

const UpdatePatternSchema = z.object({
  patternId: z.string().uuid(),
  isActive: z.boolean().optional(),
  thresholds: z.record(z.string(), z.any()).optional(),
});

async function getAdminProfile(userId: string): Promise<ActionResult<{ id: string; role: UserRole }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('id, role, is_active')
    .eq('id', userId)
    .single();

  if (error || !data) {
    const appError = new DatabaseError(
      error?.message || "Profile not found",
      "Admin profile not found or inactive."
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

  if (!hasRoleOrHigher(data.role as UserRole, 'admin')) {
    const error = new AuthorizationError(
      "User does not have admin role",
      "You need admin permissions to perform this action."
    )
    return createErrorResult(
      error.code,
      error.message,
      error.userMessage
    );
  }

  return createSuccessResult(data);
}

export async function updateComplianceAlert(input: z.infer<typeof UpdateAlertSchema>): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const error = new AuthError(authError?.message || "Not authenticated");
      captureError(error, { action: "updateComplianceAlert" });
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage
      );
    }

    const parsed = UpdateAlertSchema.safeParse(input);
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

    const profileResult = await getAdminProfile(user.id);
    if (!profileResult.success || !profileResult.data) {
      return createErrorResult(
        profileResult.error?.code || ErrorCode.INTERNAL_ERROR,
        profileResult.error?.message || "Failed to get admin profile",
        profileResult.error?.userMessage || "An unexpected error occurred"
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.severity) updateData.severity = parsed.data.severity;
    if (parsed.data.description) updateData.description = parsed.data.description;

    const { error } = await supabase
      .from('compliance_alerts')
      .update(updateData)
      .eq('id', parsed.data.alertId);

    if (error) {
      const appError = formatSupabaseError(error);
      const dbError = new DatabaseError(
        appError.message,
        "Failed to update compliance alert.",
        { ...appError.details, alertId: parsed.data.alertId }
      );
      captureError(dbError, {
        action: "updateComplianceAlert",
        alertId: parsed.data.alertId
      });
      return createErrorResult(
        dbError.code,
        dbError.message,
        dbError.userMessage,
        dbError.details
      );
    }

    // Log audit event
    await supabase.from('transaction_audit_log').insert({
      action: 'compliance_alert_updated',
      action_type: 'update',
      performed_by: user.id,
      transaction_id: parsed.data.alertId, // Using alert_id as transaction_id for audit trail
      details: { alert_id: parsed.data.alertId, updates: updateData } as Json,
    } as { action: string; action_type: "update"; performed_by: string; transaction_id: string; details: Json });

    revalidatePath('/admin/compliance');
    return createSuccessResult();
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error));
    captureError(appError, { action: "updateComplianceAlert" });
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred while updating the alert. Please try again.",
      { originalError: appError.message }
    );
  }
}

export async function updateCustomerRisk(input: z.infer<typeof UpdateCustomerRiskSchema>): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const error = new AuthError(authError?.message || "Not authenticated");
      captureError(error, { action: "updateCustomerRisk" });
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage
      );
    }

    const parsed = UpdateCustomerRiskSchema.safeParse(input);
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

    const profileResult = await getAdminProfile(user.id);
    if (!profileResult.success || !profileResult.data) {
      return createErrorResult(
        profileResult.error?.code || ErrorCode.INTERNAL_ERROR,
        profileResult.error?.message || "Failed to get admin profile",
        profileResult.error?.userMessage || "An unexpected error occurred"
      );
    }

    const updateData: Record<string, unknown> = {
      risk_score: parsed.data.riskScore,
      risk_level: parsed.data.riskLevel,
    };

    if (parsed.data.watchlist !== undefined) {
      updateData.is_on_watchlist = parsed.data.watchlist;
    }
    if (parsed.data.watchlistReason !== undefined) {
      updateData.watchlist_reason = parsed.data.watchlistReason;
    }

    const { error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', parsed.data.customerId);

    if (error) {
      const appError = formatSupabaseError(error);
      const dbError = new DatabaseError(
        appError.message,
        "Failed to update customer risk.",
        { ...appError.details, customerId: parsed.data.customerId }
      );
      captureError(dbError, {
        action: "updateCustomerRisk",
        customerId: parsed.data.customerId
      });
      return createErrorResult(
        dbError.code,
        dbError.message,
        dbError.userMessage,
        dbError.details
      );
    }

    // Log audit event
    await supabase.from('transaction_audit_log').insert({
      action: 'customer_risk_updated',
      action_type: 'update',
      performed_by: user.id,
      transaction_id: parsed.data.customerId, // Using customer_id as transaction_id for audit trail
      details: { customer_id: parsed.data.customerId, updates: updateData } as Json,
    } as { action: string; action_type: "update"; performed_by: string; transaction_id: string; details: Json });

    revalidatePath('/admin/customers');
    revalidatePath('/admin/compliance');
    return createSuccessResult();
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error));
    captureError(appError, { action: "updateCustomerRisk" });
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred while updating customer risk. Please try again.",
      { originalError: appError.message }
    );
  }
}

export async function updateSuspiciousPattern(input: z.infer<typeof UpdatePatternSchema>): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const error = new AuthError(authError?.message || "Not authenticated");
      captureError(error, { action: "updateSuspiciousPattern" });
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage
      );
    }

    const parsed = UpdatePatternSchema.safeParse(input);
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

    const profileResult = await getAdminProfile(user.id);
    if (!profileResult.success || !profileResult.data) {
      return createErrorResult(
        profileResult.error?.code || ErrorCode.INTERNAL_ERROR,
        profileResult.error?.message || "Failed to get admin profile",
        profileResult.error?.userMessage || "An unexpected error occurred"
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.isActive !== undefined) {
      updateData.is_active = parsed.data.isActive;
    }
    if (parsed.data.thresholds !== undefined) {
      updateData.thresholds = parsed.data.thresholds as Json;
    }

    const { error } = await supabase
      .from('suspicious_patterns')
      .update(updateData)
      .eq('id', parsed.data.patternId);

    if (error) {
      const appError = formatSupabaseError(error);
      const dbError = new DatabaseError(
        appError.message,
        "Failed to update suspicious pattern.",
        { ...appError.details, patternId: parsed.data.patternId }
      );
      captureError(dbError, {
        action: "updateSuspiciousPattern",
        patternId: parsed.data.patternId
      });
      return createErrorResult(
        dbError.code,
        dbError.message,
        dbError.userMessage,
        dbError.details
      );
    }

    // Log audit event
    await supabase.from('transaction_audit_log').insert({
      action: 'suspicious_pattern_updated',
      action_type: 'update',
      performed_by: user.id,
      transaction_id: parsed.data.patternId, // Using pattern_id as transaction_id for audit trail
      details: { pattern_id: parsed.data.patternId, updates: updateData } as Json,
    } as { action: string; action_type: "update"; performed_by: string; transaction_id: string; details: Json });

    revalidatePath('/admin/compliance');
    return createSuccessResult();
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error));
    captureError(appError, { action: "updateSuspiciousPattern" });
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred while updating the pattern. Please try again.",
      { originalError: appError.message }
    );
  }
}

export async function deleteSuspiciousPattern(patternId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const error = new AuthError(authError?.message || "Not authenticated");
      captureError(error, { action: "deleteSuspiciousPattern" });
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage
      );
    }

    const profileResult = await getAdminProfile(user.id);
    if (!profileResult.success || !profileResult.data) {
      return createErrorResult(
        profileResult.error?.code || ErrorCode.INTERNAL_ERROR,
        profileResult.error?.message || "Failed to get admin profile",
        profileResult.error?.userMessage || "An unexpected error occurred"
      );
    }

    const { error } = await supabase
      .from('suspicious_patterns')
      .delete()
      .eq('id', patternId);

    if (error) {
      const appError = formatSupabaseError(error);
      const dbError = new DatabaseError(
        appError.message,
        "Failed to delete suspicious pattern.",
        { ...appError.details, patternId }
      );
      captureError(dbError, {
        action: "deleteSuspiciousPattern",
        patternId
      });
      return createErrorResult(
        dbError.code,
        dbError.message,
        dbError.userMessage,
        dbError.details
      );
    }

    // Log audit event
    await supabase.from('transaction_audit_log').insert({
      action: 'suspicious_pattern_deleted',
      action_type: 'delete',
      performed_by: user.id,
      transaction_id: patternId, // Using pattern_id as transaction_id for audit trail
      details: { pattern_id: patternId } as Json,
    } as { action: string; action_type: "delete"; performed_by: string; transaction_id: string; details: Json });

    revalidatePath('/admin/compliance');
    return createSuccessResult();
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error));
    captureError(appError, { action: "deleteSuspiciousPattern" });
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred while deleting the pattern. Please try again.",
      { originalError: appError.message }
    );
  }
}
