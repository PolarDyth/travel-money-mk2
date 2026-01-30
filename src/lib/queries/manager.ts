import { createClient } from "@/utils/supabase/client";
import type {
  Branch,
  DailyReconciliation,
  ExchangeRateSettings,
  Currency,
} from "@/types";
import type { BranchCurrencySettings } from "@/lib/types/currency-editing";

// Type for the joined query result from exchange_rate_settings
type ExchangeRateSettingsJoinResult = ExchangeRateSettings & {
  currencies: Pick<Currency, "name" | "symbol" | "decimal_places"> | null;
  branches: Pick<Branch, "id" | "name" | "code"> | null;
};

export type BranchMetric = {
  id: string;
  name: string;
  code: string;
  totalVolume: number;
  transactionCount: number;
  buyVolume: number;
  sellVolume: number;
  variance: number;
  targetVolume: number;
};

export type ReconciliationItem = DailyReconciliation & {
  branch: Pick<Branch, "id" | "name" | "code">;
};

export type TrendDataPoint = {
  date: string;
  revenue: number;
  buyVolume: number;
  sellVolume: number;
  transactionCount: number;
};

export type CurrencyVolume = {
  currencyCode: string;
  volume: number;
  count: number;
};

export type StaffPerformance = {
  id: string;
  firstName: string;
  lastName: string;
  branchName: string;
  branchId: string;
  transactionCount: number;
  totalVolume: number;
  voidRate: number;
  avgTransactionValue: number;
};

export type BranchRateSetting = {
  currencyCode: string;
  currencyName: string;
  globalBuyRate: number;
  globalSellRate: number;
  branchBuyRate?: number;
  branchSellRate?: number;
  hasOverride: boolean;
};

export type RateWithOverride = {
  id: string;
  currency_code: string;
  buy_rate: number;
  sell_rate: number;
  branch_id: string | null;
  currencyCode: string;
  currencyName: string;
  hasOverride: boolean;
  overrideCount: number;
};

export async function getMultiBranchSummary(): Promise<BranchMetric[]> {
  const supabase = createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all active branches
  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id, name, code")
    .eq("is_active", true);

  if (branchError) {
    console.error("Error fetching branches:", branchError);
    return [];
  }

  // Get today's transactions grouped by branch
  const { data: transactions, error: txnError } = await supabase
    .from("transactions")
    .select("branch_id, transaction_type, base_amount, status")
    .gte("created_at", today.toISOString())
    .eq("status", "completed");

  if (txnError) {
    console.error("Error fetching transactions:", txnError);
  }

  // Aggregate metrics per branch
  const metricsMap = new Map<string, BranchMetric>();

  for (const branch of branches ?? []) {
    metricsMap.set(branch.id, {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      totalVolume: 0,
      transactionCount: 0,
      buyVolume: 0,
      sellVolume: 0,
      variance: 0,
      targetVolume: 50000, // Default target
    });
  }

  for (const txn of transactions ?? []) {
    const metric = metricsMap.get(txn.branch_id);
    if (!metric) continue;

    const amount = Number(txn.base_amount ?? 0);
    metric.totalVolume += amount;
    metric.transactionCount++;

    if (txn.transaction_type === "buy") {
      metric.buyVolume += amount;
    } else {
      metric.sellVolume += amount;
    }
  }

  // Calculate variance from target
  for (const metric of metricsMap.values()) {
    metric.variance = ((metric.totalVolume - metric.targetVolume) / metric.targetVolume) * 100;
  }

  return Array.from(metricsMap.values()).sort((a, b) => b.totalVolume - a.totalVolume);
}

export async function getPendingReconciliations(): Promise<ReconciliationItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("daily_reconciliation")
    .select(`
      *,
      branch:branches(id, name, code)
    `)
    .is("manager_approved_at", null)
    .not("reconciled_at", "is", null)
    .order("reconciliation_date", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching reconciliations:", error);
    return [];
  }

  return (data ?? []) as ReconciliationItem[];
}

export async function getTrendData(days: number = 7): Promise<TrendDataPoint[]> {
  const supabase = createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("transactions")
    .select("created_at, transaction_type, base_amount, commission_amount")
    .gte("created_at", startDate.toISOString())
    .eq("status", "completed");

  if (error) {
    console.error("Error fetching trend data:", error);
    return [];
  }

  // Group by date
  const dailyData = new Map<string, TrendDataPoint>();

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().split("T")[0];
    dailyData.set(dateKey, {
      date: dateKey,
      revenue: 0,
      buyVolume: 0,
      sellVolume: 0,
      transactionCount: 0,
    });
  }

  for (const txn of data ?? []) {
    const dateKey = new Date(txn.created_at).toISOString().split("T")[0];
    const point = dailyData.get(dateKey);
    if (!point) continue;

    const amount = Number(txn.base_amount ?? 0);
    const commission = Number(txn.commission_amount ?? 0);

    point.revenue += commission;
    point.transactionCount++;

    if (txn.transaction_type === "buy") {
      point.buyVolume += amount;
    } else {
      point.sellVolume += amount;
    }
  }

  return Array.from(dailyData.values());
}

