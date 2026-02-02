/**
 * Enhanced Audit Logging System
 *
 * Comprehensive audit logging for all compliance-relevant events.
 * Captures transaction lifecycle, authentication, compliance events, and data access.
 *
 * @module lib/compliance/audit-logger
 */

import { createClient } from "@/utils/supabase/server"
import type { AuditActionType, Json, TransactionAuditLogInsert } from "@/types"
import { captureError, AuditLogFailedError } from "@/lib/errors"
import { createHash } from "node:crypto"

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  action: string
  action_type: AuditActionType
  transaction_id?: string
  customer_id?: string
  staff_id?: string
  ip_address?: string
  user_agent?: string
  device_fingerprint?: string
  session_id?: string
  api_endpoint?: string
  details?: Json
  field_changes?: Json
}

/**
 * Request context for audit logging
 */
export interface RequestContext {
  ip?: string
  userAgent?: string
  deviceFingerprint?: string
  sessionId?: string
  apiEndpoint?: string
}

/**
 * Extract request context from headers
 *
 * @param headers - Request headers
 * @returns Request context
 */
export function extractRequestContext(headers: Headers): RequestContext {
  return {
    ip: headers.get("x-forwarded-for") ||
      headers.get("x-real-ip") ||
      headers.get("cf-connecting-ip") ||
      undefined,
    userAgent: headers.get("user-agent") || undefined,
    deviceFingerprint: headers.get("x-device-fingerprint") || undefined,
    sessionId: headers.get("x-session-id") || undefined,
    apiEndpoint: headers.get("x-api-endpoint") || undefined,
  }
}

/**
 * Generate device fingerprint from user agent and other headers
 *
 * @param headers - Request headers
 * @returns Device fingerprint hash
 */
export function generateDeviceFingerprint(headers: Headers): string {
  const fingerprintData = {
    userAgent: headers.get("user-agent") || "",
    acceptLanguage: headers.get("accept-language") || "",
    acceptEncoding: headers.get("accept-encoding") || "",
  }

  return createHash("sha256")
    .update(JSON.stringify(fingerprintData))
    .digest("hex")
    .substring(0, 16)
}

/**
 * Log an audit event
 *
 * @param entry - Audit log entry
 * @returns Whether logging succeeded
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<boolean> {
  try {
    const supabase = await createClient()

    // Build insert object, only including fields that have values
    const insertData = {
      action: entry.action,
      action_type: entry.action_type,
      transaction_id: entry.transaction_id,
      performed_by: entry.staff_id,
      ip_address: entry.ip_address ?? null,
      user_agent: entry.user_agent ?? null,
      device_fingerprint: entry.device_fingerprint ?? null,
      session_id: entry.session_id ?? null,
      api_endpoint: entry.api_endpoint ?? null,
      details: entry.details ?? null,
      field_changes: entry.field_changes ?? null,
    } as TransactionAuditLogInsert

    const { error } = await supabase.from("transaction_audit_log").insert(insertData)

    if (error) {
      throw new AuditLogFailedError(entry.action_type, error.message)
    }

    return true
  } catch (error) {
    if (error instanceof AuditLogFailedError) {
      captureError(error)
    } else {
      captureError(
        new AuditLogFailedError(
          entry.action_type,
          error instanceof Error ? error.message : "Unknown error"
        )
      )
    }
    return false
  }
}

/**
 * Log transaction event
 *
 * @param transactionId - The transaction ID
 * @param action - The action performed
 * @param staffId - The staff member ID who performed the action
 * @param context - Request context
 * @param details - Additional details
 * @returns Whether logging succeeded
 */
export async function logTransactionEvent(
  transactionId: string,
  action: "created" | "viewed" | "modified" | "voided" | "refunded" | "completed",
  staffId?: string,
  context?: RequestContext,
  details?: Json
): Promise<boolean> {
  const actionTypeMap: Record<typeof action, AuditActionType> = {
    created: "create",
    viewed: "view",
    modified: "update",
    voided: "void",
    refunded: "refund",
    completed: "create",
  }

  return logAuditEvent({
    action: `transaction_${action}`,
    action_type: actionTypeMap[action],
    transaction_id: transactionId,
    staff_id: staffId,
    ip_address: context?.ip,
    user_agent: context?.userAgent,
    device_fingerprint: context?.deviceFingerprint,
    session_id: context?.sessionId,
    api_endpoint: context?.apiEndpoint,
    details,
  })
}

/**
 * Log authentication event
 *
 * @param staffId - The staff member ID
 * @param action - The action (login_success, login_failed, logout, etc)
 * @param context - Request context
 * @param details - Additional details
 * @returns Whether logging succeeded
 */
export async function logAuthEvent(
  staffId: string,
  action: "login_success" | "login_failed" | "logout" | "session_expired" | "permission_denied",
  context?: RequestContext,
  details?: Json
): Promise<boolean> {
  return logAuditEvent({
    action: `auth_${action}`,
    action_type: "create",
    staff_id: staffId,
    ip_address: context?.ip,
    user_agent: context?.userAgent,
    device_fingerprint: context?.deviceFingerprint,
    session_id: context?.sessionId,
    api_endpoint: context?.apiEndpoint,
    details,
  })
}

/**
 * Log compliance event
 *
 * @param customerId - The customer ID (optional)
 * @param action - The action (alert_created, alert_acknowledged, etc)
 * @param staffId - The staff member ID who performed the action
 * @param context - Request context
 * @param details - Additional details
 * @returns Whether logging succeeded
 */
