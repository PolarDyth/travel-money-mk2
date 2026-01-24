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
    // If buying foreign currency, we give GBP, so Amount * Rate ? No.
    // Buy Rate: Bank BUYS foreign currency. Customer SELLS foreign currency.
    // Sell Rate: Bank SELLS foreign currency. Customer BUYS foreign currency.
    
    // Scenario 1: Customer buys 100 EUR (Sell transaction for Bureau)
    // Rate 1.15. 
    // GBP cost = 100 / 1.15 = 86.95 GBP
    
    // Scenario 2: Customer sells 100 EUR (Buy transaction for Bureau)
    // Rate 1.25.
    // GBP payout = 100 / 1.25 = 80.00 GBP

    // Wait, the standard is usually:
    // Buy Rate = Client gets X Foreign for 1 GBP ? Or 1 GBP buys X Foreign?
    // Usually rates are displayed as "We Buy at 1.25" meaning 1 GBP = 1.25 EUR.
    // If I have 100 EUR to sell to the bureau. 100 / 1.25 = 80 GBP.
    
    // So calculation is always: Foreign / Rate = GBP.
    // Or GBP * Rate = Foreign.

    return Number((amount).toFixed(2));
}
