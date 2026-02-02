// src/lib/errors.ts

import * as Sentry from "@sentry/nextjs"
import type { AppError } from "./types/response"

/**
 * Error codes for consistent error categorization
 */
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  NOT_AUTHENTICATED = "NOT_AUTHENTICATED",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  SESSION_EXPIRED = "SESSION_EXPIRED",

  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT = "INVALID_FORMAT",

  // Database
  DATABASE_ERROR = "DATABASE_ERROR",
  RECORD_NOT_FOUND = "RECORD_NOT_FOUND",
  DUPLICATE_RECORD = "DUPLICATE_RECORD",
  CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",

  // Business Logic
  DRAWER_NOT_OPEN = "DRAWER_NOT_OPEN",
  DRAWER_ALREADY_OPEN = "DRAWER_ALREADY_OPEN",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  INVALID_RATE = "INVALID_RATE",
  TRANSACTION_ALREADY_VOIDED = "TRANSACTION_ALREADY_VOIDED",

  // Compliance & Audit
  CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND",
  CUSTOMER_ALREADY_EXISTS = "CUSTOMER_ALREADY_EXISTS",
  CUSTOMER_ON_WATCHLIST = "CUSTOMER_ON_WATCHLIST",
  CUSTOMER_RISK_TOO_HIGH = "CUSTOMER_RISK_TOO_HIGH",
  KYC_REQUIRED = "KYC_REQUIRED",
  KYC_INVALID = "KYC_INVALID",
  ENCRYPTION_FAILED = "ENCRYPTION_FAILED",
  DECRYPTION_FAILED = "DECRYPTION_FAILED",
  AUDIT_LOG_FAILED = "AUDIT_LOG_FAILED",
  SUSPICIOUS_PATTERN_DETECTED = "SUSPICIOUS_PATTERN_DETECTED",
  TRANSACTION_LIMIT_EXCEEDED = "TRANSACTION_LIMIT_EXCEEDED",

  // Network & External Services
  NETWORK_ERROR = "NETWORK_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // General
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NOT_IMPLEMENTED = "NOT_IMPLEMENTED"
}

/**
 * Base application error class
 */
