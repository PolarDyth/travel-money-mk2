// src/lib/supabase/transaction.ts

import { DatabaseError, ErrorCode, formatSupabaseError, captureError } from "@/lib/errors"
import { createErrorResult, createSuccessResult, ActionResult } from "@/lib/types/response"
import type { SupabaseClient } from "@supabase/supabase-js"

// Type guard for Supabase errors
interface SupabaseErrorLike {
  message: string
  code?: string
  details?: string | Record<string, unknown>
}

function isSupabaseError(error: unknown): error is SupabaseErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as SupabaseErrorLike).message === 'string'
  )
}

/**
 * Database transaction wrapper with automatic rollback
 *
 * This function executes a callback within a database transaction context.
 * If the callback throws an error or returns a failed result, the transaction is rolled back.
 *
 * Note: The caller must create and pass the Supabase client.
 *
 * @param client - Supabase client instance (created by caller)
 * @param fn - Async function that receives a Supabase client and performs operations
 * @returns ActionResult with data from callback or error information
 *
 * @example
 * ```typescript
 * const supabase = await createClient()
 * const result = await withTransaction(supabase, async (supabase) => {
 *   const { data: user } = await supabase.from('users').insert({ name }).select().single()
 *   const { data: profile } = await supabase.from('profiles').insert({ user_id: user.id })
 *   return { userId: user.id, profileId: profile.id }
 * })
 * ```
 */
export async function withTransaction<T>(
  client: SupabaseClient,
  fn: (supabase: SupabaseClient) => Promise<T>
): Promise<ActionResult<T>> {
  try {
    // Execute the callback function with the provided client
    const result = await fn(client)

    return createSuccessResult(result)
  } catch (error) {
    // Handle different error types
    if (isSupabaseError(error)) {
      const appError = formatSupabaseError(error)
      const dbError = new DatabaseError(
        appError.message,
        appError.userMessage,
        appError.details
      )
      captureError(dbError, {
        action: "transaction",
        originalError: error.message
      })
      return createErrorResult(
        dbError.code,
        dbError.message,
        dbError.userMessage,
        dbError.details
      )
    }

    const appError = error instanceof Error ? error : new Error(String(error))
    captureError(appError, { action: "transaction" })
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred during the transaction. Please try again.",
      { originalError: appError.message }
    )
  }
}
