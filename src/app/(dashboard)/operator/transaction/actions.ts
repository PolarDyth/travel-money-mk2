'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import {
  ValidationError,
  AuthError,
  AuthorizationError,
  DatabaseError,
  BusinessLogicError,
  ErrorCode,
  formatZodError,
  formatSupabaseError,
  captureError
} from "@/lib/errors"
import { createErrorResult, createSuccessResult, ActionResult } from "@/lib/types/response"
import { transactionDraftSchema } from "./schemas"
import type { TransactionDraft } from "./schemas"
import { hasRoleOrHigher, ExchangeRateSettings, UserRole } from "@/types"

// Helper types imported from types
import { Currency, ExchangeRate, Denomination } from "./types"

export async function submitTransaction(draft: TransactionDraft): Promise<ActionResult<{ transactionId: string }>> {
  try {
    const supabase = await createClient()

    // 0. Validate input data
    const validationResult = transactionDraftSchema.safeParse(draft)
    if (!validationResult.success) {
      const errorMessage = formatZodError(validationResult.error)
      const error = new ValidationError(errorMessage, "Please check your input and try again.", {
        validationErrors: validationResult.error.issues
      })
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage,
        error.details
      )
    }

    const validatedDraft = validationResult.data

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      const error = new AuthError(authError?.message || "User not authenticated")
      captureError(error, { action: "submitTransaction" })
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage
      )
    }

    // 2. Get active staff profile with branch details and verify role
    const { data: staff, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id, branch_id, role, branches(code)')
      .eq('id', user.id)
      .eq('is_active', true)
      .single()

    if (staffError || !staff) {
      const error = new AuthError(staffError?.message || "Staff profile not found or inactive")
      captureError(error, { userId: user.id, action: "submitTransaction" })
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage
      )
    }

    // 2.5. Verify user has operator role or higher
    const validRoles = ['operator', 'supervisor', 'manager', 'admin']
    if (!validRoles.includes(staff.role)) {
      const error = new AuthorizationError(
        `User role '${staff.role}' is not authorized to perform transactions`,
        "Only operators, supervisors, managers, and admins can perform transactions.",
        { userRole: staff.role }
      )
      captureError(error, { userId: user.id, userRole: staff.role, action: "submitTransaction" })
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage,
        error.details
      )
    }

    const branchCode = staff.branches && !Array.isArray(staff.branches) ? staff.branches.code : 'UNKNOWN'

    // 3. Handle rate override validation
    let rateOverrideData: {
      source: 'standard' | 'supervisor' | 'manager'
      reason: string | null
      approvedBy: string | null
    } = {
      source: 'standard',
      reason: null,
      approvedBy: null
    }

    if (validatedDraft.rate_override) {
      // Check if override is permitted
      const { allowed, settings, error: overrideError } = await canOverrideRate(
        validatedDraft.currency_code,
        staff.branch_id,
        staff.role
      )

      if (!allowed) {
        const error = new AuthorizationError(
          overrideError || "Rate override not permitted",
          "Rate override not permitted for this currency or requires higher authorization.",
          { currencyCode: validatedDraft.currency_code, branchId: staff.branch_id }
        )
        captureError(error, { 
          action: "submitTransaction", 
          currencyCode: validatedDraft.currency_code 
        })
        return createErrorResult(
          error.code,
          error.message,
          error.userMessage,
          error.details
        )
      }

      // Validate override percentage
      const { valid, error: varianceError } = await validateOverridePercentage(
        validatedDraft.rate_override.override_rate,
        validatedDraft.rate_override.original_rate,
        staff.branch_id,
        validatedDraft.currency_code
      )

      if (!valid) {
        const error = new ValidationError(
          varianceError || "Rate override variance exceeds limit",
          varianceError || "Rate override variance exceeds maximum allowed percentage."
        )
        captureError(error, { 
          action: "submitTransaction",
          overrideRate: validatedDraft.rate_override.override_rate,
          originalRate: validatedDraft.rate_override.original_rate
        })
        return createErrorResult(
          error.code,
          error.message,
          error.userMessage
        )
      }

      // Check if supervisor approval is required and provided
      if (settings?.require_supervisor_approval && !validatedDraft.rate_override.has_manager_approval) {
        const error = new AuthorizationError(
          "Manager approval required for this rate override",
          "This rate override requires manager approval. Please get approval before proceeding.",
          { requiresManagerApproval: true }
        )
        captureError(error, { action: "submitTransaction" })
        return createErrorResult(
          error.code,
          error.message,
          error.userMessage
        )
      }

      // Determine override source
      rateOverrideData = {
        source: staff.role === 'manager' || staff.role === 'admin' ? 'manager' : 'supervisor',
        reason: validatedDraft.rate_override.reason,
        approvedBy: user.id
      }
    }

    // 4. Get active drawer session
    const { data: session, error: sessionError } = await supabase
      .from('drawer_sessions')
      .select('id')
      .eq('operator_id', staff.id)
      .eq('status', 'open')
      .single()

    if (sessionError || !session) {
      const error = new BusinessLogicError(
        ErrorCode.DRAWER_NOT_OPEN,
        sessionError?.message || "No active drawer session found",
        "Please open a till before processing transactions.",
        { operatorId: staff.id }
      )
      captureError(error, { operatorId: staff.id, action: "submitTransaction" })
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage,
        error.details
      )
    }

    // Generate unique reference number using UUID
    const referenceUUID = crypto.randomUUID()
    const referenceDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const referenceNumber = `TXN-${branchCode}-${referenceDate}-${referenceUUID.slice(0, 8)}`

    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .insert({
        branch_id: staff.branch_id,
        operator_id: staff.id,
        drawer_session_id: session.id,
        transaction_type: validatedDraft.type,
        foreign_currency_code: validatedDraft.currency_code,
        foreign_amount: validatedDraft.foreign_amount,
        base_amount: validatedDraft.base_amount,
        base_currency_code: 'GBP',
        rate_used: validatedDraft.exchange_rate,
        rate_id: validatedDraft.rate_id || null,
        status: 'completed',
        reference_number: referenceNumber,
        customer_name: validatedDraft.customer
          ? `${validatedDraft.customer.first_name || ''} ${validatedDraft.customer.last_name || ''}`.trim()
          : null,
        customer_id_type: validatedDraft.customer?.id_type || null,
        customer_id_number: validatedDraft.customer?.id_reference || null,
        commission_amount: null, // Add commission calculation if needed
        rate_override_reason: rateOverrideData.reason,
        rate_override_approved_by: rateOverrideData.approvedBy,
        rate_override_source: rateOverrideData.source,
      })
      .select()
      .single()

    if (txnError) {
      const appError = formatSupabaseError(txnError)
      const error = new DatabaseError(
        appError.message,
        appError.userMessage,
        {
          ...appError.details,
          branchId: staff.branch_id,
          operatorId: staff.id,
          sessionId: session.id
        }
      )
      captureError(error, {
        action: "submitTransaction",
        transactionDraft: validatedDraft,
        branchId: staff.branch_id,
        operatorId: staff.id
      })
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage,
        error.details
      )
    }

    // Record override in history if applicable
    if (validatedDraft.rate_override) {
      const variance = Math.abs(
        ((validatedDraft.rate_override.override_rate - validatedDraft.rate_override.original_rate) 
          / validatedDraft.rate_override.original_rate) * 100
      )

      await supabase.from('rate_override_history').insert({
        transaction_id: transaction.id,
        original_rate: validatedDraft.rate_override.original_rate,
        override_rate: validatedDraft.rate_override.override_rate,
        override_percentage: variance,
        override_reason: validatedDraft.rate_override.reason,
        approved_by: rateOverrideData.approvedBy!,
      })
    }

    revalidatePath('/operator')
    return createSuccessResult({ transactionId: transaction.id })
  } catch (error) {
    // Catch any unexpected errors
    const appError = error instanceof Error ? error : new Error(String(error))
    captureError(appError, { action: "submitTransaction" })
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred. Please try again.",
      { originalError: appError.message }
    )
  }
}

