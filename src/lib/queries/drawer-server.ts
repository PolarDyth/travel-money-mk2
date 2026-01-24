import { createClient } from "@/utils/supabase/server";
import type { DenominationWithCurrency, DrawerSummary } from "./drawer";

export async function getDenominationsServer(): Promise<DenominationWithCurrency[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("currency_denominations")
    .select(`
      *,
      currency:currencies!currency_code (
        code,
        symbol,
        name
      )
    `)
    .eq("is_active", true)
    .order("currency_code", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching denominations:", error);
    return [];
  }

  return data as unknown as DenominationWithCurrency[];
}

export async function getExchangeRatesServer(): Promise<Record<string, number>> {
    const supabase = await createClient();
    const { data: rates } = await supabase
        .from('exchange_rates')
        .select('currency_code, buy_rate, sell_rate')
        .is('effective_until', null); 
    
    const map: Record<string, number> = {};
    if (rates) {
        rates.forEach(r => {
            map[r.currency_code] = (r.buy_rate + r.sell_rate) / 2;
        });
    }
    return map;
}

export async function getActiveDrawerSessionServer(operatorId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("drawer_sessions")
        .select("*")
        .eq("operator_id", operatorId)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    return data;
}

export async function getDrawerSummaryServer(sessionId: string): Promise<DrawerSummary | null> {
  const supabase = await createClient();
  
  const { data: session } = await supabase.from('drawer_sessions').select('*').eq('id', sessionId).single();
  if (!session) return null;

  const { data: openingCounts } = await supabase
    .from('drawer_denomination_counts')
    .select(`
        quantity,
        denomination:currency_denominations (
            currency_code,
            value
        )
    `)
    .eq('session_id', sessionId)
    .eq('count_type', 'opening');

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('drawer_session_id', sessionId)
    .eq('status', 'completed');

  const expectedForeign: Record<string, number> = {};
  let expectedGbp = 0;

  if (openingCounts) {
      openingCounts.forEach((c) => {
        if (!c.denomination) return;

        const code = c.denomination.currency_code;
        const val = c.quantity * c.denomination.value;
        
        if (code === 'GBP') {
          expectedGbp += val;
        } else {
          expectedForeign[code] = (expectedForeign[code] || 0) + val;
        }
      });
  }

  transactions?.forEach(t => {
     const foreignAmt = t.foreign_amount || 0;
     const baseAmt = t.base_amount || 0; 
     const commission = t.commission_amount || 0; 
     
     if (t.transaction_type === 'buy') {
        if (t.foreign_currency_code) {
             const code = t.foreign_currency_code;
             expectedForeign[code] = (expectedForeign[code] || 0) + foreignAmt;
        }
        expectedGbp -= (baseAmt - commission);
     } else if (t.transaction_type === 'sell') {
        if (t.foreign_currency_code) {
             const code = t.foreign_currency_code;
             expectedForeign[code] = (expectedForeign[code] || 0) - foreignAmt;
        }
        expectedGbp += (baseAmt + commission);
     }
  });

  return {
    sessionId,
    openingFloatGbp: session.opening_float_gbp,
    expectedGbp,
    expectedForeign,
    transactionsCount: transactions?.length || 0,
    transactions: transactions || []
  };
}
