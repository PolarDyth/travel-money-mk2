import { createClient } from "@/utils/supabase/client";
import type {
  DrawerSession,
  StaffProfile,
  Transaction,
  ComplianceAlert,
} from "@/types";

export type TillWithOperator = DrawerSession & {
  operator: Pick<StaffProfile, "id" | "first_name" | "last_name" | "employee_number">;
};

export type BranchSummary = {
  totalBuy: number;
  totalSell: number;
  transactionCount: number;
  buyCount: number;
  sellCount: number;
  commission: number;
  yesterdayTotal: number;
};

export type OperatorMetric = {
  id: string;
  firstName: string;
  lastName: string;
  transactionCount: number;
  voidCount: number;
  voidRate: number;
  totalVolume: number;
  avgTransactionValue: number;
};

export type DrawerSessionAnalytics = {
  summary: {
    totalSessions: number;
    openCount: number;
    suspendedCount: number;
    closedCount: number;
    avgDurationMinutes: number;
    avgOpenDurationMinutes: number;
    totalVariance: number;
  };
  activeSessions: Array<
    DrawerSession & {
      operator: Pick<
        StaffProfile,
        "id" | "first_name" | "last_name" | "employee_number"
      > | null;
    }
  >;
};

export async function getDrawerSessionAnalytics(
  branchId: string
): Promise<DrawerSessionAnalytics> {
  const supabase = createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectFields = `
    id,
    branch_id,
    status,
    opened_at,
    closed_at,
    till_number,
    opening_float_gbp,
    expected_float_gbp,
    variance_gbp,
    operator:staff_profiles!drawer_sessions_operator_id_fkey(
      id, first_name, last_name, employee_number
    )
  `;

  const [todayResult, activeResult] = await Promise.all([
    supabase
      .from("drawer_sessions")
      .select(selectFields)
      .eq("branch_id", branchId)
      .gte("opened_at", today.toISOString())
      .order("opened_at", { ascending: false }),
    supabase
      .from("drawer_sessions")
      .select(selectFields)
      .eq("branch_id", branchId)
      .eq("status", "open")
      .order("opened_at", { ascending: false }),
  ]);

  if (todayResult.error) {
    console.error("Error fetching drawer session analytics:", todayResult.error);
    return {
      summary: {
        totalSessions: 0,
        openCount: 0,
        suspendedCount: 0,
        closedCount: 0,
        avgDurationMinutes: 0,
        avgOpenDurationMinutes: 0,
        totalVariance: 0,
      },
      activeSessions: [],
    };
  }

  const todaySessions =
    (todayResult.data ?? []) as DrawerSessionAnalytics["activeSessions"];
  const activeSessions =
    (activeResult.data ?? []) as DrawerSessionAnalytics["activeSessions"];
  const now = Date.now();

  let totalDurationMinutes = 0;
  let durationCount = 0;
  let suspendedCount = 0;
  let closedCount = 0;
  let totalVariance = 0;

  for (const session of todaySessions) {
    const openedAt = new Date(session.opened_at).getTime();
    const closedAt = session.closed_at
      ? new Date(session.closed_at).getTime()
      : now;
    const durationMinutes = Math.max(
      0,
      Math.round((closedAt - openedAt) / 60000)
    );

    totalDurationMinutes += durationMinutes;
    durationCount += 1;

    if (session.status === "suspended") {
      suspendedCount += 1;
    }

    if (session.status === "closed") {
      closedCount += 1;
    }

    totalVariance += Number(session.variance_gbp ?? 0);
  }

  const avgDurationMinutes =
    durationCount > 0 ? totalDurationMinutes / durationCount : 0;

  const openCount = activeSessions.length;
  const avgOpenDurationMinutes =
    openCount > 0
      ? activeSessions.reduce((sum, session) => {
          const openedAt = new Date(session.opened_at).getTime();
          return sum + Math.max(0, (now - openedAt) / 60000);
        }, 0) / openCount
      : 0;

  return {
    summary: {
      totalSessions: todaySessions.length,
      openCount,
      suspendedCount,
      closedCount,
      avgDurationMinutes,
      avgOpenDurationMinutes,
      totalVariance,
    },
    activeSessions,
  };
}

