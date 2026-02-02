/**
 * Customer Linker - Detects relationships between customers for compliance analysis
 *
 * This module analyzes customer data to find potential connections between customers
 * that may indicate:
 * - Structuring (multiple related customers making similar transactions)
 * - Group transactions (coordinated activity)
 * - Shared identities (same ID, address, phone)
 *
 * @module lib/compliance/customer-linker
 */

import { createClient } from "@/utils/supabase/server"
import type {
  CustomerRelationship,
  CustomerRelationshipInsert,
  CustomerRelationshipType,
  Json,
} from "@/types"
import { createCustomerRelationship } from "@/lib/queries/customers"

/**
 * Link detection result
 */
export interface LinkDetectionResult {
  relationship_type: CustomerRelationshipType
  customer_a_id: string
  customer_b_id: string
  confidence_score: number
  evidence: Json
}

/**
 * Find existing relationships for a customer
 *
 * @param customerId - The customer ID
 * @returns List of existing relationships
 */
export async function findExistingRelationships(
  customerId: string
): Promise<CustomerRelationship[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("customer_relationships")
    .select("*")
    .or(`customer_a_id.eq.${customerId},customer_b_id.eq.${customerId}`)

  return data || []
}

/**
 * Find customers with matching ID number
 *
 * @param customerId - The customer to find matches for
 * @returns List of matching customer IDs
 */
export async function findCustomersWithSameId(
  customerId: string
): Promise<LinkDetectionResult[]> {
  const supabase = await createClient()

  // Get the customer's encrypted ID number
  const { data: customer } = await supabase
    .from("customers")
    .select("id_number_bytea")
    .eq("id", customerId)
    .single()

  if (!customer) {
    return []
  }

  // Find other customers with same ID
  const { data: matches } = await supabase
    .from("customers")
    .select("id")
    .eq("id_number_bytea", customer.id_number_bytea)
    .neq("id", customerId)

  if (!matches || matches.length === 0) {
    return []
  }

  return matches.map((match) => ({
    relationship_type: "same_id",
    customer_a_id: customerId,
    customer_b_id: match.id,
    confidence_score: 100, // Same ID = 100% confidence
    evidence: { match_type: "identical_id_number" },
  }))
}

/**
 * Find customers with matching address
 *
 * @param customerId - The customer to find matches for
 * @returns List of matching customer IDs with confidence scores
 */
export async function findCustomersWithSameAddress(
  customerId: string
): Promise<LinkDetectionResult[]> {
  const supabase = await createClient()

  // Get the customer's encrypted address
  const { data: customer } = await supabase
    .from("customers")
    .select("address_bytea")
    .eq("id", customerId)
    .single()

  if (!customer || !customer.address_bytea) {
    return []
  }

  // Find other customers with same address
  const { data: matches } = await supabase
    .from("customers")
    .select("id, address_bytea")
    .not("address_bytea", "is", null)
    .neq("id", customerId)

  if (!matches) {
    return []
  }

  // Compare encrypted addresses
  const results: LinkDetectionResult[] = []

  for (const match of matches) {
    if (match.address_bytea === customer.address_bytea) {
      results.push({
        relationship_type: "same_address",
        customer_a_id: customerId,
        customer_b_id: match.id,
        confidence_score: 90, // Same address = high confidence
        evidence: { match_type: "identical_address" },
      })
    }
  }

  return results
}

/**
 * Find customers with matching phone number
 *
 * @param customerId - The customer to find matches for
 * @returns List of matching customer IDs with confidence scores
 */
export async function findCustomersWithSamePhone(
  customerId: string
): Promise<LinkDetectionResult[]> {
  const supabase = await createClient()

  // Get the customer's encrypted phone
  const { data: customer } = await supabase
    .from("customers")
    .select("phone_bytea")
    .eq("id", customerId)
    .single()

  if (!customer || !customer.phone_bytea) {
    return []
  }

  // Find other customers with same phone
  const { data: matches } = await supabase
    .from("customers")
    .select("id, phone_bytea")
    .neq("id", customerId)

  if (!matches) {
    return []
  }

  // Compare encrypted phone numbers
  const results: LinkDetectionResult[] = []

  for (const match of matches) {
    if (match.phone_bytea === customer.phone_bytea) {
      results.push({
        relationship_type: "same_phone",
        customer_a_id: customerId,
        customer_b_id: match.id,
        confidence_score: 85, // Same phone = high confidence (could be family)
        evidence: { match_type: "identical_phone" },
      })
    }
  }

  return results
}

