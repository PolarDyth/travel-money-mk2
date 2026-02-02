/**
 * Suspicious Transaction Detection Engine
 *
 * Orchestrates pattern detection for suspicious transactions.
 * Runs various pattern detectors and generates compliance alerts when patterns are found.
 *
 * @module lib/compliance/detection-engine
 */

import { createClient } from "@/utils/supabase/server"
import type { Transaction, SuspiciousPattern, CustomerRiskFactorType, PatternSeverity } from "@/types"
import type { Json } from "@/types"
import {
  detectStructuringPattern,
  detectVelocityPattern,
  detectBackToBackPattern,
  detectGroupTransactionPattern,
  detectUnusualBehaviorPattern,
} from "./patterns"
import { addCustomerRiskFactor } from "@/lib/queries/customers"

/**
 * Detection result from a pattern detector
 */
export interface DetectionResult {
  patternType: CustomerRiskFactorType
  severity: PatternSeverity
  description: string
  scoreImpact: number
  relatedTransactionIds: string[]
  metadata?: Json
}

/**
 * Detection configuration
 */
export interface DetectionConfig {
  customerId: string
  transactionId: string
  branchId: string
  baseAmount: number
  foreignCurrencyCode: string
  transactionType: "buy" | "sell"
  timestamp?: Date
}

/**
 * Run all pattern detectors for a transaction
 *
 * @param config - Detection configuration
 * @returns All detections found (may be empty)
 */
export async function detectSuspiciousPatterns(
  config: DetectionConfig
): Promise<DetectionResult[]> {
  const detections: DetectionResult[] = []

  // Get customer transaction history
  const supabase = await createClient()
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("customer_id", config.customerId)
    .eq("branch_id", config.branchId)
    .order("created_at", { ascending: false })
    .limit(100)

  const customerTransactions = (transactions || []) as Transaction[]

  // Run each pattern detector
  const [structuring, velocity, backToBack, group, unusual] = await Promise.all([
    detectStructuringPattern(config, customerTransactions),
    detectVelocityPattern(config, customerTransactions),
    detectBackToBackPattern(config, customerTransactions),
    detectGroupTransactionPattern(config),
    detectUnusualBehaviorPattern(config, customerTransactions),
  ])

  detections.push(...structuring, ...velocity, ...backToBack, ...group, ...unusual)

  return detections
}

/**
 * Process detections and create appropriate records
 *
 * @param customerId - The customer ID
 * @param detections - Detections to process
 * @returns Number of risk factors created
 */
export async function processDetections(
  customerId: string,
  detections: DetectionResult[]
): Promise<number> {
  if (detections.length === 0) {
    return 0
  }

  let createdCount = 0

  for (const detection of detections) {
    const factorResult = await addCustomerRiskFactor({
      customer_id: customerId,
      factor_type: detection.patternType,
      severity: detection.severity,
      score_impact: detection.scoreImpact,
      description: detection.description,
      related_transaction_ids: detection.relatedTransactionIds,
      metadata: detection.metadata,
    })

    if (factorResult.success) {
      createdCount++
    }
  }

  return createdCount
}

/**
 * Check if a transaction should be blocked based on detected patterns
 *
 * @param detections - Detections to check
 * @returns Whether transaction should be blocked and reason
 */
export function shouldBlockTransaction(
  detections: DetectionResult[]
): { block: boolean; reason?: string } {
  const criticalDetections = detections.filter((d) => d.severity === "HIGH")

  if (criticalDetections.length > 0) {
    const reasons = criticalDetections.map((d) => d.description)
    return {
      block: true,
      reason: `Suspicious activity detected: ${reasons.join("; ")}`,
    }
  }

  return { block: false }
}

/**
 * Generate a compliance alert for detected patterns
 *
 * @param branchId - The branch ID
 * @param transactionId - The transaction ID
 * @param detections - Detections to create alerts for
 */