export async function logComplianceEvent(
  customerId: string | undefined,
  action:
    | "alert_created"
    | "alert_acknowledged"
    | "alert_resolved"
    | "customer_risk_updated"
    | "suspicious_pattern_detected",
  staffId?: string,
  context?: RequestContext,
  details?: Json
): Promise<boolean> {
  return logAuditEvent({
    action: `compliance_${action}`,
    action_type: "create",
    customer_id: customerId,
    staff_id: staffId,
    ip_address: context?.ip,
    user_agent: context?.userAgent,
    device_fingerprint: context?.deviceFingerprint,
    session_id: context?.sessionId,
    api_endpoint: context?.apiEndpoint,
    details,
  })
}

/**
 * Log customer data access
 *
 * @param customerId - The customer ID
 * @param action - The action (record_accessed, pii_decrypted, etc)
 * @param staffId - The staff member ID
 * @param context - Request context
 * @returns Whether logging succeeded
 */
export async function logCustomerDataAccess(
  customerId: string,
  action: "record_accessed" | "pii_decrypted" | "record_modified" | "watchlist_added",
  staffId: string,
  context?: RequestContext
): Promise<boolean> {
  return logAuditEvent({
    action: `customer_${action}`,
    action_type: action === "record_modified" ? "update" : "view",
    customer_id: customerId,
    staff_id: staffId,
    ip_address: context?.ip,
    user_agent: context?.userAgent,
    device_fingerprint: context?.deviceFingerprint,
    session_id: context?.sessionId,
    api_endpoint: context?.apiEndpoint,
  })
}

/**
 * Log data export
 *
 * @param exportType - Type of data exported
 * @param recordCount - Number of records exported
 * @param staffId - The staff member ID
 * @param context - Request context
 * @returns Whether logging succeeded
 */
export async function logDataExport(
  exportType: "transactions" | "customers" | "audit_log" | "compliance_report",
  recordCount: number,
  staffId: string,
  context?: RequestContext
): Promise<boolean> {
  return logAuditEvent({
    action: `export_${exportType}`,
    action_type: "export",
    staff_id: staffId,
    ip_address: context?.ip,
    user_agent: context?.userAgent,
    device_fingerprint: context?.deviceFingerprint,
    session_id: context?.sessionId,
    api_endpoint: context?.apiEndpoint,
    details: { export_type: exportType, record_count: recordCount },
  })
}

/**
 * Query audit log with filters
 *
 * @param filters - Query filters
 * @returns Audit log entries
 */
export async function queryAuditLog(filters: {
  transactionId?: string
  customerId?: string
  staffId?: string
  actionType?: AuditActionType
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}): Promise<{
  data: Array<{
    id: string
    action: string
    action_type: AuditActionType
    performed_at: string
    performed_by: string | null
    transaction_id: string | null
    ip_address: string | null
    user_agent: string | null
    details: Json | null
  }>
  total: number
}> {
  const supabase = await createClient()

  let query = supabase
    .from("transaction_audit_log")
    .select("*", { count: "exact" })
    .order("performed_at", { ascending: false })

  // Apply filters
  if (filters.transactionId) {
    query = query.eq("transaction_id", filters.transactionId)
  }
  if (filters.staffId) {
    query = query.eq("performed_by", filters.staffId)
  }
  if (filters.actionType) {
    query = query.eq("action_type", filters.actionType)
  }
  if (filters.startDate) {
    query = query.gte("performed_at", filters.startDate.toISOString())
  }
  if (filters.endDate) {
    query = query.lte("performed_at", filters.endDate.toISOString())
  }

  // Apply pagination
  if (filters.limit) {
    query = query.limit(filters.limit)
  }
  if (filters.offset) {
    query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1)
  }

  const { data, error, count } = await query

  if (error) {
    return { data: [], total: 0 }
  }

  return {
    data: data.map((log) => ({
      id: log.id,
      action: log.action,
      action_type: log.action_type,
      performed_at: log.performed_at,
      performed_by: log.performed_by,
      transaction_id: log.transaction_id,
      ip_address: log.ip_address as string | null,
      user_agent: log.user_agent,
      details: log.details,
    })),
    total: count || 0,
  }
}

/**
 * Get audit statistics for a time period
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Audit statistics
 */
export async function getAuditStatistics(
  startDate: Date,
  endDate: Date
): Promise<{
    totalEvents: number
    eventsByType: Record<string, number>
    eventsByAction: Record<string, number>
    uniqueStaff: number
    uniqueTransactions: number
}> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("transaction_audit_log")
    .select("action_type, action, performed_by, transaction_id")
    .gte("performed_at", startDate.toISOString())
    .lte("performed_at", endDate.toISOString())

  if (!data) {
    return {
      totalEvents: 0,
      eventsByType: {},
      eventsByAction: {},
      uniqueStaff: 0,
      uniqueTransactions: 0,
    }
  }

  const eventsByType: Record<string, number> = {}
  const eventsByAction: Record<string, number> = {}
  const uniqueStaff = new Set<string>()
  const uniqueTransactions = new Set<string>()

  for (const event of data) {
    eventsByType[event.action_type] = (eventsByType[event.action_type] || 0) + 1
    eventsByAction[event.action] = (eventsByAction[event.action] || 0) + 1

    if (event.performed_by) {
      uniqueStaff.add(event.performed_by)
    }
    if (event.transaction_id) {
      uniqueTransactions.add(event.transaction_id)
    }
  }

  return {
    totalEvents: data.length,
    eventsByType,
    eventsByAction,
    uniqueStaff: uniqueStaff.size,
    uniqueTransactions: uniqueTransactions.size,
  }
}
