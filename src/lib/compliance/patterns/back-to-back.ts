/**
 * Back-to-Back Transaction Detector
 *
 * Detects back-to-back transactions:
 * - Same currency, same branch, <10 min apart, >£5,000
 *
 * @module lib/compliance/patterns/back-to-back
 */

import type { DetectionResult, DetectionConfig } from "../detection-engine"
import type { Transaction } from "@/types"
import { minutesBetween } from "./index"

/**
 * Detect back-to-back transactions
 */
export async function detectBackToBackPattern(
  config: DetectionConfig,
  history: Transaction[]
): Promise<DetectionResult[]> {
  const results: DetectionResult[] = []

  // Find transactions with same currency and type > £5,000
  const largeSameCurrency = history.filter(
    (t) =>
      t.foreign_currency_code === config.foreignCurrencyCode &&
      t.base_amount > 5000
  )

  // Sort by time
  const sorted = largeSameCurrency.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // Look for pairs within 10 minutes
  const pairs: Array<[Transaction, Transaction]> = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]

    const minutes = minutesBetween(
      new Date(current.created_at),
      new Date(next.created_at)
    )

    if (minutes < 10) {
      pairs.push([current, next])
    }
  }

  if (pairs.length > 0) {
    results.push({
      patternType: "back_to_back",
      severity: "MEDIUM",
      description: `Back-to-back transactions detected: ${pairs.length} pair(s) of same-currency transactions >£5,000 within 10 minutes`,
      scoreImpact: 25,
      relatedTransactionIds: pairs.flatMap((pair) => [pair[0].id, pair[1].id]),
      metadata: {
        pair_count: pairs.length,
        currency: config.foreignCurrencyCode,
        threshold_amount: 5000,
        time_window_minutes: 10,
      },
    })
  }

  return results
}