export async function generateComplianceAlerts(
  branchId: string,
  transactionId: string,
  detections: DetectionResult[]
): Promise<void> {
  if (detections.length === 0) {
    return
  }

  const supabase = await createClient()

  // Group by severity
  const highSeverity = detections.filter((d) => d.severity === "HIGH")
  const mediumSeverity = detections.filter((d) => d.severity === "MEDIUM")
  const lowSeverity = detections.filter((d) => d.severity === "LOW")

  // Create alert for each severity level (consolidate multiple detections)
  if (highSeverity.length > 0) {
    await supabase.from("compliance_alerts").insert({
      branch_id: branchId,
      transaction_id: transactionId,
      alert_type: "suspicious_pattern",
      severity: "HIGH",
      description: `High-risk patterns detected: ${highSeverity.map((d) => d.description).join(", ")}`,
    })
  } else if (mediumSeverity.length > 0) {
    await supabase.from("compliance_alerts").insert({
      branch_id: branchId,
      transaction_id: transactionId,
      alert_type: "suspicious_pattern",
      severity: "MEDIUM",
      description: `Medium-risk patterns detected: ${mediumSeverity.map((d) => d.description).join(", ")}`,
    })
  }

  // Low severity patterns don't create immediate alerts but are logged
  if (lowSeverity.length > 0) {
    console.info(`Low-risk patterns detected for transaction ${transactionId}:`, lowSeverity)
  }
}

/**
 * Main detection function - run full detection pipeline
 *
 * @param config - Detection configuration
 * @returns Detection results and whether to block
 */
export async function runDetectionPipeline(
  config: DetectionConfig
): Promise<{
  detections: DetectionResult[]
  shouldBlock: boolean
  blockReason?: string
  riskFactorsCreated: number
}> {
  // Run all pattern detectors
  const detections = await detectSuspiciousPatterns(config)

  // Process detections into risk factors
  const riskFactorsCreated = await processDetections(config.customerId, detections)

  // Check if transaction should be blocked
  const { block, reason } = shouldBlockTransaction(detections)

  // Generate compliance alerts
  if (detections.length > 0) {
    await generateComplianceAlerts(config.branchId, config.transactionId, detections)
  }

  return {
    detections,
    shouldBlock: block,
    blockReason: reason,
    riskFactorsCreated,
  }
}

/**
 * Get active detection patterns for a branch
 *
 * @param branchId - The branch ID (null for global patterns)
 * @returns Active suspicious patterns
 */
export async function getActivePatterns(
  branchId?: string
): Promise<SuspiciousPattern[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("active_suspicious_patterns")
    .select("*")
    .eq("is_active", true)
    .or(branchId ? `branch_id.eq.${branchId},branch_id.is.null` : "branch_id.is.null")

  return (data || []) as unknown as SuspiciousPattern[]
}

/**
 * Custom detection result with additional context
 */
export interface EnhancedDetectionResult extends DetectionResult {
  patternId?: string
  patternName?: string
  branchSpecific?: boolean
}

/**
 * Run detection with custom patterns from database
 *
 * @param config - Detection configuration
 * @returns Enhanced detection results with pattern metadata
 */
export async function runDetectionWithCustomPatterns(
  config: DetectionConfig
): Promise<EnhancedDetectionResult[]> {
  // Get active patterns for branch
  const activePatterns = await getActivePatterns(config.branchId)

  // Run standard detection
  const standardDetections = await detectSuspiciousPatterns(config)

  // Enhance with pattern metadata
  const enhanced: EnhancedDetectionResult[] = standardDetections.map((d) => {
    const matchingPattern = activePatterns.find(
      (p) => p.pattern_type === d.patternType
    )

    return {
      ...d,
      patternId: matchingPattern?.id,
      patternName: matchingPattern?.name,
      branchSpecific: matchingPattern?.branch_id !== null,
    }
  })

  return enhanced
}
