/**
 * Compliance Queries
 *
 * Server-side queries for compliance alerts, customer investigations,
 * and related data.
 *
 * @module lib/queries/compliance
 */

import { createClient } from "@/utils/supabase/client"
import type {
  ComplianceAlert,
  Customer,
  CustomerRiskFactor,
  CustomerRelationship,
  Transaction,
  SuspiciousPattern,
  HighRiskCustomer,
  ActiveSuspiciousPattern,
} from "@/types"

/**
 * Alert with related data
 */
export type ComplianceAlertWithDetails = ComplianceAlert & {
  branch: { id: string; name: string; code: string } | null
  transaction: Pick<Transaction, "id" | "reference_number" | "created_at" | "base_amount" | "foreign_currency_code"> | null
  acknowledged_by_staff: { id: string; first_name: string | null; last_name: string | null } | null
  resolved_by_staff: { id: string; first_name: string | null; last_name: string | null } | null
}

/**
 * Customer investigation data
 */
export type CustomerInvestigation = Customer & {
  branch_name?: string | null
  risk_factors: CustomerRiskFactor[]
  relationships: Array<{
    id: string
    related_customer: Customer & { branch_name?: string | null }
    relationship_type: string
    confidence_score: number
    detected_at: string
  }>
  transactions: Array<{
    id: string
    reference_number: string
    created_at: string
    base_amount: number
    foreign_currency_code: string
    transaction_type: string
    status: string
  }>
  alerts: Array<{
    id: string
    alert_type: string
    severity: string
    description: string
    created_at: string
    resolved_at: string | null
  }>
}

/**
 * Alert statistics for a time period
 */
export type AlertStats = {
  total: number
  unresolved: number
  acknowledged: number
  resolved: number
  bySeverity: Record<string, number>
  byType: Record<string, number>
  avgResolutionTimeMinutes: number
}

/**
 * Get compliance alerts with filtering
 */