/**
 * Find customers with linked transactions
 *
 * Looks for customers who have made transactions at the same branch
 * within a short time window (potential group activity)
 *
 * @param customerId - The customer to find matches for
 * @param timeWindowMinutes - Time window in minutes (default: 60)
 * @returns List of potentially linked customers
 */
export async function findCustomersWithLinkedTransactions(
  customerId: string,
  timeWindowMinutes: number = 60
): Promise<LinkDetectionResult[]> {
  const supabase = await createClient()

  // Get the customer's recent transactions
  const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString()

  const { data: transactions } = await supabase
    .from("transactions")
    .select("branch_id, created_at, completed_at")
    .eq("customer_id", customerId)
    .gte("created_at", timeWindow)
    .order("created_at", { ascending: false })
    .limit(20)

  if (!transactions || transactions.length === 0) {
    return []
  }

  // For each transaction, find other customers who transacted at the same branch around the same time
  const results: LinkDetectionResult[] = []
  const processedPairs = new Set<string>()

  for (const txn of transactions) {
    const txnTime = new Date(txn.created_at)
    const windowStart = new Date(txnTime.getTime() - 30 * 60 * 1000).toISOString() // 30 min before
    const windowEnd = new Date(txnTime.getTime() + 30 * 60 * 1000).toISOString() // 30 min after

    // Find other customers' transactions in this window
    const { data: nearbyTxns } = await supabase
      .from("transactions")
      .select("customer_id")
      .eq("branch_id", txn.branch_id)
      .not("customer_id", "is", null)
      .neq("customer_id", customerId)
      .gte("created_at", windowStart)
      .lte("created_at", windowEnd)

    if (!nearbyTxns) {
      continue
    }

    // Group by customer
    const customerCounts = new Map<string, number>()
    for (const nearbyTxn of nearbyTxns) {
      if (nearbyTxn.customer_id) {
        customerCounts.set(
          nearbyTxn.customer_id,
          (customerCounts.get(nearbyTxn.customer_id) || 0) + 1
        )
      }
    }

    // Create relationships for customers with multiple nearby transactions
    for (const [otherCustomerId, count] of customerCounts.entries()) {
      // Avoid duplicates
      const pairKey = [customerId, otherCustomerId].sort().join("-")
      if (processedPairs.has(pairKey)) {
        continue
      }
      processedPairs.add(pairKey)

      if (count >= 2) {
        // Confidence based on number of overlapping transactions
        // Confidence based on number of overlapping transactions
        const confidenceScore = Math.min(50 + count * 10, 80)

        results.push({
          relationship_type: "linked_transactions",
          customer_a_id: customerId,
          customer_b_id: otherCustomerId,
          confidence_score: confidenceScore,
          evidence: {
            match_type: "concurrent_transactions",
            overlapping_txn_count: count,
            time_window_minutes: timeWindowMinutes,
          },
        })
      }
    }
  }

  return results
}

/**
 * Run all link detection algorithms for a customer
 *
 * @param customerId - The customer to analyze
 * @param timeWindowMinutes - Time window for transaction linking
 * @returns All detected relationships
 */
export async function detectAllRelationships(
  customerId: string,
  timeWindowMinutes: number = 60
): Promise<LinkDetectionResult[]> {
  const results: LinkDetectionResult[] = []

  // Run all detection algorithms
  const [sameId, sameAddress, samePhone, linkedTxns] = await Promise.all([
    findCustomersWithSameId(customerId),
    findCustomersWithSameAddress(customerId),
    findCustomersWithSamePhone(customerId),
    findCustomersWithLinkedTransactions(customerId, timeWindowMinutes),
  ])

  results.push(...sameId, ...sameAddress, ...samePhone, ...linkedTxns)

  // Deduplicate by customer pair, keeping highest confidence relationship
  const uniqueResults = new Map<string, LinkDetectionResult>()

  for (const result of results) {
    const pairKey = [result.customer_a_id, result.customer_b_id].sort().join("-")
    const existing = uniqueResults.get(pairKey)

    if (!existing || result.confidence_score > existing.confidence_score) {
      uniqueResults.set(pairKey, result)
    }
  }

  return Array.from(uniqueResults.values())
}

