import { createClient } from "@/utils/supabase/client";
import type {
  TransactionAuditLog,
  StaffProfile,
  UserRole,
  RateOverrideHistory,
  Branch,
  Transaction,
} from "@/types";
import type { RateOverrideHistoryWithDetails, OverrideComplianceMetrics } from "@/lib/types/currency-editing";

// Type for the joined query result from rate_override_history
type RateOverrideHistoryJoinResult = RateOverrideHistory & {
  transaction: Pick<Transaction, "reference_number" | "created_at" | "branch_id" | "foreign_currency_code"> & {
    branch: Pick<Branch, "id" | "name" | "code">;
  };
  approved_by: Pick<StaffProfile, "first_name" | "last_name" | "role">;
};

export type SystemHealthStats = {
  activeTills: number;
  pendingAlerts: number;
  pendingReconciliations: number;
  lastRateSyncAt: string | null;
  errorCount24h: number;
};

export type AuditLogEntry = TransactionAuditLog & {
  performer: Pick<StaffProfile, "id" | "first_name" | "last_name" | "employee_number">;
};

export type AlertsByCategory = {
  severity: Record<string, number>;
  type: Record<string, number>;
  byBranch: { branchName: string; count: number }[];
  avgResolutionTimeMinutes: number;
};

export type StaffDirectoryEntry = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  role: UserRole;
  branchName: string;
  isActive: boolean;
  lastLoginAt: string | null;
};

export type StaffCounts = {
  byRole: Record<UserRole, number>;
  active: number;
  inactive: number;
  recentLogins: number;
};


