import { createClient } from "@/utils/supabase/client";
import type {
  DrawerSession,
  Transaction,
  ExchangeRate,
  Currency,
  ComplianceAlert,
} from "@/types";

export type RateWithCurrency = ExchangeRate & {
  currency: Currency;
};

export type DrawerSessionWithCounts = DrawerSession & {
  transaction_count: number;
  total_buy_volume: number;
  total_sell_volume: number;
};

export async function getActiveDrawerSession(
  operatorId: string
): Promise<DrawerSession | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("drawer_sessions")
    .select("*")
    .eq("operator_id", operatorId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching drawer session:", error);
    return null;
  }

  return data;
}

export async function getRecentTransactions(
  branchId: string,
  limit: number = 5,
  offset: number = 0
): Promise<{ transactions: Transaction[]; hasMore: boolean }> {
  const supabase = createClient();

  const { data, error, count } = await supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    console.error("Error fetching transactions:", error);
    return { transactions: [], hasMore: false };
  }

  return {
    transactions: data ?? [],
    hasMore: (count ?? 0) > offset + limit + 1,
  };
}

export async function getCurrentRates(
  branchId?: string
): Promise<RateWithCurrency[]> {
  const supabase = createClient();

  // Get global rates and any branch-specific overrides
  // Active rates are those where effective_from <= now and effective_until is null or > now
  const now = new Date().toISOString();
  let query = supabase
    .from("exchange_rates")
    .select(`
      *,
      currency:currencies(*)
    `)
    .lte("effective_from", now)
    .or(`effective_until.is.null,effective_until.gt.${now}`)
    .order("currency_code");

  if (branchId) {
    // Include global rates (branch_id is null) and branch-specific overrides
    query = query.or(`branch_id.is.null,branch_id.eq.${branchId}`);
  } else {
    query = query.is("branch_id", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching rates:", error);
    return [];
  }

  // If there's a branch override, use it instead of the global rate
  const rateMap = new Map<string, RateWithCurrency>();
  for (const rate of (data ?? []) as RateWithCurrency[]) {
    const existing = rateMap.get(rate.currency_code);
    // Branch-specific overrides take precedence
    if (!existing || rate.branch_id !== null) {
      rateMap.set(rate.currency_code, rate);
    }
  }

  return Array.from(rateMap.values());
}

export async function getUnresolvedAlerts(
  branchId: string
): Promise<ComplianceAlert[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("compliance_alerts")
    .select("*")
    .eq("branch_id", branchId)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching alerts:", error);
    return [];
  }

  return data ?? [];
}

export async function voidTransaction(
  transactionId: string,
  performedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // First update the transaction status
  const { error: updateError } = await supabase
    .from("transactions")
    .update({ status: "voided" })
    .eq("id", transactionId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Then create an audit log entry
  const { error: auditError } = await supabase
    .from("transaction_audit_log")
    .insert({
      transaction_id: transactionId,
      action: "voided",
      performed_by: performedBy,
      details: { reason },
    });

  if (auditError) {
    console.error("Error creating audit log:", auditError);
    // Don't fail the void operation just because audit failed
  }

  return { success: true };
}

export async function getSessionStats(
  sessionId: string
): Promise<{ transactionCount: number; totalBuyVolume: number; totalSellVolume: number }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select("transaction_type, base_amount")
    .eq("drawer_session_id", sessionId)
    .eq("status", "completed");

  if (error) {
    console.error("Error fetching session stats:", error);
    return { transactionCount: 0, totalBuyVolume: 0, totalSellVolume: 0 };
  }

  const stats = (data ?? []).reduce(
    (acc, txn) => {
      acc.transactionCount++;
      if (txn.transaction_type === "buy") {
        acc.totalBuyVolume += Number(txn.base_amount ?? 0);
      } else {
        acc.totalSellVolume += Number(txn.base_amount ?? 0);
      }
      return acc;
    },
    { transactionCount: 0, totalBuyVolume: 0, totalSellVolume: 0 }
  );

  return stats;
}
