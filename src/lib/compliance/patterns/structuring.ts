/**
 * Structuring Pattern Detector
 *
 * Detects structuring: multiple transactions just below reporting thresholds
 * (typically £10,000) designed to avoid detection.
 *
 * Pattern: >2 transactions in 30 days, each £8,000-£9,999
 *
 * @module lib/compliance/patterns/structuring
 */

import type { DetectionResult, DetectionConfig } from "../detection-engine"
import type { Transaction } from "@/types"
import { isInStructuringRange } from "./index"

/**
 * Detect structuring pattern
 */
export async function detectStructuringPattern(
  config: DetectionConfig,
  history: Transaction[]
): Promise<DetectionResult[]> {
  const results: DetectionResult[] = []

  // Look for transactions in the structuring range (£8,000-£9,999.99)
  const structuringTxns = history.filter((t) =>
    isInStructuringRange(t.base_amount)
  )

  // Need at least 3 transactions to flag as structuring
  if (structuringTxns.length < 3) {
    return results
  }

  // Check if they occurred within 30 days
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
  const now = config.timestamp ? config.timestamp.getTime() : Date.now()

  // Get recent structuring transactions (last 30 days)
  const recentStructuring = structuringTxns.filter((t) => {
    const txnTime = new Date(t.created_at).getTime()
    return now - txnTime <= thirtyDaysMs
  })

  if (recentStructuring.length >= 3) {
    // Calculate total amount structured
    const totalStructured = recentStructuring.reduce(
      (sum, t) => sum + t.base_amount,
      0
    )

    results.push({
      patternType: "structuring",
      severity: "HIGH",
      description: `Potential structuring detected: ${recentStructuring.length} transactions between £8,000-£9,999 in past 30 days (total: £${totalStructured.toFixed(2)})`,
      scoreImpact: 40,
      relatedTransactionIds: recentStructuring.map((t) => t.id),
      metadata: {
        transaction_count: recentStructuring.length,
        total_amount: totalStructured,
        time_window_days: 30,
      },
    })
  }

  return results
}