export class AppErrorClass extends Error {
  readonly code: ErrorCode
  readonly userMessage: string
  readonly details?: Record<string, unknown>
  readonly isOperational: boolean

  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    details?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.userMessage = userMessage
    this.details = details
    this.isOperational = isOperational

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Convert to AppError interface
   */
  toAppError(): AppError {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      details: this.details
    }
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends AppErrorClass {
  constructor(
    message: string,
    userMessage: string = "Invalid input provided",
    details?: Record<string, unknown>
  ) {
    super(ErrorCode.VALIDATION_ERROR, message, userMessage, details)
  }
}

/**
 * Database error for database-related failures
 */
export class DatabaseError extends AppErrorClass {
  constructor(
    message: string,
    userMessage: string = "A database error occurred. Please try again.",
    details?: Record<string, unknown>
  ) {
    super(ErrorCode.DATABASE_ERROR, message, userMessage, details)
  }
}

/**
 * Authentication error for auth-related failures
 */
export class AuthError extends AppErrorClass {
  constructor(
    message: string,
    userMessage: string = "Authentication failed. Please log in again.",
    details?: Record<string, unknown>
  ) {
    super(ErrorCode.UNAUTHORIZED, message, userMessage, details)
  }
}

/**
 * Authorization error for permission-related failures
 */
export class AuthorizationError extends AppErrorClass {
  constructor(
    message: string,
    userMessage: string = "You don't have permission to perform this action.",
    details?: Record<string, unknown>
  ) {
    super(ErrorCode.INSUFFICIENT_PERMISSIONS, message, userMessage, details)
  }
}

/**
 * Record not found error
 */
export class NotFoundError extends AppErrorClass {
  constructor(
    resource: string,
    identifier?: string,
    details?: Record<string, unknown>
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`
    const userMessage = `The requested ${resource.toLowerCase()} could not be found.`
    super(ErrorCode.RECORD_NOT_FOUND, message, userMessage, {
      resource,
      identifier,
      ...details
    })
  }
}

/**
 * Business logic error for application-specific rule violations
 */
export class BusinessLogicError extends AppErrorClass {
  constructor(
    code: ErrorCode,
    message: string,
    userMessage: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, userMessage, details)
  }
}

/**
 * Capture error in Sentry with context
 */
export function captureError(
  error: Error | AppErrorClass,
  context?: Record<string, unknown>
): void {
  Sentry.withScope((scope) => {
    // Add custom context
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value as Record<string, unknown>)
      })
    }

    // Add tags if it's an AppErrorClass
    if (error instanceof AppErrorClass) {
      scope.setTag("error_code", error.code)
      scope.setTag("error_type", error.constructor.name)
      scope.setExtra("user_message", error.userMessage)
      if (error.details) {
        scope.setExtra("error_details", error.details)
      }
    }

    // Set level based on whether it's operational
    if (error instanceof AppErrorClass) {
      scope.setLevel(error.isOperational ? "warning" : "error")
    } else {
      scope.setLevel("error")
    }

    Sentry.captureException(error)
  })
}

/**
 * Format Zod validation errors into user-friendly messages
 */
export function formatZodError(error: { issues: unknown[] }): string {
  return error.issues
    .map((issue: unknown) => {
      if (issue && typeof issue === 'object' && 'path' in issue && 'message' in issue) {
        const path = Array.isArray(issue.path) ? issue.path.map(String).join(".") : ""
        const message = typeof issue.message === 'string' ? issue.message : "Unknown error"
        return path ? `${path}: ${message}` : message
      }
      return "Unknown validation error"
    })
    .join(", ")
}

/**
 * Format Supabase error into AppError
 */
export function formatSupabaseError(error: { message: string; code?: string; details?: string | Record<string, unknown> }): AppError {
  // Map common Supabase error codes to our error codes
  const errorMap: Record<string, ErrorCode> = {
    "23505": ErrorCode.DUPLICATE_RECORD, // unique_violation
    "23503": ErrorCode.CONSTRAINT_VIOLATION, // foreign_key_violation
    "23502": ErrorCode.MISSING_REQUIRED_FIELD, // not_null_violation
    "PGRST116": ErrorCode.RECORD_NOT_FOUND // not found
  }

  const code = error.code ? errorMap[error.code] || ErrorCode.DATABASE_ERROR : ErrorCode.DATABASE_ERROR

  // Convert string details to object if needed
  const details = typeof error.details === 'string'
    ? { message: error.details }
    : error.details

  return {
    code,
    message: error.message,
    userMessage: getSupabaseUserMessage(error),
    details
  }
}

/**
 * Get user-friendly message from Supabase error
 */
function getSupabaseUserMessage(error: { message: string; code?: string }): string {
  if (error.code === "23505") {
    return "A record with this information already exists."
  }
  if (error.code === "23503") {
    return "This action references data that doesn't exist."
  }
  if (error.code === "23502") {
    return "A required field is missing."
  }
  if (error.code === "PGRST116") {
    return "The requested record could not be found."
  }
  return "A database error occurred. Please try again."
}

/**
 * Check if an error is operational (expected) vs. unexpected
 */
export function isOperationalError(error: Error): boolean {
  return error instanceof AppErrorClass && error.isOperational
}

// ============================================
// Compliance & Audit Error Classes
// ============================================

/**
 * Customer not found error
 */
export class CustomerNotFoundError extends AppErrorClass {
  constructor(identifier?: string, details?: Record<string, unknown>) {
    const message = identifier
      ? `Customer '${identifier}' not found`
      : "Customer not found"
    super(
      ErrorCode.CUSTOMER_NOT_FOUND,
      message,
      "The requested customer could not be found.",
      { identifier, ...details }
    )
  }
}

/**
 * Customer already exists error
 */
export class CustomerAlreadyExistsError extends AppErrorClass {
  constructor(identifier: string, details?: Record<string, unknown>) {
    super(
      ErrorCode.CUSTOMER_ALREADY_EXISTS,
      `Customer '${identifier}' already exists`,
      "A customer with this information already exists.",
      { identifier, ...details }
    )
  }
}

/**
 * Customer on watchlist error
 */
export class CustomerOnWatchlistError extends AppErrorClass {
  constructor(customerId: string, reason?: string, details?: Record<string, unknown>) {
    super(
      ErrorCode.CUSTOMER_ON_WATCHLIST,
      `Customer ${customerId} is on watchlist${reason ? `: ${reason}` : ""}`,
      "This customer is flagged for additional verification.",
      { customerId, reason, ...details }
    )
  }
}

/**
 * Customer risk too high error
 */
export class CustomerRiskTooHighError extends AppErrorClass {
  constructor(
    customerId: string,
    riskScore: number,
    riskLevel: string,
    details?: Record<string, unknown>
  ) {
    super(
      ErrorCode.CUSTOMER_RISK_TOO_HIGH,
      `Customer ${customerId} has risk score ${riskScore} (${riskLevel})`,
      "This customer's risk level requires additional approval.",
      { customerId, riskScore, riskLevel, ...details }
    )
  }
}

/**
 * KYC required error
 */
export class KYCRequiredError extends AppErrorClass {
  constructor(details?: Record<string, unknown>) {
    super(
      ErrorCode.KYC_REQUIRED,
      "KYC information required",
      "Customer identity verification is required before proceeding.",
      details
    )
  }
}

/**
 * KYC invalid error
 */
export class KYCInvalidError extends AppErrorClass {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(
      ErrorCode.KYC_INVALID,
      `KYC validation failed: ${reason}`,
      "The provided customer information could not be verified.",
      { reason, ...details }
    )
  }
}

/**
 * Encryption failed error
 */
export class EncryptionFailedError extends AppErrorClass {
  constructor(message: string = "Failed to encrypt data", details?: Record<string, unknown>) {
    super(
      ErrorCode.ENCRYPTION_FAILED,
      message,
      "Failed to securely store customer information.",
      details
    )
  }
}

/**
 * Decryption failed error
 */
export class DecryptionFailedError extends AppErrorClass {
  constructor(message: string = "Failed to decrypt data", details?: Record<string, unknown>) {
    super(
      ErrorCode.DECRYPTION_FAILED,
      message,
      "Failed to read customer information.",
      details
    )
  }
}

/**
 * Audit log failed error
 */
export class AuditLogFailedError extends AppErrorClass {
  constructor(action: string, reason: string, details?: Record<string, unknown>) {
    super(
      ErrorCode.AUDIT_LOG_FAILED,
      `Failed to log audit event '${action}': ${reason}`,
      "An internal error occurred while recording this action.",
      { action, reason, ...details }
    )
  }
}

/**
 * Suspicious pattern detected error
 */
export class SuspiciousPatternDetectedError extends AppErrorClass {
  constructor(
    patternType: string,
    severity: string,
    description: string,
    details?: Record<string, unknown>
  ) {
    super(
      ErrorCode.SUSPICIOUS_PATTERN_DETECTED,
      `Suspicious pattern detected: ${patternType} (${severity})`,
      `Suspicious activity detected: ${description}`,
      { patternType, severity, description, ...details }
    )
  }
}

/**
 * Transaction limit exceeded error
 */
export class TransactionLimitExceededError extends AppErrorClass {
  constructor(
    limitType: string,
    currentAmount: number,
    limit: number,
    details?: Record<string, unknown>
  ) {
    super(
      ErrorCode.TRANSACTION_LIMIT_EXCEEDED,
      `${limitType} limit exceeded: ${currentAmount} > ${limit}`,
      `Transaction limit exceeded. Maximum: ${limit}, Current: ${currentAmount}`,
      { limitType, currentAmount, limit, ...details }
    )
  }
}