export async function getCurrencies(): Promise<Currency[]> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('currencies')
        .select('*')
        .eq('is_active', true)
        .order('code')
    
    return data || []
}

export async function getDailyRates(): Promise<ExchangeRate[]> {
    const supabase = await createClient()
    // In a real app we'd fetch the latest rate for today.
    // For now fetching the latest configured rates.
    const { data } = await supabase
        .from('exchange_rates')
        .select('*')
    // We would refine this query to match the business logic (latest per currency)
    return data || []
}

export async function getDenominations(currencyCode: string): Promise<Denomination[]> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('currency_denominations')
        .select('*')
        .eq('currency_code', currencyCode)
        .eq('is_active', true)
        .order('value', { ascending: false })
    
    return data || []
}

// Check if rate override is allowed for this transaction
async function canOverrideRate(
  currencyCode: string,
  branchId: string,
  staffRole: UserRole
): Promise<{ allowed: boolean; settings: ExchangeRateSettings | null; error?: string }> {
  const supabase = await createClient()

  const { data: settings, error: settingsError } = await supabase
    .from('exchange_rate_settings')
    .select('*')
    .eq('branch_id', branchId)
    .eq('currency_code', currencyCode)
    .single()

  if (settingsError || !settings) {
    // No specific settings means override not allowed
    return { allowed: false, settings: null, error: 'Currency settings not found' }
  }

  if (!settings.is_enabled) {
    return { allowed: false, settings, error: 'Currency is not enabled at this branch' }
  }

  if (!settings.allow_rate_override) {
    return { allowed: false, settings, error: 'Rate override is not permitted for this currency' }
  }

  if (settings.require_supervisor_approval && !hasRoleOrHigher(staffRole, 'supervisor')) {
    return { allowed: false, settings, error: 'Rate override requires supervisor approval' }
  }
  
  return { allowed: true, settings }
}

// Validate rate override percentage against limits
async function validateOverridePercentage(
  overrideRate: number,
  originalRate: number,
  branchId: string,
  currencyCode: string
): Promise<{ valid: boolean; error?: string }> {
  const supabase = await createClient()
  
  const variance = Math.abs(((overrideRate - originalRate) / originalRate) * 100)
  
  const { data: settings } = await supabase
    .from('exchange_rate_settings')
    .select('max_override_percentage')
    .eq('branch_id', branchId)
    .eq('currency_code', currencyCode)
    .single()
  
  if (settings?.max_override_percentage && variance > settings.max_override_percentage) {
    return {
      valid: false,
      error: `Rate override variance of ${variance.toFixed(2)}% exceeds maximum allowed of ${settings.max_override_percentage}%`
    }
  }
  
  return { valid: true }
}

export async function canStaffOverrideRate(params: {
  currencyCode: string
  branchId: string
  staffRole: UserRole
}): Promise<ActionResult<{ canOverride: boolean; maxOverridePercentage?: number; reason?: string }>> {
  try {
    const { allowed, settings, error } = await canOverrideRate(
      params.currencyCode,
      params.branchId,
      params.staffRole
    )
    
    if (!allowed) {
      return createSuccessResult({
        canOverride: false,
        reason: error
      })
    }
    
    return createSuccessResult({
      canOverride: true,
      maxOverridePercentage: settings?.max_override_percentage ?? undefined
    })
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error))
    captureError(appError, { action: 'canStaffOverrideRate', params })
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      'Unable to check rate override permissions'
    )
  }
}
