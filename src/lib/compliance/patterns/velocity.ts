/**
 * Velocity Pattern Detector
 *
 * Detects high-velocity transaction patterns:
 * - HIGH: >50 transactions in 30 days
 * - MEDIUM: >10 transactions in 1 day
 * - LOW: >5 transactions in 1 hour
 *
 * @module lib/compliance/patterns/velocity
 */

import type { DetectionResult, DetectionConfig } from "../detection-engine"
import type { Transaction } from "@/types"

/**
 * Detect velocity patterns
 */
export async function detectVelocityPattern(
  config: DetectionConfig,
  history: Transaction[]
): Promise<DetectionResult[]> {
  const results: DetectionResult[] = []
  const now = config.timestamp ? config.timestamp.getTime() : Date.now()

  // Helper to count transactions in time window
  const countInWindow = (windowMs: number) => {
    const cutoff = now - windowMs
    return history.filter((t) => new Date(t.created_at).getTime() >= cutoff).length
  }

  // HIGH: >50 transactions in 30 days
  const thirtyDayCount = countInWindow(30 * 24 * 60 * 60 * 1000)
  if (thirtyDayCount > 50) {
    results.push({
      patternType: "velocity",
      severity: "HIGH",
      description: `High transaction velocity: ${thirtyDayCount} transactions in past 30 days`,
      scoreImpact: 30,
      relatedTransactionIds: history
        .filter((t) => new Date(t.created_at).getTime() >= now - 30 * 24 * 60 * 60 * 1000)
        .slice(0, 50)
        .map((t) => t.id),
      metadata: {
        transaction_count: thirtyDayCount,
        time_window_days: 30,
      },
    })
  }

  // MEDIUM: >10 transactions in 1 day
  const oneDayCount = countInWindow(24 * 60 * 60 * 1000)
  if (oneDayCount > 10 && thirtyDayCount <= 50) {
    // Only flag if not already flagged as HIGH
    results.push({
      patternType: "velocity",
      severity: "MEDIUM",
      description: `Elevated transaction velocity: ${oneDayCount} transactions in past 24 hours`,
      scoreImpact: 20,
      relatedTransactionIds: history
        .filter((t) => new Date(t.created_at).getTime() >= now - 24 * 60 * 60 * 1000)
        .slice(0, 10)
        .map((t) => t.id),
      metadata: {
        transaction_count: oneDayCount,
        time_window_hours: 24,
      },
    })
  }

  // LOW: >5 transactions in 1 hour
  const oneHourCount = countInWindow(60 * 60 * 1000)
  if (oneHourCount > 5 && oneDayCount <= 10) {
    // Only flag if not already flagged
    results.push({
      patternType: "velocity",
      severity: "LOW",
      description: `Noticeable transaction velocity: ${oneHourCount} transactions in past hour`,
      scoreImpact: 10,
      relatedTransactionIds: history
        .filter((t) => new Date(t.created_at).getTime() >= now - 60 * 60 * 1000)
        .slice(0, 5)
        .map((t) => t.id),
      metadata: {
        transaction_count: oneHourCount,
        time_window_hours: 1,
      },
    })
  }

  return results
}