/**
 * Create detected relationships in the database
 *
 * @param customerId - The customer to process
 * @param detectedBy - Staff ID who triggered the detection
 * @returns Created relationships
 */
export async function createDetectedRelationships(
  customerId: string,
  detectedBy?: string
): Promise<CustomerRelationship[]> {
  // Detect all relationships
  const detected = await detectAllRelationships(customerId)

  if (detected.length === 0) {
    return []
  }

  // Get existing relationships to avoid duplicates
  const existing = await findExistingRelationships(customerId)
  const existingPairs = new Set(
    existing.map((r) => [r.customer_a_id, r.customer_b_id].sort().join("-"))
  )

  // Create new relationships
  const created: CustomerRelationship[] = []

  for (const detection of detected) {
    const pairKey = [detection.customer_a_id, detection.customer_b_id].sort().join("-")

    if (existingPairs.has(pairKey)) {
      continue // Already exists
    }

    const relationship: CustomerRelationshipInsert = {
      customer_a_id: detection.customer_a_id,
      customer_b_id: detection.customer_b_id,
      relationship_type: detection.relationship_type,
      confidence_score: detection.confidence_score,
      evidence: detection.evidence,
      detected_by: detectedBy || null,
    }

    const relationshipResult = await createCustomerRelationship(relationship)

    if (relationshipResult.success && relationshipResult.data) {
      created.push(relationshipResult.data)
    }
  }

  return created
}

/**
 * Get all customers related to a given customer (transitive closure)
 *
 * @param customerId - The starting customer
 * @param maxDepth - Maximum relationship depth to traverse (default: 3)
 * @returns Set of all related customer IDs
 */
export async function getRelatedCustomerNetwork(
  customerId: string,
  maxDepth: number = 3
): Promise<Set<string>> {
  const visited = new Set<string>([customerId])
  const queue: Array<{ customerId: string; depth: number }> = [
    { customerId, depth: 0 },
  ]

  while (queue.length > 0) {
    const { customerId: current, depth } = queue.shift()!

    if (depth >= maxDepth) {
      continue
    }

    // Get direct relationships
    const relationships = await findExistingRelationships(current)

    for (const rel of relationships) {
      const otherId =
        rel.customer_a_id === current ? rel.customer_b_id : rel.customer_a_id

      if (!visited.has(otherId)) {
        visited.add(otherId)
        queue.push({ customerId: otherId, depth: depth + 1 })
      }
    }
  }

  return visited
}

/**
 * Analyze a customer's network for compliance risks
 *
 * @param customerId - The customer to analyze
 * @returns Network analysis results
 */
export async function analyzeCustomerNetwork(
  customerId: string
): Promise<{
  networkSize: number
  highRiskMembers: number
  watchlistMembers: number
  relationshipTypes: Record<string, number>
}> {
  const supabase = await createClient()

  // Get network
  const network = await getRelatedCustomerNetwork(customerId, 3)
  const networkSize = network.size - 1 // Exclude the customer themselves

  // Get risk data for network members
  const { data: members } = await supabase
    .from("customers")
    .select("risk_level, is_on_watchlist")
    .in("id", Array.from(network))

  const highRiskMembers =
    members?.filter((m) => m.risk_level === "HIGH" || m.risk_level === "CRITICAL")
      .length || 0
  const watchlistMembers =
    members?.filter((m) => m.is_on_watchlist).length || 0

  // Get relationship types
  const relationships = await findExistingRelationships(customerId)
  const relationshipTypes: Record<string, number> = {}

  for (const rel of relationships) {
    relationshipTypes[rel.relationship_type] =
      (relationshipTypes[rel.relationship_type] || 0) + 1
  }

  return {
    networkSize,
    highRiskMembers,
    watchlistMembers,
    relationshipTypes,
  }
}
