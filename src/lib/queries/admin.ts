import { createClient } from "@/utils/supabase/client";
import type {
  TransactionAuditLog,
  StaffProfile,
  UserRole,
} from "@/types";

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
