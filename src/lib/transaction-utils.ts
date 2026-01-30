// src/lib/transaction-utils.ts

import { Database } from "@/types/database";

type Denomination = Database["public"]["Tables"]["currency_denominations"]["Row"];

export function calculateOptimalDenominations(
  amount: number,
  denominations: Denomination[]
): { denomination_id: string; count: number; value: number }[] {
  // Sort denominations by value descending
  const sortedDenoms = [...denominations].sort((a, b) => b.value - a.value);
  
  let remainingAmount = amount;
  const result: { denomination_id: string; count: number; value: number }[] = [];

  for (const denom of sortedDenoms) {
    if (remainingAmount <= 0) break;

    const count = Math.floor(remainingAmount / denom.value);
    
    if (count > 0) {
      result.push({
        denomination_id: denom.id,
        count: count,
        value: denom.value
      });
      remainingAmount = Number((remainingAmount - (count * denom.value)).toFixed(2));
    }
  }

  return result;
}

export function calculateExchangeAmount(
  amount: number,
  rate: number,
  type: 'buy' | 'sell'
): number {
  // For 'buy': bureau BUYS foreign currency FROM customer
  // Customer gives us foreign_amount, we give them base_amount
  // base_amount = foreign_amount / buy_rate

  // For 'sell': bureau SELLS foreign currency TO customer
  // Customer gives us base_amount, we give them foreign_amount
  // foreign_amount = base_amount * sell_rate

  if (type === 'buy') {
    // When buying foreign currency, divide by rate
    return Number((amount / rate).toFixed(2));
  } else {
    // When selling foreign currency, multiply by rate
    return Number((amount * rate).toFixed(2));
  }
}
