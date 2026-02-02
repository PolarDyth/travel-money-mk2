/**
 * Unit tests for velocity pattern detector
 */

import { describe, it, expect } from 'vitest'
import type { Transaction } from '@/types'
import { detectVelocityPattern } from '../velocity'
import { DetectionConfig } from '../../detection-engine'

describe('Velocity Pattern Detector', () => {
  const mockConfig: DetectionConfig = {
    customerId: 'customer-1',
    transactionId: 'txn-1',
    branchId: 'branch-1',
    baseAmount: 1000,
    foreignCurrencyCode: 'USD',
    transactionType: 'sell',
    timestamp: new Date('2024-01-15T12:00:00Z'),
  }

  const createTransaction = (
    id: string,
    minutesAgo: number
  ): Transaction => {
    const configTime = mockConfig.timestamp ? mockConfig.timestamp.getTime() : Date.now()
    const txnTime = new Date(configTime - minutesAgo * 60 * 1000)
    return {
      id,
      reference: `TXN-BRN1-20240115-${id}`,
      branch_id: 'branch-1',
      customer_id: 'customer-1',
      transaction_type: 'sell',
      base_currency_code: 'GBP',
      foreign_currency_code: 'USD',
      base_amount: 500,
      foreign_amount: 625,
      rate: 1.25,
      status: 'completed',
      created_at: txnTime.toISOString(),
      completed_at: new Date(txnTime.getTime() + 300000).toISOString(),
    }
  }

  it('should detect HIGH severity with >50 transactions in 30 days', async () => {
    const history: Transaction[] = []
    // Create 51 transactions spread over 30 days
    for (let i = 0; i < 51; i++) {
      const daysAgo = Math.floor(i * 0.6) // Spread over ~30 days
      const minutesAgo = daysAgo * 24 * 60
      history.push(createTransaction(`txn-${i}`, minutesAgo))
    }

    const results = await detectVelocityPattern(mockConfig, history)

    const highSeverity = results.filter((r) => r.severity === 'HIGH')
    expect(highSeverity).toHaveLength(1)
    expect(highSeverity[0].patternType).toBe('velocity')
    expect(highSeverity[0].scoreImpact).toBe(30)
    expect(highSeverity[0].description).toContain('51 transactions')
    expect(highSeverity[0].metadata?.transaction_count).toBe(51)
  })

  it('should detect MEDIUM severity with >10 transactions in 1 day', async () => {
    const history: Transaction[] = []
    // Create 11 transactions within 24 hours
    for (let i = 0; i < 11; i++) {
      const hoursAgo = i * 2
      history.push(createTransaction(`txn-${i}`, hoursAgo * 60))
    }

    const results = await detectVelocityPattern(mockConfig, history)

    const mediumSeverity = results.filter((r) => r.severity === 'MEDIUM')
    expect(mediumSeverity).toHaveLength(1)
    expect(mediumSeverity[0].description).toContain('11 transactions')
    expect(mediumSeverity[0].metadata?.transaction_count).toBe(11)
  })

  it('should detect LOW severity with >5 transactions in 1 hour', async () => {
    const history: Transaction[] = []
    // Create 6 transactions within 1 hour
    for (let i = 0; i < 6; i++) {
      history.push(createTransaction(`txn-${i}`, i * 10))
    }

    const results = await detectVelocityPattern(mockConfig, history)

    const lowSeverity = results.filter((r) => r.severity === 'LOW')
    expect(lowSeverity).toHaveLength(1)
    expect(lowSeverity[0].description).toContain('6 transactions')
    expect(lowSeverity[0].metadata?.transaction_count).toBe(6)
  })

  it('should not flag LOW severity if already flagged as MEDIUM', async () => {
    const history: Transaction[] = []
    // Create 11 transactions within 24 hours, with 6 in the last hour
    for (let i = 0; i < 11; i++) {
      history.push(createTransaction(`txn-${i}`, i * 2 * 60)) // Every 2 hours
    }

    const results = await detectVelocityPattern(mockConfig, history)

    const severities = results.map((r) => r.severity)
    expect(severities).toContain('MEDIUM')
    expect(severities).not.toContain('LOW')
  })

  it('should not flag MEDIUM severity if already flagged as HIGH', async () => {
    const history: Transaction[] = []
    // Create 51 transactions over 30 days
    for (let i = 0; i < 51; i++) {
      const daysAgo = Math.floor(i * 0.6)
      history.push(createTransaction(`txn-${i}`, daysAgo * 24 * 60))
    }

    const results = await detectVelocityPattern(mockConfig, history)

    const severities = results.map((r) => r.severity)
    expect(severities).toContain('HIGH')
    expect(severities).not.toContain('MEDIUM')
    expect(severities).not.toContain('LOW')
  })

  it('should not flag velocity with 5 or fewer transactions in 1 hour', async () => {
    const history: Transaction[] = []
    for (let i = 0; i < 5; i++) {
      history.push(createTransaction(`txn-${i}`, i * 10))
    }

    const results = await detectVelocityPattern(mockConfig, history)

    expect(results).toHaveLength(0)
  })

  it('should not flag velocity with 10 or fewer transactions in 1 day', async () => {
    const history: Transaction[] = []
    for (let i = 0; i < 10; i++) {
      history.push(createTransaction(`txn-${i}`, i * 2 * 60))
    }

    const results = await detectVelocityPattern(mockConfig, history)

    expect(results).toHaveLength(0)
  })

  it('should not flag velocity with 50 or fewer transactions in 30 days', async () => {
    const history: Transaction[] = []
    for (let i = 0; i < 50; i++) {
      const daysAgo = i * 0.6
      history.push(createTransaction(`txn-${i}`, daysAgo * 24 * 60))
    }

    const results = await detectVelocityPattern(mockConfig, history)

    expect(results).toHaveLength(0)
  })

  it('should limit related transaction IDs', async () => {
    const history: Transaction[] = []
    for (let i = 0; i < 55; i++) {
      history.push(createTransaction(`txn-${i}`, i * 60))
    }

    const results = await detectVelocityPattern(mockConfig, history)

    const highSeverity = results.find((r) => r.severity === 'HIGH')
    expect(highSeverity?.relatedTransactionIds).toHaveLength(50) // Limited to 50
  })

  it('should handle empty history', async () => {
    const results = await detectVelocityPattern(mockConfig, [])

    expect(results).toHaveLength(0)
  })
})