export async function getSystemHealth(): Promise<SystemHealthStats> {
  const supabase = createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Run all queries in parallel
  const [activeTills, pendingAlerts, pendingReconciliations, lastRateSync] =
    await Promise.all([
      supabase
        .from("drawer_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),

      supabase
        .from("compliance_alerts")
        .select("id", { count: "exact", head: true })
        .is("resolved_at", null),

      supabase
        .from("daily_reconciliation")
        .select("id", { count: "exact", head: true })
        .is("manager_approved_at", null)
        .not("reconciled_at", "is", null),

      supabase
        .from("exchange_rate_history")
        .select("recorded_at")
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  return {
    activeTills: activeTills.count ?? 0,
    pendingAlerts: pendingAlerts.count ?? 0,
    pendingReconciliations: pendingReconciliations.count ?? 0,
    lastRateSyncAt: lastRateSync.data?.recorded_at ?? null,
    errorCount24h: 0, // Would come from Sentry or error logging
  };
}


export async function getAuditTrail(
  limit: number = 50,
  offset: number = 0,
  filters?: {
    actionType?: string;
    staffId?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<{ entries: AuditLogEntry[]; total: number }> {
  const supabase = createClient();

  let query = supabase
    .from("transaction_audit_log")
    .select(
      `
      *,
      performer:staff_profiles!transaction_audit_log_performed_by_fkey(
        id, first_name, last_name, employee_number
      )
    `,
      { count: "exact" }
    )
    .order("performed_at", { ascending: false });

  if (filters?.actionType) {
    query = query.eq("action", filters.actionType);
  }
  if (filters?.staffId) {
    query = query.eq("performed_by", filters.staffId);
  }
  if (filters?.dateFrom) {
    query = query.gte("performed_at", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("performed_at", filters.dateTo);
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching audit trail:", error);
    return { entries: [], total: 0 };
  }

  return {
    entries: (data ?? []) as AuditLogEntry[],
    total: count ?? 0,
  };
}

export async function getAlertsByCategory(): Promise<AlertsByCategory> {
  const supabase = createClient();

  // Get all alerts for analysis
  const { data: alerts, error } = await supabase
    .from("compliance_alerts")
    .select(`
      severity,
      alert_type,
      branch_id,
      created_at,
      resolved_at,
      branch:branches(name)
    `);

  if (error) {
    console.error("Error fetching alerts:", error);
    return {
      severity: {},
      type: {},
      byBranch: [],
      avgResolutionTimeMinutes: 0,
    };
  }

  const severity: Record<string, number> = {};
  const type: Record<string, number> = {};
  const branchCounts = new Map<string, number>();
  let totalResolutionTime = 0;
  let resolvedCount = 0;

  for (const alert of alerts ?? []) {
    // Count by severity
    severity[alert.severity] = (severity[alert.severity] ?? 0) + 1;

    // Count by type
    type[alert.alert_type] = (type[alert.alert_type] ?? 0) + 1;

    // Count by branch
    const branchName = (alert.branch as { name: string } | null)?.name ?? "Unknown";
    branchCounts.set(branchName, (branchCounts.get(branchName) ?? 0) + 1);

    // Calculate resolution time
    if (alert.resolved_at) {
      const created = new Date(alert.created_at).getTime();
      const resolved = new Date(alert.resolved_at).getTime();
      totalResolutionTime += (resolved - created) / (1000 * 60);
      resolvedCount++;
    }
  }

  const byBranch = Array.from(branchCounts.entries())
    .map(([branchName, count]) => ({ branchName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    severity,
    type,
    byBranch,
    avgResolutionTimeMinutes:
      resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
  };
}

export async function getStaffDirectory(): Promise<StaffDirectoryEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("staff_profiles")
    .select(`
      id,
      first_name,
      last_name,
      employee_number,
      role,
      is_active,
      last_login_at,
      branch:branches(name)
    `)
    .order("last_name");

  if (error) {
    console.error("Error fetching staff directory:", error);
    return [];
  }

  return (data ?? []).map((s) => ({
    id: s.id,
    firstName: s.first_name ?? "",
    lastName: s.last_name ?? "",
    employeeNumber: s.employee_number ?? "",
    role: s.role,
    branchName: (s.branch as { name: string } | null)?.name ?? "Unassigned",
    isActive: s.is_active ?? false,
    lastLoginAt: s.last_login_at ?? null,
  }));
}

export async function getStaffCounts(): Promise<StaffCounts> {
  const supabase = createClient();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { data, error } = await supabase.from("staff_profiles").select("role, is_active, last_login_at");

  if (error) {
    console.error("Error fetching staff counts:", error);
    return {
      byRole: { operator: 0, supervisor: 0, manager: 0, admin: 0 },
      active: 0,
      inactive: 0,
      recentLogins: 0,
    };
  }

  const byRole: Record<UserRole, number> = {
    operator: 0,
    supervisor: 0,
    manager: 0,
    admin: 0,
  };
  let active = 0;
  let inactive = 0;
  let recentLogins = 0;

  for (const staff of data ?? []) {
    byRole[staff.role]++;
    if (staff.is_active) {
      active++;
    } else {
      inactive++;
    }
    if (staff.last_login_at && new Date(staff.last_login_at) > yesterday) {
      recentLogins++;
    }
  }

  return { byRole, active, inactive, recentLogins };
}

export type BranchOption = {
  id: string;
  name: string;
  code: string;
};

export async function getBranches(): Promise<BranchOption[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching branches:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Get all currencies with their status and branch settings
 */
export async function getAllCurrencies(): Promise<CurrencyManagementData> {
  const supabase = createClient();
  
  const { data: currencies, error } = await supabase
    .from("currencies")
    .select(`
      code,
      name,
      symbol,
      is_active,
      decimal_places,
      min_transaction_amount,
      max_transaction_amount,
      requires_id_threshold
    `)
    .order("name");

  if (error) {
    console.error("Error fetching currencies:", error);
    return { currencies: [] };
  }

  return {
    currencies: (currencies ?? []).map((c) => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      is_active: c.is_active,
      decimal_places: c.decimal_places,
      min_transaction_amount: c.min_transaction_amount,
      max_transaction_amount: c.max_transaction_amount,
      requires_id_threshold: c.requires_id_threshold,
      branch_enabled: true, // Would be calculated per branch
      branch_has_override: false, // Would be calculated per branch
    })),
  };
}

type CurrencyManagementData = {
  currencies: Array<{
    code: string;
    name: string;
    symbol: string;
    is_active: boolean;
    decimal_places: number;
    min_transaction_amount: number;
    max_transaction_amount: number;
    requires_id_threshold: number | null;
    branch_enabled: boolean;
    branch_has_override: boolean;
  }>;
};

/**
 * Get currency denominations for a currency
 */
export async function getCurrencyDenominations(currencyCode: string): Promise<
  Array<{
    id: string;
    type: "note" | "coin";
    value: number;
    description: string | null;
    sort_order: number;
    is_active: boolean;
  }>
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("currency_denominations")
    .select("*")
    .eq("currency_code", currencyCode)
    .order("value", { ascending: false });

  if (error) {
    console.error("Error fetching denominations:", error);
    return [];
  }

  return (data ?? []).map((denomination) => ({
    id: denomination.id,
    type: denomination.denomination_type as "note" | "coin",
    value: denomination.value,
    description: denomination.description,
    sort_order: denomination.sort_order,
    is_active: denomination.is_active,
  }));
}

/**
 * Get rate override history with filters and pagination
 */
export async function getRateOverrideHistory(filters?: {
  branchId?: string;
  currencyCode?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}): Promise<RateOverrideHistoryResponse> {
  const supabase = createClient();

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("rate_override_history")
    .select(`
      *,
      transaction:transactions!inner(
        reference_number,
        created_at,
        branch_id,
        foreign_currency_code,
        branch:branches!inner(
          id,
          name,
          code
        )
      ),
      approved_by:staff_profiles!inner(
        first_name,
        last_name,
        role
      )
    `, { count: "exact" })
    .order("approved_at", { ascending: false });

  if (filters?.branchId) {
    query = query.eq("transaction.branch_id", filters.branchId);
  }

  if (filters?.currencyCode) {
    query = query.eq("transaction.foreign_currency_code", filters.currencyCode);
  }

  if (filters?.startDate) {
    query = query.gte("approved_at", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("approved_at", filters.endDate);
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) {
    console.error("Error fetching rate override history:", error);
    return { overrides: [], total: 0, page, pageSize };
  }

  const overrides = (data ?? []).map((item: RateOverrideHistoryJoinResult): RateOverrideHistoryWithDetails => ({
    id: item.id,
    transaction_id: item.transaction_id,
    original_rate: item.original_rate,
    override_rate: item.override_rate,
    override_percentage: item.override_percentage ?? null,
    override_reason: item.override_reason,
    approved_by: item.approved_by,
    approved_at: item.approved_at,
    transaction_reference: item.transaction?.reference_number ?? "",
    transaction_date: item.transaction?.created_at ?? "",
    branch_id: item.transaction?.branch?.id ?? "",
    branch_name: item.transaction?.branch?.name ?? "",
    branch_code: item.transaction?.branch?.code ?? "",
    currency_code: item.transaction?.foreign_currency_code ?? "",
    currency_name: "", // Currency name would need to be fetched separately or removed from the type
    approved_by_name: `${item.approved_by?.first_name ?? ""} ${item.approved_by?.last_name ?? ""}`.trim(),
    approved_by_role: item.approved_by?.role ?? "operator",
  }));

  return { overrides, total: count ?? 0, page, pageSize };
}

type RateOverrideHistoryResponse = {
  overrides: RateOverrideHistoryWithDetails[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Get compliance metrics for rate overrides
 */
export async function getOverrideComplianceMetrics(): Promise<OverrideComplianceMetrics> {
  const supabase = createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // Get all overrides in the last 30 days
  const { data: overrides, error } = await supabase
    .from("rate_override_history")
    .select(`
      *,
      transaction:transactions(
        branch_id,
        foreign_currency_code
      ),
      approved_by:staff_profiles(
        first_name,
        last_name,
        role
      ),
      branch:branches(
        name
      ),
      currency:currencies(
        name
      )
    `)
    .gte("approved_at", thirtyDaysAgo.toISOString());

  if (error) {
    console.error("Error fetching override history:", error);
    return {
      totalOverrides: 0,
      overridesByBranch: [],
      overridesByStaff: [],
      overridesByCurrency: [],
      highVarianceOverrides: 0,
      suspiciousPatterns: [],
    };
  }

  const totalOverrides = overrides?.length ?? 0;

  // Aggregate by branch
  const branchMap = new Map<string, { count: number; totalVariance: number; name: string }>();
  
  // Aggregate by staff
  const staffMap = new Map<string, { count: number; totalVariance: number; name: string; role: string }>();
  
  // Aggregate by currency
  const currencyMap = new Map<string, { count: number; totalVariance: number; name: string }>();

  let highVarianceCount = 0;

  for (const override of overrides ?? []) {
    const variance = override.override_percentage ?? 0;

    // Branch aggregation
    const branchId = typeof override.branch === 'object' && override.branch !== null && 'id' in override.branch
      ? (override.branch as { id: string }).id
      : "";
    const branchName = typeof override.branch === 'object' && override.branch !== null && 'name' in override.branch
      ? (override.branch as { name: string }).name
      : "";
    if (!branchMap.has(branchId)) {
      branchMap.set(branchId, { count: 0, totalVariance: 0, name: branchName });
    }
    const branchData = branchMap.get(branchId)!;
    branchData.count++;
    branchData.totalVariance += variance;

    // Staff aggregation
    const approvedById = override.approved_by;
    const approvedByName = typeof override.approved_by === 'object' && override.approved_by !== null && 'first_name' in override.approved_by
      ? `${(override.approved_by as { first_name: string }).first_name ?? ""} ${(override.approved_by as { last_name: string }).last_name ?? ""}`.trim()
      : "";
    const approvedByRole = typeof override.approved_by === 'object' && override.approved_by !== null && 'role' in override.approved_by
      ? (override.approved_by as { role: UserRole }).role
      : "operator";
    if (!staffMap.has(approvedById)) {
      staffMap.set(approvedById, { count: 0, totalVariance: 0, name: approvedByName, role: approvedByRole });
    }
    const staffData = staffMap.get(approvedById)!;
    staffData.count++;
    staffData.totalVariance += variance;

    // Currency aggregation
    const transactionCurrencyCode = typeof override.transaction === 'object' && override.transaction !== null && 'foreign_currency_code' in override.transaction
      ? (override.transaction as { foreign_currency_code: string }).foreign_currency_code
      : "";
    const currencyName = typeof override.currency === 'object' && override.currency !== null && 'name' in override.currency
      ? (override.currency as { name: string }).name
      : "";
    if (!currencyMap.has(transactionCurrencyCode)) {
      currencyMap.set(transactionCurrencyCode, { count: 0, totalVariance: 0, name: currencyName });
    }
    const currencyData = currencyMap.get(transactionCurrencyCode)!;
    currencyData.count++;
    currencyData.totalVariance += variance;

    // Count high variance overrides (>10%)
    if (variance > 10) {
      highVarianceCount++;
    }
  }

  const suspiciousPatterns: Array<{ type: string; description: string; count: number }> = [];

  // Check for patterns
  if (highVarianceCount > 5) {
    suspiciousPatterns.push({
      type: "High Variance",
      description: "Multiple rate overrides with variance > 10%",
      count: highVarianceCount,
    });
  }

  return {
    totalOverrides,
    overridesByBranch: Array.from(branchMap.entries()).map(([id, data]) => ({
      branchId: id,
      branchName: data.name,
      count: data.count,
      averageVariance: data.count > 0 ? data.totalVariance / data.count : 0,
    })),
    overridesByStaff: Array.from(staffMap.entries()).map(([id, data]) => ({
      staffId: id,
      staffName: data.name,
      role: data.role,
      count: data.count,
      averageVariance: data.count > 0 ? data.totalVariance / data.count : 0,
    })),
    overridesByCurrency: Array.from(currencyMap.entries()).map(([code, data]) => ({
      currencyCode: code,
      currencyName: data.name,
      count: data.count,
      averageVariance: data.count > 0 ? data.totalVariance / data.count : 0,
    })),
    highVarianceOverrides: highVarianceCount,
    suspiciousPatterns,
  };
}

