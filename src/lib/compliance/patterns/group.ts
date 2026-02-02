/**
 * Group Transaction Pattern Detector
 *
 * Detects transactions from linked customers:
 * - Multiple related customers making >2 transactions totaling >£10k in 24h
 *
 * @module lib/compliance/patterns/group
 */

import type { DetectionResult, DetectionConfig } from "../detection-engine"
import { createClient } from "@/utils/supabase/server"
import { getRelatedCustomerNetwork } from "../customer-linker"

/**
 * Detect group transaction patterns
 */
export async function detectGroupTransactionPattern(
  config: DetectionConfig
): Promise<DetectionResult[]> {
  const results: DetectionResult[] = []

  // Get customer's network
  const network = await getRelatedCustomerNetwork(config.customerId, 2)

  // Need at least one related customer
  if (network.size <= 1) {
    return results
  }

  const supabase = await createClient()

  // Get all transactions from network in last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const networkIds = Array.from(network).filter((id): id is string => id != null)

  const { data: networkTxns } = await supabase
    .from("transactions")
    .select("id, customer_id, base_amount, created_at")
    .in("customer_id", networkIds)
    .gte("created_at", twentyFourHoursAgo)

  if (!networkTxns || networkTxns.length < 3) {
    return results
  }

  // Calculate total amount
  const totalAmount = networkTxns.reduce((sum, t) => sum + t.base_amount, 0)

  // Check if threshold exceeded
  if (totalAmount > 10000) {
    // Count transactions per customer (filter out null customer_id)
    const txnCounts = new Map<string, number>()
    for (const txn of networkTxns) {
      if (txn.customer_id) {
        txnCounts.set(
          txn.customer_id,
          (txnCounts.get(txn.customer_id) || 0) + 1
        )
      }
    }

    // Filter for customers with >2 transactions
    const activeCustomers = Array.from(txnCounts.entries()).filter(
      ([, count]) => count > 2
    )

    if (activeCustomers.length >= 2) {
      results.push({
        patternType: "group_transaction",
        severity: "HIGH",
        description: `Potential group transaction: ${activeCustomers.length} related customers made ${networkTxns.length} transactions totaling £${totalAmount.toFixed(2)} in 24 hours`,
        scoreImpact: 35,
        relatedTransactionIds: networkTxns.map((t) => t.id),
        metadata: {
          network_size: network.size - 1,
          active_customer_count: activeCustomers.length,
          total_amount: totalAmount,
          transaction_count: networkTxns.length,
          time_window_hours: 24,
        },
      })
    }
  }

  return results
}
