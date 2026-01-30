import { createClient } from "@/utils/supabase/client";
import type {
  DrawerSession,
  Transaction,
  ExchangeRate,
  Currency,
  ComplianceAlert,
} from "@/types";
import { QueryResult } from "@/lib/types/response";

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
): Promise<QueryResult<DrawerSession>> {
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
    return {
      data: null,
      error: new Error(error.message)
    };
  }

  return {
    data,
    error: null
  };
}

export async function getRecentTransactions(
  branchId: string,
  limit: number = 5,
  offset: number = 0
): Promise<QueryResult<{ transactions: Transaction[]; hasMore: boolean }>> {
  const supabase = createClient();

  const { data, error, count } = await supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    return {
      data: null,
      error: new Error(error.message)
    };
  }

  return {
    data: {
      transactions: data ?? [],
      hasMore: (count ?? 0) > offset + limit + 1,
    },
    error: null
  };
}

export async function getCurrentRates(
  branchId?: string
): Promise<QueryResult<RateWithCurrency[]>> {
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
    return {
      data: null,
      error: new Error(error.message)
    };
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

  return {
    data: Array.from(rateMap.values()),
    error: null
  };
}

export async function getUnresolvedAlerts(
  branchId: string
): Promise<QueryResult<ComplianceAlert[]>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("compliance_alerts")
    .select("*")
    .eq("branch_id", branchId)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return {
      data: null,
      error: new Error(error.message)
    };
  }

  return {
    data: data ?? [],
    error: null
  };
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
): Promise<QueryResult<{ transactionCount: number; totalBuyVolume: number; totalSellVolume: number }>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select("transaction_type, base_amount")
    .eq("drawer_session_id", sessionId)
    .eq("status", "completed");

  if (error) {
    return {
      data: null,
      error: new Error(error.message)
    };
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

  return {
    data: stats,
    error: null
  };
}
