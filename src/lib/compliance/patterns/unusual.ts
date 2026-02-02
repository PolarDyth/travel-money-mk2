/**
 * Unusual Behavior Pattern Detector
 *
 * Detects unusual transaction patterns:
 * - 3x customer's average amount
 * - Unusual currency combination
 * - Large cash vs usual
 *
 * @module lib/compliance/patterns/unusual
 */

import type { DetectionResult, DetectionConfig } from "../detection-engine"
import type { Transaction } from "@/types"
import { getCustomerAverageAmount } from "./index"

/**
 * Detect unusual behavior patterns
 */
export async function detectUnusualBehaviorPattern(
  config: DetectionConfig,
  history: Transaction[]
): Promise<DetectionResult[]> {
  const results: DetectionResult[] = []

  if (history.length < 3) {
    // Need some history to establish patterns
    return results
  }

  // Get customer's average transaction amount
  const averageAmount = await getCustomerAverageAmount(config.customerId)

  // Check if current transaction is 3x or more the average
  if (averageAmount > 0 && config.baseAmount >= averageAmount * 3) {
    results.push({
      patternType: "unusual_behavior",
      severity: "MEDIUM",
      description: `Unusual transaction amount: £${config.baseAmount.toFixed(2)} is ${((config.baseAmount / averageAmount)).toFixed(1)}x customer's average (£${averageAmount.toFixed(2)})`,
      scoreImpact: 20,
      relatedTransactionIds: [config.transactionId],
      metadata: {
        current_amount: config.baseAmount,
        average_amount: averageAmount,
        multiplier: config.baseAmount / averageAmount,
      },
    })
  }

  // Check for unusual currency (e.g., high-risk currencies)
  const highRiskCurrencies = ["RUB", "TRY", "ZAR", "MXN"] // Example: currencies often flagged

  if (highRiskCurrencies.includes(config.foreignCurrencyCode)) {
    results.push({
      patternType: "unusual_behavior",
      severity: "MEDIUM",
      description: `Transaction involving higher-risk currency: ${config.foreignCurrencyCode}`,
      scoreImpact: 15,
      relatedTransactionIds: [config.transactionId],
      metadata: {
        currency: config.foreignCurrencyCode,
        risk_category: "geopolitical",
      },
    })
  }

  // Check if this is a buy transaction for a currency the customer usually sells (or vice versa)
  const customerTxnTypes = new Map<string, number>()
  for (const txn of history) {
    const currency = txn.foreign_currency_code
    const type = txn.transaction_type
    const key = `${currency}_${type}`
    customerTxnTypes.set(key, (customerTxnTypes.get(key) || 0) + 1)
  }

  // Determine customer's usual pattern for this currency
  const buyCount = customerTxnTypes.get(`${config.foreignCurrencyCode}_buy`) || 0
  const sellCount = customerTxnTypes.get(`${config.foreignCurrencyCode}_sell`) || 0

  // If customer mostly buys this currency but is now selling (or vice versa)
  if (buyCount > 5 && config.transactionType === "sell") {
    results.push({
      patternType: "unusual_behavior",
      severity: "LOW",
      description: `Unusual transaction direction: Customer usually buys ${config.foreignCurrencyCode} but is now selling`,
      scoreImpact: 10,
      relatedTransactionIds: [config.transactionId],
      metadata: {
        currency: config.foreignCurrencyCode,
        usual_direction: "buy",
        current_direction: "sell",
        historical_buy_count: buyCount,
        historical_sell_count: sellCount,
      },
    })
  } else if (sellCount > 5 && config.transactionType === "buy") {
    results.push({
      patternType: "unusual_behavior",
      severity: "LOW",
      description: `Unusual transaction direction: Customer usually sells ${config.foreignCurrencyCode} but is now buying`,
      scoreImpact: 10,
      relatedTransactionIds: [config.transactionId],
      metadata: {
        currency: config.foreignCurrencyCode,
        usual_direction: "sell",
        current_direction: "buy",
        historical_buy_count: buyCount,
        historical_sell_count: sellCount,
      },
    })
  }

  return results
}
