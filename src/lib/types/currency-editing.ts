// Currency Editing Feature Types
// These types extend the auto-generated database types

import type {
  ExchangeRateSettings as DBExchangeRateSettings,
  ExchangeRateSettingsInsert as DBExchangeRateSettingsInsert,
  ExchangeRateSettingsUpdate as DBExchangeRateSettingsUpdate,
  RateOverrideHistory as DBRateOverrideHistory,
  RateOverrideHistoryInsert as DBRateOverrideHistoryInsert,
} from '@/types'

// Re-export database types for convenience
export type ExchangeRateSettings = DBExchangeRateSettings
export type ExchangeRateSettingsInsert = DBExchangeRateSettingsInsert
export type ExchangeRateSettingsUpdate = DBExchangeRateSettingsUpdate
export type RateOverrideHistory = DBRateOverrideHistory
export type RateOverrideHistoryInsert = DBRateOverrideHistoryInsert

// ============================================
// Rate Override Types
// ============================================
export type RateOverrideSource = 'standard' | 'supervisor' | 'manager'

export interface RateOverrideData {
  originalRate: number
  overrideRate: number
  reason: string
  approvedBy: string
  source: RateOverrideSource
  variancePercentage: number
}

// ============================================
// Transaction with Override Types
// ============================================
export interface TransactionWithOverride {
  rate_override_reason: string | null
  rate_override_approved_by: string | null
  rate_override_source: RateOverrideSource
}

// ============================================
// Branch Currency Settings with Join Types
// ============================================
export interface BranchCurrencySettings extends ExchangeRateSettings {
  currency_name: string
  currency_symbol: string
  currency_decimal_places: number
  branch_name: string
  branch_code: string
}

// ============================================
// Rate Override History with Join Types
// ============================================
export interface RateOverrideHistoryWithDetails extends RateOverrideHistory {
  transaction_reference: string
  transaction_date: string
  branch_id: string
  branch_name: string
  branch_code: string
  currency_code: string
  currency_name: string
  approved_by_name: string
  approved_by_role: string
}

// ============================================
// Zod Schema Types (for validation)
// ============================================
export interface RateOverrideInput {
  currencyCode: string
  originalRate: number
  overrideRate: number
  reason: string
  acknowledged: boolean
  hasManagerApproval?: boolean
}

export interface BranchRateInput {
  currencyCode: string
  buyRate: number
  sellRate: number
  notes?: string
}

export interface CurrencySettingsInput {
  branchId: string
  currencyCode: string
  isEnabled: boolean
  allowRateOverride: boolean
  maxOverridePercentage?: number
  requireSupervisorApproval: boolean
}

export interface DenominationInput {
  currencyCode: string
  type: 'note' | 'coin'
  value: number
  description?: string
  sortOrder?: number
}

export interface CurrencyInput {
  code: string
  name: string
  symbol: string
  decimalPlaces: number
  minTransactionAmount?: number
  maxTransactionAmount?: number
  requiresIdThreshold?: number
}

// ============================================
// Query Response Types
// ============================================
export interface BranchCurrencySettingsResponse {
  settings: BranchCurrencySettings[]
  total: number
}

export interface RateOverrideHistoryResponse {
  overrides: RateOverrideHistoryWithDetails[]
  total: number
  page: number
  pageSize: number
}

export interface CurrencyManagementData {
  currencies: Array<{
    code: string
    name: string
    symbol: string
    is_active: boolean
    min_transaction_amount: number
    max_transaction_amount: number
    requires_id_threshold: number | null
    decimal_places: number
    branch_enabled: boolean
    branch_has_override: boolean
  }>
}

// ============================================
// Compliance Metrics Types
// ============================================
export interface OverrideComplianceMetrics {
  totalOverrides: number
  overridesByBranch: Array<{
    branchId: string
    branchName: string
    count: number
    averageVariance: number
  }>
  overridesByStaff: Array<{
    staffId: string
    staffName: string
    role: string
    count: number
    averageVariance: number
  }>
  overridesByCurrency: Array<{
    currencyCode: string
    currencyName: string
    count: number
    averageVariance: number
  }>
  highVarianceOverrides: number // >10%
  suspiciousPatterns: Array<{
    type: string
    description: string
    count: number
  }>
}
