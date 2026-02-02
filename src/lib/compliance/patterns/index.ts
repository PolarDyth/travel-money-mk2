/**
 * Pattern Detection Functions
 *
 * Individual pattern detectors for suspicious transaction analysis.
 * Each function analyzes transaction history for specific patterns.
 *
 * @module lib/compliance/patterns
 */

import { createClient } from "@/utils/supabase/server"

// Export all pattern detectors
export { detectStructuringPattern } from "./structuring"
export { detectVelocityPattern } from "./velocity"
export { detectBackToBackPattern } from "./back-to-back"
export { detectGroupTransactionPattern } from "./group"
export { detectUnusualBehaviorPattern } from "./unusual"

/**
 * Helper: Get customer's average transaction amount
 */
export async function getCustomerAverageAmount(
  customerId: string
): Promise<number> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("transactions")
    .select("base_amount")
    .eq("customer_id", customerId)
    .eq("status", "completed")

  if (!data || data.length === 0) {
    return 0
  }

  const total = data.reduce((sum, t) => sum + (t.base_amount || 0), 0)
  return total / data.length
}

/**
 * Helper: Get customer transaction count in time window
 */
export async function getTransactionCountInWindow(
  customerId: string,
  windowMs: number
): Promise<number> {
  const supabase = await createClient()
  const cutoff = new Date(Date.now() - windowMs).toISOString()

  const { data } = await supabase
    .from("transactions")
    .select("id")
    .eq("customer_id", customerId)
    .gte("created_at", cutoff)

  return (data?.length || 0)
}

/**
 * Helper: Check for transactions in structuring range
 */
export function isInStructuringRange(amount: number): boolean {
  return amount >= 8000 && amount <= 9999.99
}

/**
 * Helper: Calculate time difference in minutes
 */
export function minutesBetween(date1: Date, date2: Date): number {
  return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60)
}
