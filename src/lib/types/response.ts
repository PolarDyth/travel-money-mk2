// src/lib/types/response.ts

/**
 * Standardized error response structure
 */
export interface AppError {
  code: string
  message: string
  userMessage: string
  details?: Record<string, unknown>
}

/**
 * Helper to get a string representation of AppError
 */
export function getErrorMessage(error: AppError | string | undefined | null): string {
  if (!error) return ''
  if (typeof error === 'string') return error
  return error.userMessage || error.message
}

/**
 * Standardized action result type for Server Actions
 * @template T - Type of the data returned on success
 */
export interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: AppError
}

/**
 * Standardized query result type for data fetching functions
 * @template T - Type of the data
 */
export interface QueryResult<T> {
  data: T | null
  error: Error | null
}

/**
 * Helper to create a successful action result
 */
export function createSuccessResult<T = void>(data?: T): ActionResult<T> {
  return {
    success: true,
    data: data as T
  }
}

/**
 * Helper to create a failed action result
 */
export function createErrorResult<T = never>(
  code: string,
  message: string,
  userMessage: string,
  details?: Record<string, unknown>
): ActionResult<T> {
  return {
    success: false,
    error: {
      code,
      message,
      userMessage,
      details
    }
  }
}
