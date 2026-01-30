'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import {
  ValidationError,
  AuthError,
  AuthorizationError,
  DatabaseError,
  ErrorCode,
  formatZodError,
  formatSupabaseError,
  captureError
} from "@/lib/errors"
import { createErrorResult, createSuccessResult, ActionResult } from "@/lib/types/response"
import { hasRoleOrHigher, UserRole } from "@/types"
import type { BranchRateInput, CurrencySettingsInput } from "@/lib/types/currency-editing"
import { z } from "zod"

// Validation schemas
const setBranchRateSchema = z.object({
  currencyCode: z.string().length(3),
  branchId: z.string().uuid(),
  buyRate: z.number().positive("Buy rate must be positive"),
  sellRate: z.number().positive("Sell rate must be positive"),
  notes: z.string().max(500, "Notes must not exceed 500 characters").optional(),
})

const updateCurrencySettingsSchema = z.object({
  branchId: z.string().uuid(),
  currencyCode: z.string().length(3),
  isEnabled: z.boolean(),
  allowRateOverride: z.boolean(),
  maxOverridePercentage: z.number().min(0).max(100).optional(),
  requireSupervisorApproval: z.boolean(),
})

/**
 * Set branch-specific exchange rate
 * Managers can set rates for their own branch
 * Admins can set rates for any branch
 */
export async function setBranchRate(input: BranchRateInput): Promise<ActionResult<{ success: boolean }>> {
  try {
    const supabase = await createClient()

    // Validate input
    const validationResult = setBranchRateSchema.safeParse(input)
    if (!validationResult.success) {
      const errorMessage = formatZodError(validationResult.error)
      const error = new ValidationError(errorMessage, "Please check your input and try again.")
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    const validated = validationResult.data

    // Validate buy <= sell
    if (validated.buyRate > validated.sellRate) {
      const error = new ValidationError(
        "Buy rate must be less than or equal to sell rate",
        "Buy rate cannot exceed sell rate."
      )
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      const error = new AuthError(authError?.message || "User not authenticated")
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    // Get staff profile
    const { data: staff, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id, branch_id, role')
      .eq('id', user.id)
      .eq('is_active', true)
      .single()

    if (staffError || !staff) {
      const error = new AuthError("Staff profile not found or inactive")
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    // Check permissions
    if (staff.role !== 'admin' && staff.branch_id !== validated.branchId) {
      const error = new AuthorizationError(
        "You can only set rates for your own branch",
        "Only admins can set rates for other branches."
      )
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    if (!hasRoleOrHigher(staff.role as UserRole, 'manager')) {
      const error = new AuthorizationError(
        "Insufficient permissions to set rates",
        "Only managers and admins can set branch rates."
      )
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    // Set effective_until on existing rate for this branch/currency
    await supabase
      .from('exchange_rates')
      .update({ effective_until: new Date().toISOString() })
      .eq('branch_id', validated.branchId)
      .eq('currency_code', validated.currencyCode)
      .is('effective_until', null)

    // Insert new rate
    const { error: insertError } = await supabase
      .from('exchange_rates')
      .insert({
        currency_code: validated.currencyCode,
        branch_id: validated.branchId,
        buy_rate: validated.buyRate,
        sell_rate: validated.sellRate,
        source: 'manual',
        effective_from: new Date().toISOString(),
        set_by: staff.id,
        notes: validated.notes,
      })

    if (insertError) {
      const appError = formatSupabaseError(insertError)
      const error = new DatabaseError(appError.message, appError.userMessage)
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    revalidatePath('/manager')
    revalidatePath('/operator')
    return createSuccessResult({ success: true })
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error))
    captureError(appError, { action: 'setBranchRate' })
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred. Please try again."
    )
  }
}

/**
 * Update branch currency settings
 * Managers can update settings for their own branch
 * Admins can update settings for any branch
 */
export async function updateCurrencySettings(
  input: CurrencySettingsInput
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const supabase = await createClient()

    // Validate input
    const validationResult = updateCurrencySettingsSchema.safeParse(input)
    if (!validationResult.success) {
      const errorMessage = formatZodError(validationResult.error)
      const error = new ValidationError(errorMessage, "Please check your input and try again.")
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    const validated = validationResult.data

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      const error = new AuthError(authError?.message || "User not authenticated")
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    // Get staff profile
    const { data: staff, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id, branch_id, role')
      .eq('id', user.id)
      .eq('is_active', true)
      .single()

    if (staffError || !staff) {
      const error = new AuthError("Staff profile not found or inactive")
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    // Check permissions
    if (staff.role !== 'admin' && staff.branch_id !== validated.branchId) {
      const error = new AuthorizationError(
        "You can only update settings for your own branch",
        "Only admins can update settings for other branches."
      )
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    if (!hasRoleOrHigher(staff.role as UserRole, 'manager')) {
      const error = new AuthorizationError(
        "Insufficient permissions to update currency settings",
        "Only managers and admins can update currency settings."
      )
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    // Upsert settings
    const { error: upsertError } = await supabase
      .from('exchange_rate_settings')
      .upsert({
        branch_id: validated.branchId,
        currency_code: validated.currencyCode,
        is_enabled: validated.isEnabled,
        allow_rate_override: validated.allowRateOverride,
        max_override_percentage: validated.maxOverridePercentage,
        require_supervisor_approval: validated.requireSupervisorApproval,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'branch_id,currency_code'
      })

    if (upsertError) {
      const appError = formatSupabaseError(upsertError)
      const error = new DatabaseError(appError.message, appError.userMessage)
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    revalidatePath('/manager')
    revalidatePath('/operator')
    return createSuccessResult({ success: true })
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error))
    captureError(appError, { action: 'updateCurrencySettings' })
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred. Please try again."
    )
  }
}

/**
 * Reset branch rate to global rate
 * Managers can reset rates for their own branch
 * Admins can reset rates for any branch
 */
export async function resetBranchToGlobal(params: {
  branchId: string
  currencyCode: string
}): Promise<ActionResult<{ success: boolean }>> {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      const error = new AuthError(authError?.message || "User not authenticated")
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    // Get staff profile
    const { data: staff, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id, branch_id, role')
      .eq('id', user.id)
      .eq('is_active', true)
      .single()

    if (staffError || !staff) {
      const error = new AuthError("Staff profile not found or inactive")
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    // Check permissions
    if (staff.role !== 'admin' && staff.branch_id !== params.branchId) {
      const error = new AuthorizationError(
        "You can only reset rates for your own branch",
        "Only admins can reset rates for other branches."
      )
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    if (!hasRoleOrHigher(staff.role as UserRole, 'manager')) {
      const error = new AuthorizationError(
        "Insufficient permissions to reset rates",
        "Only managers and admins can reset branch rates."
      )
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    // Delete branch-specific rate (will fall back to global)
    const { error: deleteError } = await supabase
      .from('exchange_rates')
      .delete()
      .eq('branch_id', params.branchId)
      .eq('currency_code', params.currencyCode)
      .is('effective_until', null)

    if (deleteError) {
      const appError = formatSupabaseError(deleteError)
      const error = new DatabaseError(appError.message, appError.userMessage)
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    revalidatePath('/manager')
    revalidatePath('/operator')
    return createSuccessResult({ success: true })
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error))
    captureError(appError, { action: 'resetBranchToGlobal' })
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred. Please try again."
    )
  }
}
