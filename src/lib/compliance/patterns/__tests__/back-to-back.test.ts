/**
 * Unit tests for back-to-back pattern detector
 */

import { describe, it, expect } from 'vitest'
import type { Transaction } from '@/types'
import { detectBackToBackPattern } from '../back-to-back'
import { DetectionConfig } from '../../detection-engine'

describe('Back-to-Back Pattern Detector', () => {
  const mockConfig: DetectionConfig = {
    customerId: 'customer-1',
    transactionId: 'txn-1',
    branchId: 'branch-1',
    baseAmount: 6000,
    foreignCurrencyCode: 'USD',
    transactionType: 'sell',
    timestamp: new Date('2024-01-15T12:00:00Z'),
  }

  const createTransaction = (
    id: string,
    minutesAgo: number,
    amount: number,
    currency: string = 'USD'
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
      foreign_currency_code: currency,
      base_amount: amount,
      foreign_amount: amount * 1.25,
      rate: 1.25,
      status: 'completed',
      created_at: txnTime.toISOString(),
      completed_at: new Date(txnTime.getTime() + 300000).toISOString(),
    }
  }

  it('should detect back-to-back transactions with same currency, close time, high amount', async () => {
    const history = [
      createTransaction('txn-2', 5, 6000, 'USD'),
      createTransaction('txn-3', 3, 7000, 'USD'),
    ]

    const results = await detectBackToBackPattern(mockConfig, history)

    expect(results).toHaveLength(1)
    expect(results[0].patternType).toBe('back_to_back')
    expect(results[0].severity).toBe('MEDIUM')
    expect(results[0].description).toContain('Back-to-back transactions')
  })

  it('should not flag transactions more than 10 minutes apart', async () => {
    const history = [
      createTransaction('txn-2', 15, 6000, 'USD'),
    ]

    const results = await detectBackToBackPattern(mockConfig, history)

    expect(results).toHaveLength(0)
  })

  it('should not flag transactions below £5000', async () => {
    const history = [
      createTransaction('txn-2', 5, 4000, 'USD'),
    ]

    const results = await detectBackToBackPattern(mockConfig, history)

    expect(results).toHaveLength(0)
  })

  it('should not flag transactions with different currencies', async () => {
    const history = [
      createTransaction('txn-2', 5, 6000, 'EUR'),
    ]

    const results = await detectBackToBackPattern(mockConfig, history)

    expect(results).toHaveLength(0)
  })

  it('should handle empty history', async () => {
    const results = await detectBackToBackPattern(mockConfig, [])

    expect(results).toHaveLength(0)
  })
})