export async function getCurrencyVolumes(): Promise<CurrencyVolume[]> {
  const supabase = createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("transactions")
    .select("foreign_currency_code, foreign_amount")
    .gte("created_at", today.toISOString())
    .eq("status", "completed");

  if (error) {
    console.error("Error fetching currency volumes:", error);
    return [];
  }

  const volumeMap = new Map<string, CurrencyVolume>();

  for (const txn of data ?? []) {
    const code = txn.foreign_currency_code;
    if (!volumeMap.has(code)) {
      volumeMap.set(code, { currencyCode: code, volume: 0, count: 0 });
    }
    const vol = volumeMap.get(code)!;
    vol.volume += Number(txn.foreign_amount ?? 0);
    vol.count++;
  }

  return Array.from(volumeMap.values()).sort((a, b) => b.volume - a.volume);
}

export async function getGlobalRatesWithOverrides(): Promise<RateWithOverride[]> {
  const supabase = createClient();

  // Get global rates (active = effective_from <= now and effective_until is null or > now)
  const now = new Date().toISOString();
  const { data: globalRates, error: globalError } = await supabase
    .from("exchange_rates")
    .select(`
      *,
      currency:currencies(code, name)
    `)
    .is("branch_id", null)
    .lte("effective_from", now)
    .or(`effective_until.is.null,effective_until.gt.${now}`);

  if (globalError) {
    console.error("Error fetching global rates:", globalError);
    return [];
  }

  // Get override counts
  const { data: overrides, error: overrideError } = await supabase
    .from("exchange_rates")
    .select("currency_code")
    .not("branch_id", "is", null)
    .lte("effective_from", now)
    .or(`effective_until.is.null,effective_until.gt.${now}`);

  if (overrideError) {
    console.error("Error fetching overrides:", overrideError);
  }

  const overrideCount = new Map<string, number>();
  for (const o of overrides ?? []) {
    overrideCount.set(o.currency_code, (overrideCount.get(o.currency_code) ?? 0) + 1);
  }

  return (globalRates ?? []).map((rate) => ({
    id: rate.id,
    currency_code: rate.currency_code,
    buy_rate: rate.buy_rate,
    sell_rate: rate.sell_rate,
    branch_id: rate.branch_id,
    currencyCode: (rate.currency as { code: string })?.code ?? rate.currency_code,
    currencyName: (rate.currency as { name: string })?.name ?? "",
    hasOverride: (overrideCount.get(rate.currency_code) ?? 0) > 0,
    overrideCount: overrideCount.get(rate.currency_code) ?? 0,
  }));
}

export async function getAllStaffPerformance(): Promise<StaffPerformance[]> {
  const supabase = createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all operators with their branches
  const { data: staff, error: staffError } = await supabase
    .from("staff_profiles")
    .select(`
      id, first_name, last_name,
      branch:branches(id, name)
    `)
    .in("role", ["operator", "supervisor"])
    .eq("is_active", true);

  if (staffError) {
    console.error("Error fetching staff:", staffError);
    return [];
  }

  // Get all transactions today
  const { data: transactions, error: txnError } = await supabase
    .from("transactions")
    .select("operator_id, base_amount, status")
    .gte("created_at", today.toISOString());

  if (txnError) {
    console.error("Error fetching transactions:", txnError);
    return [];
  }

  // Calculate metrics
  const metricsMap = new Map<string, StaffPerformance>();

  for (const s of staff ?? []) {
    const branch = s.branch as { id: string; name: string } | null;
    metricsMap.set(s.id, {
      id: s.id,
      firstName: s.first_name ?? "",
      lastName: s.last_name ?? "",
      branchName: branch?.name ?? "Unassigned",
      branchId: branch?.id ?? "",
      transactionCount: 0,
      totalVolume: 0,
      voidRate: 0,
      avgTransactionValue: 0,
    });
  }

  const voidCounts = new Map<string, number>();

  for (const txn of transactions ?? []) {
    const metric = metricsMap.get(txn.operator_id);
    if (!metric) continue;

    metric.transactionCount++;
    if (txn.status === "voided") {
      voidCounts.set(txn.operator_id, (voidCounts.get(txn.operator_id) ?? 0) + 1);
    } else {
      metric.totalVolume += Number(txn.base_amount ?? 0);
    }
  }

  // Calculate derived values
  const result = Array.from(metricsMap.values())
    .filter((m) => m.transactionCount > 0)
    .map((m) => {
      const voids = voidCounts.get(m.id) ?? 0;
      const completed = m.transactionCount - voids;
      return {
        ...m,
        voidRate: m.transactionCount > 0 ? (voids / m.transactionCount) * 100 : 0,
        avgTransactionValue: completed > 0 ? m.totalVolume / completed : 0,
      };
    });

  return result.sort((a, b) => b.totalVolume - a.totalVolume);
}