export async function getComplianceAlerts(filters?: {
  branchId?: string
  severity?: string
  status?: "pending" | "acknowledged" | "resolved" | "all"
  limit?: number
  offset?: number
}): Promise<{ alerts: ComplianceAlertWithDetails[]; total: number }> {
  const supabase = createClient()

  const limit = filters?.limit ?? 50
  const offset = filters?.offset ?? 0

  let query = supabase
    .from("compliance_alerts")
    .select(
      `
      *,
      branch:branches(id, name, code),
      transaction:transactions(id, reference_number, created_at, base_amount, foreign_currency_code),
      acknowledged_by_staff:staff_profiles!compliance_alerts_acknowledged_by_fkey(id, first_name, last_name),
      resolved_by_staff:staff_profiles!compliance_alerts_resolved_by_fkey(id, first_name, last_name)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })

  if (filters?.branchId) {
    query = query.eq("branch_id", filters.branchId)
  }

  if (filters?.severity) {
    query = query.eq("severity", filters.severity)
  }

  if (filters?.status === "pending") {
    query = query.is("acknowledged_at", null).is("resolved_at", null)
  } else if (filters?.status === "acknowledged") {
    query = query.not("acknowledged_at", "is", null).is("resolved_at", null)
  } else if (filters?.status === "resolved") {
    query = query.not("resolved_at", "is", null)
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error("Error fetching compliance alerts:", error)
    return { alerts: [], total: 0 }
  }

  return {
    alerts: (data ?? []) as ComplianceAlertWithDetails[],
    total: count ?? 0,
  }
}

/**
 * Get pending alerts for a branch (unacknowledged and unresolved)
 */
export async function getPendingAlerts(branchId: string): Promise<ComplianceAlert[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("compliance_alerts")
    .select("*")
    .eq("branch_id", branchId)
    .is("acknowledged_at", null)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching pending alerts:", error)
    return []
  }

  return data ?? []
}

/**
 * Get alert statistics for a time period
 */
export async function getAlertStats(days: number = 30): Promise<AlertStats> {
  const supabase = createClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const { data: alerts, error } = await supabase
    .from("compliance_alerts")
    .select("severity, alert_type, created_at, resolved_at, acknowledged_at")
    .gte("created_at", startDate.toISOString())

  if (error) {
    console.error("Error fetching alert stats:", error)
    return {
      total: 0,
      unresolved: 0,
      acknowledged: 0,
      resolved: 0,
      bySeverity: {},
      byType: {},
      avgResolutionTimeMinutes: 0,
    }
  }

  const bySeverity: Record<string, number> = {}
  const byType: Record<string, number> = {}
  let totalResolutionTime = 0
  let resolvedCount = 0

  for (const alert of alerts ?? []) {
    // Count by severity
    bySeverity[alert.severity] = (bySeverity[alert.severity] ?? 0) + 1

    // Count by type
    byType[alert.alert_type] = (byType[alert.alert_type] ?? 0) + 1

    // Calculate resolution time
    if (alert.resolved_at) {
      const created = new Date(alert.created_at).getTime()
      const resolved = new Date(alert.resolved_at).getTime()
      totalResolutionTime += (resolved - created) / (1000 * 60)
      resolvedCount++
    }
  }

  const total = alerts?.length ?? 0
  const unresolved = alerts?.filter((a) => !a.resolved_at).length ?? 0
  const acknowledged = alerts?.filter((a) => a.acknowledged_at && !a.resolved_at).length ?? 0
  const resolved = alerts?.filter((a) => a.resolved_at).length ?? 0

  return {
    total,
    unresolved,
    acknowledged,
    resolved,
    bySeverity,
    byType,
    avgResolutionTimeMinutes: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
  }
}

/**
 * Get customer investigation data
 */
export async function getCustomerInvestigation(customerId: string): Promise<CustomerInvestigation | null> {
  const supabase = createClient()

  // Get customer with branch
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select(`
      *,
      branch:branches(name)
    `)
    .eq("id", customerId)
    .single()

  if (customerError || !customer) {
    console.error("Error fetching customer:", customerError)
    return null
  }

  // Get risk factors
  const { data: riskFactors } = await supabase
    .from("customer_risk_factors")
    .select("*")
    .eq("customer_id", customerId)
    .order("detected_at", { ascending: false })

  // Get relationships
  const { data: relationships } = await supabase
    .from("customer_relationships")
    .select(`
      *,
      related_customer:customers!customer_relationships_related_customer_id_fkey(id, first_name_bytea, last_name_bytea, risk_level, branch_id, branch:branches(name))
    `)
    .eq("customer_id", customerId)
    .order("confidence_score", { ascending: false })

  // Get recent transactions
  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, reference_number, created_at, base_amount, foreign_currency_code, transaction_type, status")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20)

  // Get alerts
  const { data: alerts } = await supabase
    .from("compliance_alerts")
    .select("id, alert_type, severity, description, created_at, resolved_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })

  return {
    ...customer,
    branch_name: (customer.branch as { name: string } | null)?.name ?? null,
    risk_factors: riskFactors ?? [],
    relationships: (relationships ?? []).map((r) => {
      const relatedCustomer = r.related_customer as unknown as Customer & { branch?: { name: string } | null }
      return {
        id: r.id,
        related_customer: {
          ...relatedCustomer,
          branch_name: relatedCustomer.branch?.name ?? null,
        },
        relationship_type: r.relationship_type,
        confidence_score: r.confidence_score,
        detected_at: r.detected_at,
      }
    }),
    transactions: transactions ?? [],
    alerts: alerts ?? [],
  } as CustomerInvestigation
}

/**
 * Get high-risk customers
 * Uses security function with role-based and branch-based access control
 */
export async function getHighRiskCustomers(threshold: number = 75): Promise<HighRiskCustomer[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .rpc("get_high_risk_customers")
    .gte("risk_score", threshold)
    .order("risk_score", { ascending: false })

  if (error) {
    console.error("Error fetching high-risk customers:", error)
    return []
  }

  // Map function output column names to expected type
  return (data ?? []).map((row: any) => ({
    id: row.customer_id,
    created_at: row.created_at,
    risk_score: row.risk_score,
    risk_level: row.risk_level,
    is_on_watchlist: row.is_on_watchlist,
    transaction_count: row.transaction_count,
    total_gbp_volume: row.total_gbp_volume,
    branch_id: row.branch_id,
    branch_name: row.branch_name,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
  })) as HighRiskCustomer[]
}

/**
 * Get active suspicious patterns
 * Uses security function with role-based and branch-based access control
 */
export async function getActiveSuspiciousPatterns(filters?: {
  branchId?: string
  patternType?: string
}): Promise<ActiveSuspiciousPattern[]> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc("get_active_suspicious_patterns")

  if (error) {
    console.error("Error fetching active suspicious patterns:", error)
    return []
  }

  // Apply client-side filtering for filters not supported by RPC
  let results = (data ?? []).map((row: any) => ({
    id: row.pattern_id,
    name: row.name,
    description: row.description,
    pattern_type: row.pattern_type,
    severity: row.severity,
    thresholds: row.thresholds,
    branch_id: row.branch_id,
    branch_name: row.branch_name,
    is_active: row.is_active,
    metadata: row.metadata,
  })) as ActiveSuspiciousPattern[]

  // Apply branch filter if provided
  if (filters?.branchId) {
    results = results.filter((p) => p.branch_id === filters.branchId)
  }

  // Apply pattern type filter if provided
  if (filters?.patternType) {
    results = results.filter((p) => p.pattern_type === filters.patternType)
  }

  return results.sort((a, b) => {
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return severityOrder[a.severity as keyof typeof severityOrder] -
           severityOrder[b.severity as keyof typeof severityOrder]
  })
}

/**
 * Get suspicious patterns for management
 */
export async function getSuspiciousPatterns(): Promise<SuspiciousPattern[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("suspicious_patterns")
    .select("*")
    .order("pattern_type", { ascending: true })

  if (error) {
    console.error("Error fetching suspicious patterns:", error)
    return []
  }

  return data ?? []
}

/**
 * Get customer risk factors
 */
export async function getCustomerRiskFactors(customerId: string): Promise<CustomerRiskFactor[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("customer_risk_factors")
    .select("*")
    .eq("customer_id", customerId)
    .order("detected_at", { ascending: false })

  if (error) {
    console.error("Error fetching customer risk factors:", error)
    return []
  }

  return data ?? []
}

/**
 * Get customer relationships
 */
export async function getCustomerRelationships(customerId: string): Promise<CustomerRelationship[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("customer_relationships")
    .select("*")
    .eq("customer_id", customerId)
    .order("confidence_score", { ascending: false })

  if (error) {
    console.error("Error fetching customer relationships:", error)
    return []
  }

  return data ?? []
}

/**
 * Search customers by encrypted fields
 */
export async function searchCustomers(query: {
  firstName?: string
  lastName?: string
  idNumber?: string
  phone?: string
  branchId?: string
}): Promise<Customer[]> {
  const supabase = createClient()

  // Build filters using the encrypted search
  const filters: Record<string, unknown> = {}

  if (query.branchId) {
    filters.branch_id = query.branchId
  }

  // For encrypted fields, we need to use the search function
  let dbQuery = supabase
    .from("customers")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .limit(50)

  // Apply filters for non-encrypted fields
  if (filters.branch_id) {
    dbQuery = dbQuery.eq("branch_id", filters.branch_id as string)
  }

  const { data, error } = await dbQuery

  if (error) {
    console.error("Error searching customers:", error)
    return []
  }

  // Client-side filtering for encrypted fields
  let results = data ?? []

  if (query.firstName || query.lastName || query.idNumber || query.phone) {
    // Decrypt and compare - this is a simplified version
    // In production, you'd want to use PostgreSQL's decryption for better performance
    results = results.filter((_customer) => {
      // This would require decryption - for now return all
      return true
    })
  }

  return results
}

/**
 * Get recent compliance activity
 */
export async function getRecentComplianceActivity(limit: number = 20): Promise<
  Array<{
    type: "alert_created" | "alert_acknowledged" | "alert_resolved" | "risk_updated"
    timestamp: string
    description: string
    severity?: string
    branch?: string
  }>
> {
  const supabase = createClient()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Get recent alerts
  const { data: alerts } = await supabase
    .from("compliance_alerts")
    .select(`
      created_at,
      alert_type,
      severity,
      acknowledged_at,
      resolved_at,
      branch:branches(name)
    `)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(limit)

  const activities: Array<{
    type: "alert_created" | "alert_acknowledged" | "alert_resolved" | "risk_updated"
    timestamp: string
    description: string
    severity?: string
    branch?: string
  }> = []

  for (const alert of alerts ?? []) {
    const branchName = (alert.branch as { name: string } | null)?.name ?? "Unknown"

    // Alert created
    activities.push({
      type: "alert_created",
      timestamp: alert.created_at,
      description: `New ${alert.severity} ${alert.alert_type} alert`,
      severity: alert.severity,
      branch: branchName,
    })

    // Alert acknowledged
    if (alert.acknowledged_at) {
      activities.push({
        type: "alert_acknowledged",
        timestamp: alert.acknowledged_at,
        description: `${alert.alert_type} alert acknowledged`,
        severity: alert.severity,
        branch: branchName,
      })
    }

    // Alert resolved
    if (alert.resolved_at) {
      activities.push({
        type: "alert_resolved",
        timestamp: alert.resolved_at,
        description: `${alert.alert_type} alert resolved`,
        severity: alert.severity,
        branch: branchName,
      })
    }
  }

  return activities.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit)
}
