/**
 * Unit tests for structuring pattern detector
 */

import { describe, it, expect } from 'vitest'
import type { Transaction } from '@/types'
import { detectStructuringPattern } from '../structuring'
import { DetectionConfig } from '../../detection-engine'

describe('Structuring Pattern Detector', () => {
  const mockConfig: DetectionConfig = {
    customerId: 'customer-1',
    transactionId: 'txn-1',
    branchId: 'branch-1',
    baseAmount: 8500,
    foreignCurrencyCode: 'USD',
    transactionType: 'sell',
    timestamp: new Date('2024-01-15T12:00:00Z'),
  }

  const mockHistory: Transaction[] = [
    {
      id: 'txn-1',
      reference: 'TXN-BRN1-20240115-00000001',
      branch_id: 'branch-1',
      customer_id: 'customer-1',
      transaction_type: 'sell',
      base_currency_code: 'GBP',
      foreign_currency_code: 'USD',
      base_amount: 8500,
      foreign_amount: 10625,
      rate: 1.25,
      status: 'completed',
      created_at: '2024-01-15T12:00:00Z',
      completed_at: '2024-01-15T12:05:00Z',
    },
    {
      id: 'txn-2',
      reference: 'TXN-BRN1-20240110-00000002',
      branch_id: 'branch-1',
      customer_id: 'customer-1',
      transaction_type: 'sell',
      base_currency_code: 'GBP',
      foreign_currency_code: 'USD',
      base_amount: 9000,
      foreign_amount: 11250,
      rate: 1.25,
      status: 'completed',
      created_at: '2024-01-10T14:00:00Z',
      completed_at: '2024-01-10T14:05:00Z',
    },
    {
      id: 'txn-3',
      reference: 'TXN-BRN1-20240105-00000003',
      branch_id: 'branch-1',
      customer_id: 'customer-1',
      transaction_type: 'sell',
      base_currency_code: 'GBP',
      foreign_currency_code: 'USD',
      base_amount: 8750,
      foreign_amount: 10937.5,
      rate: 1.25,
      status: 'completed',
      created_at: '2024-01-05T10:00:00Z',
      completed_at: '2024-01-05T10:05:00Z',
    },
    // Transaction outside structuring range
    {
      id: 'txn-4',
      reference: 'TXN-BRN1-20231201-00000004',
      branch_id: 'branch-1',
      customer_id: 'customer-1',
      transaction_type: 'sell',
      base_currency_code: 'GBP',
      foreign_currency_code: 'EUR',
      base_amount: 5000,
      foreign_amount: 5750,
      rate: 1.15,
      status: 'completed',
      created_at: '2023-12-01T10:00:00Z',
      completed_at: '2023-12-01T10:05:00Z',
    },
  ]

  it('should detect structuring pattern with 3+ transactions in structuring range', async () => {
    const results = await detectStructuringPattern(mockConfig, mockHistory)

    expect(results).toHaveLength(1)
    expect(results[0].patternType).toBe('structuring')
    expect(results[0].severity).toBe('HIGH')
    expect(results[0].scoreImpact).toBe(40)
    expect(results[0].description).toContain('Potential structuring detected')
    expect(results[0].description).toContain('3 transactions between £8,000-£9,999')
    expect(results[0].relatedTransactionIds).toHaveLength(3)
  })

  it('should not detect structuring with fewer than 3 transactions', async () => {
    const limitedHistory = mockHistory.slice(0, 2)
    const results = await detectStructuringPattern(mockConfig, limitedHistory)

    expect(results).toHaveLength(0)
  })

  it('should only consider transactions within 30 days', async () => {
    // Set timestamp well beyond 30 days from txn-3 (which is 2024-01-05)
    // 2024-01-05 + 31 days = 2024-02-05
    const oldConfig: DetectionConfig = {
      ...mockConfig,
      timestamp: new Date('2024-02-06T12:00:00Z'), // 32+ days after txn-3
    }

    const results = await detectStructuringPattern(oldConfig, mockHistory)

    // Only txn-1 and txn-2 should be within 30 days, so no structuring (need 3)
    expect(results).toHaveLength(0)
  })

  it('should exclude transactions outside structuring range (£8,000-£9,999)', async () => {
    const historyWithNonStructuring: Transaction[] = [
      ...mockHistory,
      {
        id: 'txn-5',
        reference: 'TXN-BRN1-20240114-00000005',
        branch_id: 'branch-1',
        customer_id: 'customer-1',
        transaction_type: 'sell',
        base_currency_code: 'GBP',
        foreign_currency_code: 'USD',
        base_amount: 12000, // Above structuring range
        foreign_amount: 15000,
        rate: 1.25,
        status: 'completed',
        created_at: '2024-01-14T12:00:00Z',
        completed_at: '2024-01-14T12:05:00Z',
      },
      {
        id: 'txn-6',
        reference: 'TXN-BRN1-20240113-00000006',
        branch_id: 'branch-1',
        customer_id: 'customer-1',
        transaction_type: 'sell',
        base_currency_code: 'GBP',
        foreign_currency_code: 'USD',
        base_amount: 7000, // Below structuring range
        foreign_amount: 8750,
        rate: 1.25,
        status: 'completed',
        created_at: '2024-01-13T12:00:00Z',
        completed_at: '2024-01-13T12:05:00Z',
      },
    ]

    const results = await detectStructuringPattern(mockConfig, historyWithNonStructuring)

    // Should still only detect the 3 original structuring transactions
    expect(results).toHaveLength(1)
    expect(results[0].relatedTransactionIds).toHaveLength(3)
    expect(results[0].relatedTransactionIds).not.toContain('txn-5')
    expect(results[0].relatedTransactionIds).not.toContain('txn-6')
  })

  it('should calculate total structured amount correctly', async () => {
    const results = await detectStructuringPattern(mockConfig, mockHistory)

    expect(results).toHaveLength(1)
    const totalAmount = 8500 + 9000 + 8750
    expect(results[0].metadata?.total_amount).toBe(totalAmount)
    expect(results[0].description).toContain(totalAmount.toFixed(2))
  })

  it('should handle empty history', async () => {
    const results = await detectStructuringPattern(mockConfig, [])

    expect(results).toHaveLength(0)
  })
})