export async function approveReconciliation(
  reconciliationId: string,
  managerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("daily_reconciliation")
    .update({
      manager_approved_at: new Date().toISOString(),
      manager_approved_by: managerId,
    })
    .eq("id", reconciliationId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get branch currency settings with currency details
 */
export async function getBranchCurrencySettings(
  branchId: string
): Promise<BranchCurrencySettings[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("exchange_rate_settings")
    .select(`
      *,
      currencies!inner(code, name, symbol, decimal_places),
      branches!inner(id, name, code)
    `)
    .eq("branch_id", branchId)
    .order("currencies(code)", { ascending: true });

  if (error) {
    console.error("Error fetching branch currency settings:", error);
    return [];
  }

  return (data ?? []).map((item: ExchangeRateSettingsJoinResult): BranchCurrencySettings => ({
    id: item.id,
    branch_id: item.branch_id,
    currency_code: item.currency_code,
    is_enabled: item.is_enabled,
    allow_rate_override: item.allow_rate_override,
    max_override_percentage: item.max_override_percentage ?? null,
    require_supervisor_approval: item.require_supervisor_approval,
    supervisor_override_reason_required: item.supervisor_override_reason_required,
    created_at: item.created_at,
    updated_at: item.updated_at,
    currency_name: item.currencies?.name ?? "",
    currency_symbol: item.currencies?.symbol ?? "",
    currency_decimal_places: item.currencies?.decimal_places ?? 2,
    branch_name: item.branches?.name ?? "",
    branch_code: item.branches?.code ?? "",
  }));
}

/**
 * Get branch-specific rates compared to global rates
 */
export async function getBranchRateSettings(branchId: string): Promise<BranchRateSetting[]> {
  const supabase = createClient();

  const now = new Date().toISOString();

  // Get global rates
  const { data: globalRates, error: globalError } = await supabase
    .from("exchange_rates")
    .select("currency_code, buy_rate, sell_rate")
    .is("branch_id", null)
    .lte("effective_from", now)
    .or(`effective_until.is.null,effective_until.gt.${now}`);

  if (globalError) {
    console.error("Error fetching global rates:", globalError);
    return [];
  }

  // Get branch rates
  const { data: branchRates, error: branchError } = await supabase
    .from("exchange_rates")
    .select("currency_code, buy_rate, sell_rate")
    .eq("branch_id", branchId)
    .lte("effective_from", now)
    .or(`effective_until.is.null,effective_until.gt.${now}`);

  if (branchError) {
    console.error("Error fetching branch rates:", branchError);
  }

  const branchRateMap = new Map<string, { buy_rate: number; sell_rate: number }>();
  for (const rate of branchRates ?? []) {
    branchRateMap.set(rate.currency_code, {
      buy_rate: rate.buy_rate,
      sell_rate: rate.sell_rate,
    });
  }

  // Get currency names
  const { data: currencies, error: currencyError } = await supabase
    .from("currencies")
    .select("code, name")
    .eq("is_active", true);

  if (currencyError) {
    console.error("Error fetching currencies:", currencyError);
  }

  const currencyNameMap = new Map<string, string>();
  for (const curr of currencies ?? []) {
    currencyNameMap.set(curr.code, curr.name);
  }

  return (globalRates ?? []).map((globalRate) => {
    const branchRate = branchRateMap.get(globalRate.currency_code);
    return {
      currencyCode: globalRate.currency_code,
      currencyName: currencyNameMap.get(globalRate.currency_code) ?? "",
      globalBuyRate: globalRate.buy_rate,
      globalSellRate: globalRate.sell_rate,
      branchBuyRate: branchRate?.buy_rate,
      branchSellRate: branchRate?.sell_rate,
      hasOverride: branchRate !== undefined,
    };
  });
}