export async function getTillStatus(branchId: string): Promise<TillWithOperator[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("drawer_sessions")
    .select(`
      *,
      operator:staff_profiles!drawer_sessions_operator_id_fkey(
        id, first_name, last_name, employee_number
      )
    `)
    .eq("branch_id", branchId)
    .gte("opened_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    .order("opened_at", { ascending: false });

  if (error) {
    console.error("Error fetching till status:", error);
    return [];
  }

  return (data ?? []) as TillWithOperator[];
}

export async function getBranchSummary(branchId: string): Promise<BranchSummary> {
  const supabase = createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Today's transactions
  const { data: todayTxns, error: todayError } = await supabase
    .from("transactions")
    .select("transaction_type, base_amount, commission_amount, status")
    .eq("branch_id", branchId)
    .gte("created_at", today.toISOString())
    .eq("status", "completed");

  if (todayError) {
    console.error("Error fetching today transactions:", todayError);
  }

  // Yesterday's total for comparison
  const { data: yesterdayTxns, error: yesterdayError } = await supabase
    .from("transactions")
    .select("base_amount")
    .eq("branch_id", branchId)
    .gte("created_at", yesterday.toISOString())
    .lt("created_at", today.toISOString())
    .eq("status", "completed");

  if (yesterdayError) {
    console.error("Error fetching yesterday transactions:", yesterdayError);
  }

  const summary = (todayTxns ?? []).reduce(
    (acc, txn) => {
      acc.transactionCount++;
      const amount = Number(txn.base_amount ?? 0);
      const commission = Number(txn.commission_amount ?? 0);

      if (txn.transaction_type === "buy") {
        acc.totalBuy += amount;
        acc.buyCount++;
      } else {
        acc.totalSell += amount;
        acc.sellCount++;
      }
      acc.commission += commission;
      return acc;
    },
    {
      totalBuy: 0,
      totalSell: 0,
      transactionCount: 0,
      buyCount: 0,
      sellCount: 0,
      commission: 0,
    } as Omit<BranchSummary, "yesterdayTotal">
  );

  const yesterdayTotal = (yesterdayTxns ?? []).reduce(
    (sum, txn) => sum + Number(txn.base_amount ?? 0),
    0
  );

  return { ...summary, yesterdayTotal };
}

export async function getOperatorMetrics(
  branchId: string
): Promise<OperatorMetric[]> {
  const supabase = createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all staff in the branch
  const { data: staff, error: staffError } = await supabase
    .from("staff_profiles")
    .select("id, first_name, last_name")
    .eq("branch_id", branchId)
    .eq("role", "operator")
    .eq("is_active", true);

  if (staffError) {
    console.error("Error fetching staff:", staffError);
    return [];
  }

  // Get transactions for all operators
  const { data: transactions, error: txnError } = await supabase
    .from("transactions")
    .select("operator_id, base_amount, status")
    .eq("branch_id", branchId)
    .gte("created_at", today.toISOString());

  if (txnError) {
    console.error("Error fetching transactions:", txnError);
    return [];
  }

  // Calculate metrics per operator
  const metricsMap = new Map<string, OperatorMetric>();

  for (const s of staff ?? []) {
    metricsMap.set(s.id, {
      id: s.id,
      firstName: s.first_name ?? "",
      lastName: s.last_name ?? "",
      transactionCount: 0,
      voidCount: 0,
      voidRate: 0,
      totalVolume: 0,
      avgTransactionValue: 0,
    });
  }

  for (const txn of transactions ?? []) {
    const metric = metricsMap.get(txn.operator_id);
    if (!metric) continue;

    metric.transactionCount++;
    if (txn.status === "voided") {
      metric.voidCount++;
    } else {
      metric.totalVolume += Number(txn.base_amount ?? 0);
    }
  }

  // Calculate derived values
  const metrics = Array.from(metricsMap.values()).map((m) => ({
    ...m,
    voidRate:
      m.transactionCount > 0 ? (m.voidCount / m.transactionCount) * 100 : 0,
    avgTransactionValue:
      m.transactionCount - m.voidCount > 0
        ? m.totalVolume / (m.transactionCount - m.voidCount)
        : 0,
  }));

  return metrics.sort((a, b) => b.transactionCount - a.transactionCount);
}

export async function getPendingAlerts(branchId: string): Promise<ComplianceAlert[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("compliance_alerts")
    .select("*")
    .eq("branch_id", branchId)
    .is("resolved_at", null)
    .order("severity", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching alerts:", error);
    return [];
  }

  return data ?? [];
}

export async function acknowledgeAlert(
  alertId: string,
  acknowledgedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("compliance_alerts")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: acknowledgedBy,
    })
    .eq("id", alertId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
