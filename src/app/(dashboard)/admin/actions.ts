'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  ValidationError,
  DatabaseError,
  ErrorCode,
  formatZodError,
  captureError,
  formatSupabaseError
} from "@/lib/errors"
import { createErrorResult, createSuccessResult, ActionResult } from "@/lib/types/response"
import { withTransaction } from "@/lib/supabase/transaction"
import type { CurrencyInput, DenominationInput } from "@/lib/types/currency-editing"

const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  employeeNumber: z.string().min(3, 'Employee number is required'),
  role: z.enum(['operator', 'supervisor', 'manager', 'admin']),
  branchId: z.string().uuid('Invalid branch selection'),
})

// Currency management schemas
const setCurrencyStatusSchema = z.object({
  currencyCode: z.string().length(3),
  isEnabled: z.boolean(),
})

const addCurrencySchema = z.object({
  code: z.string().length(3).regex(/^[A-Z]{3}$/, 'Must be a valid 3-letter ISO currency code'),
  name: z.string().min(3, 'Currency name is required'),
  symbol: z.string().min(1, 'Currency symbol is required').max(5),
  decimalPlaces: z.number().int().min(0).max(4),
  minTransactionAmount: z.number().positive().default(1.00),
  maxTransactionAmount: z.number().positive().default(10000.00),
  requiresIdThreshold: z.number().positive().optional(),
})

const addDenominationSchema = z.object({
  currencyCode: z.string().length(3),
  type: z.enum(['note', 'coin']),
  value: z.number().positive('Value must be positive'),
  description: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

const updateDenominationSchema = z.object({
  id: z.string().uuid(),
  value: z.number().positive().optional(),
  description: z.string().max(50).optional(),
  is_active: z.boolean().optional(),
})

export async function createStaffMember(_prevState: ActionResult<void>, formData: FormData): Promise<ActionResult<void>> {
  try {
    const supabase = createAdminClient()

    const rawData = {
      email: formData.get('email'),
      password: formData.get('password'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      employeeNumber: formData.get('employeeNumber'),
      role: formData.get('role'),
      branchId: formData.get('branchId'),
    }

    const validatedFields = createStaffSchema.safeParse(rawData)

    if (!validatedFields.success) {
      const errorMessage = formatZodError(validatedFields.error)
      const error = new ValidationError(errorMessage, "Please check your input and try again.", {
        validationErrors: validatedFields.error.issues
      })
      return createErrorResult(
        error.code,
        error.message,
        error.userMessage,
        error.details
      )
    }

    const { email, password, firstName, lastName, employeeNumber, role, branchId } = validatedFields.data

    // Execute atomically: create auth user and staff profile
    const result = await withTransaction(supabase, async (supabase) => {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm for admin-created users
        user_metadata: {
          first_name: firstName,
          last_name: lastName
        }
      })

      if (authError || !authData.user) {
        const appError = new DatabaseError(
          authError?.message || "User creation failed",
          "Failed to create user account. The email may already be in use.",
          { email, authError: authError?.message }
        )
        throw appError
      }

      // 2. Create Staff Profile
      const { error: profileError } = await supabase
        .from('staff_profiles')
        .insert({
          id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          employee_number: employeeNumber,
          role: role,
          branch_id: branchId,
          is_active: true,
          requires_new_password: true // Force them to change it
        })

      if (profileError) {
        const appError = formatSupabaseError(profileError)
        const dbError = new DatabaseError(
          appError.message,
          "Failed to create staff profile.",
          { ...appError.details, userId: authData.user.id }
        )
        throw dbError
      }

      return authData.user.id
    })

    if (!result.success) {
      return createErrorResult(
        result.error?.code || ErrorCode.INTERNAL_ERROR,
        result.error?.message || "Transaction failed",
        result.error?.userMessage || "An unexpected error occurred",
        result.error?.details
      )
    }

    revalidatePath('/admin')
    return createSuccessResult()
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error))
    captureError(appError, { action: "createStaffMember" })
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred while creating staff member. Please try again.",
      { originalError: appError.message }
    )
  }
}

/**
 * Enable/disable currency system-wide
 */
export async function setCurrencyStatus(
  input: { currencyCode: string; isEnabled: boolean }
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const supabase = createAdminClient()

    const validationResult = setCurrencyStatusSchema.safeParse(input)
    if (!validationResult.success) {
      const errorMessage = formatZodError(validationResult.error)
      const error = new ValidationError(errorMessage, "Please check your input and try again.")
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    const { error } = await supabase
      .from('currencies')
      .update({ is_active: input.isEnabled })
      .eq('code', input.currencyCode)

    if (error) {
      const appError = formatSupabaseError(error)
      const dbError = new DatabaseError(appError.message, appError.userMessage)
      return createErrorResult(dbError.code, dbError.message, dbError.userMessage)
    }

    revalidatePath('/admin')
    revalidatePath('/manager')
    revalidatePath('/operator')
    return createSuccessResult({ success: true })
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error))
    captureError(appError, { action: 'setCurrencyStatus' })
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred. Please try again."
    )
  }
}

/**
 * Add new currency to system
 */
export async function addCurrency(input: CurrencyInput): Promise<ActionResult<{ success: boolean }>> {
  try {
    const supabase = createAdminClient()

    const validationResult = addCurrencySchema.safeParse(input)
    if (!validationResult.success) {
      const errorMessage = formatZodError(validationResult.error)
      const error = new ValidationError(errorMessage, "Please check your input and try again.")
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    const { error } = await supabase
      .from('currencies')
      .insert({
        code: input.code.toUpperCase(),
        name: input.name,
        symbol: input.symbol,
        decimal_places: input.decimalPlaces,
        min_transaction_amount: input.minTransactionAmount,
        max_transaction_amount: input.maxTransactionAmount,
        requires_id_threshold: input.requiresIdThreshold,
        is_active: true,
        is_base_currency: false, // Only one base currency (GBP) should exist
      })

    if (error) {
      const appError = formatSupabaseError(error)
      const dbError = new DatabaseError(appError.message, "Failed to add currency. The currency code may already exist.")
      return createErrorResult(dbError.code, dbError.message, dbError.userMessage)
    }

    revalidatePath('/admin')
    revalidatePath('/manager')
    revalidatePath('/operator')
    return createSuccessResult({ success: true })
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error))
    captureError(appError, { action: 'addCurrency' })
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred. Please try again."
    )
  }
}

/**
 * Add denomination for a currency
 */
export async function addDenomination(input: DenominationInput): Promise<ActionResult<{ success: boolean }>> {
  try {
    const supabase = createAdminClient()

    const validationResult = addDenominationSchema.safeParse(input)
    if (!validationResult.success) {
      const errorMessage = formatZodError(validationResult.error)
      const error = new ValidationError(errorMessage, "Please check your input and try again.")
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    const { error } = await supabase
      .from('currency_denominations')
      .insert({
        currency_code: input.currencyCode.toUpperCase(),
        denomination_type: input.type,
        value: input.value,
        description: input.description,
        sort_order: input.sortOrder ?? 0,
        is_active: true,
      })

    if (error) {
      const appError = formatSupabaseError(error)
      const dbError = new DatabaseError(
        appError.message,
        "Failed to add denomination. A denomination with this value may already exist for this currency."
      )
      return createErrorResult(dbError.code, dbError.message, dbError.userMessage)
    }

    revalidatePath('/admin')
    return createSuccessResult({ success: true })
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error))
    captureError(appError, { action: 'addDenomination' })
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred. Please try again."
    )
  }
}

/**
 * Update denomination
 */
export async function updateDenomination(
  input: { id: string; value?: number; description?: string; is_active?: boolean }
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const supabase = createAdminClient()

    const validationResult = updateDenominationSchema.safeParse(input)
    if (!validationResult.success) {
      const errorMessage = formatZodError(validationResult.error)
      const error = new ValidationError(errorMessage, "Please check your input and try again.")
      return createErrorResult(error.code, error.message, error.userMessage)
    }

    const { error } = await supabase
      .from('currency_denominations')
      .update({
        value: input.value,
        description: input.description,
        is_active: input.is_active,
      })
      .eq('id', input.id)

    if (error) {
      const appError = formatSupabaseError(error)
      const dbError = new DatabaseError(appError.message, appError.userMessage)
      return createErrorResult(dbError.code, dbError.message, dbError.userMessage)
    }

    revalidatePath('/admin')
    return createSuccessResult({ success: true })
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error))
    captureError(appError, { action: 'updateDenomination' })
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred. Please try again."
    )
  }
}

/**
 * Delete denomination
 * If used in drawer_denomination_counts, soft delete (set is_active = false)
 * Otherwise, hard delete
 */
export async function deleteDenomination(id: string): Promise<ActionResult<{ success: boolean }>> {
  try {
    const supabase = createAdminClient()

    // Check if denomination is used
    const { data: usage, error: checkError } = await supabase
      .from('drawer_denomination_counts')
      .select('count')
      .eq('denomination_id', id)
      .limit(1)

    if (checkError) {
      const appError = formatSupabaseError(checkError)
      const dbError = new DatabaseError(appError.message, appError.userMessage)
      return createErrorResult(dbError.code, dbError.message, dbError.userMessage)
    }

    if (usage && usage.length > 0) {
      // Soft delete if used
      const { error: softDeleteError } = await supabase
        .from('currency_denominations')
        .update({ is_active: false })
        .eq('id', id)

      if (softDeleteError) {
        const appError = formatSupabaseError(softDeleteError)
        const dbError = new DatabaseError(appError.message, appError.userMessage)
        return createErrorResult(dbError.code, dbError.message, dbError.userMessage)
      }
    } else {
      // Hard delete if not used
      const { error: deleteError } = await supabase
        .from('currency_denominations')
        .delete()
        .eq('id', id)

      if (deleteError) {
        const appError = formatSupabaseError(deleteError)
        const dbError = new DatabaseError(appError.message, appError.userMessage)
        return createErrorResult(dbError.code, dbError.message, dbError.userMessage)
      }
    }

    revalidatePath('/admin')
    return createSuccessResult({ success: true })
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error))
    captureError(appError, { action: 'deleteDenomination' })
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred. Please try again."
    )
  }
}

export async function getAllCurrencies(): Promise<Array<{
  code: string
  name: string
  symbol: string
  is_active: boolean
  decimal_places: number
  min_transaction_amount: number
  max_transaction_amount: number
  requires_id_threshold: number | null
}>> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('currencies')
    .select('*')
    .order('code')

  if (error) {
    console.error('Error fetching currencies:', error)
    return []
  }

  return data ?? []
}

export async function getCurrencyDenominations(currencyCode: string): Promise<Array<{
  id: string
  type: 'note' | 'coin'
  value: number
  description: string | null
  sort_order: number
  is_active: boolean
}>> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('currency_denominations')
    .select('*')
    .eq('currency_code', currencyCode)
    .order('value', { ascending: false })

  if (error) {
    console.error('Error fetching denominations:', error)
    return []
  }

  return (data ?? []).map((denomination) => ({
    id: denomination.id,
    type: denomination.denomination_type as 'note' | 'coin',
    value: denomination.value,
    description: denomination.description,
    sort_order: denomination.sort_order,
    is_active: denomination.is_active,
  }))
}

