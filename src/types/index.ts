// Re-export database types
export type { Database, Json, Tables, TablesInsert, TablesUpdate, Enums } from './database'

// Import for internal use
import type { Database } from './database'

// ============================================
// Table Row Types (for reading data)
// ============================================
export type Branch = Database['public']['Tables']['branches']['Row']
export type StaffProfile = Database['public']['Tables']['staff_profiles']['Row']
export type Currency = Database['public']['Tables']['currencies']['Row']
export type CurrencyDenomination = Database['public']['Tables']['currency_denominations']['Row']
export type ExchangeRate = Database['public']['Tables']['exchange_rates']['Row']
export type ExchangeRateHistory = Database['public']['Tables']['exchange_rate_history']['Row']
export type ExchangeRateSettings = Database['public']['Tables']['exchange_rate_settings']['Row']
export type RateOverrideHistory = Database['public']['Tables']['rate_override_history']['Row']
export type DrawerSession = Database['public']['Tables']['drawer_sessions']['Row']
export type DrawerDenominationCount = Database['public']['Tables']['drawer_denomination_counts']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionAuditLog = Database['public']['Tables']['transaction_audit_log']['Row']
export type DailyReconciliation = Database['public']['Tables']['daily_reconciliation']['Row']
export type ComplianceAlert = Database['public']['Tables']['compliance_alerts']['Row']
export type SystemSetting = Database['public']['Tables']['system_settings']['Row']

// ============================================
// Insert Types (for creating new records)
// ============================================
export type BranchInsert = Database['public']['Tables']['branches']['Insert']
export type StaffProfileInsert = Database['public']['Tables']['staff_profiles']['Insert']
export type CurrencyInsert = Database['public']['Tables']['currencies']['Insert']
export type CurrencyDenominationInsert = Database['public']['Tables']['currency_denominations']['Insert']
export type ExchangeRateInsert = Database['public']['Tables']['exchange_rates']['Insert']
export type ExchangeRateSettingsInsert = Database['public']['Tables']['exchange_rate_settings']['Insert']
export type RateOverrideHistoryInsert = Database['public']['Tables']['rate_override_history']['Insert']
export type DrawerSessionInsert = Database['public']['Tables']['drawer_sessions']['Insert']
export type DrawerDenominationCountInsert = Database['public']['Tables']['drawer_denomination_counts']['Insert']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type DailyReconciliationInsert = Database['public']['Tables']['daily_reconciliation']['Insert']
export type ComplianceAlertInsert = Database['public']['Tables']['compliance_alerts']['Insert']
export type SystemSettingInsert = Database['public']['Tables']['system_settings']['Insert']

// ============================================
// Update Types (for modifying records)
// ============================================
export type BranchUpdate = Database['public']['Tables']['branches']['Update']
export type StaffProfileUpdate = Database['public']['Tables']['staff_profiles']['Update']
export type CurrencyUpdate = Database['public']['Tables']['currencies']['Update']
export type CurrencyDenominationUpdate = Database['public']['Tables']['currency_denominations']['Update']
export type ExchangeRateUpdate = Database['public']['Tables']['exchange_rates']['Update']
export type ExchangeRateSettingsUpdate = Database['public']['Tables']['exchange_rate_settings']['Update']
export type RateOverrideHistoryUpdate = Database['public']['Tables']['rate_override_history']['Update']
export type DrawerSessionUpdate = Database['public']['Tables']['drawer_sessions']['Update']
export type DrawerDenominationCountUpdate = Database['public']['Tables']['drawer_denomination_counts']['Update']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']
export type DailyReconciliationUpdate = Database['public']['Tables']['daily_reconciliation']['Update']
export type ComplianceAlertUpdate = Database['public']['Tables']['compliance_alerts']['Update']
export type SystemSettingUpdate = Database['public']['Tables']['system_settings']['Update']

// ============================================
// Enum Types
// ============================================
export type UserRole = Database['public']['Enums']['user_role']
export type TransactionType = Database['public']['Enums']['transaction_type']
export type TransactionStatus = Database['public']['Enums']['transaction_status']
export type DrawerSessionStatus = Database['public']['Enums']['drawer_session_status']
export type DenominationType = Database['public']['Enums']['denomination_type']
export type RateSource = Database['public']['Enums']['rate_source']

export type DenominationCount = {
  denomination_id: string
  count: number
}

// ============================================
// Enum Constants (for runtime use)
// ============================================
export const USER_ROLES = ['operator', 'supervisor', 'manager', 'admin'] as const
export const TRANSACTION_TYPES = ['buy', 'sell'] as const
export const TRANSACTION_STATUSES = ['completed', 'voided', 'refunded'] as const
export const DRAWER_SESSION_STATUSES = ['open', 'closed', 'suspended'] as const
export const DENOMINATION_TYPES = ['note', 'coin'] as const
export const RATE_SOURCES = ['manual', 'feed', 'override'] as const

// ============================================
// Role Hierarchy Helper
// ============================================
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  operator: 1,
  supervisor: 2,
  manager: 3,
  admin: 4,
} as const

export function hasRoleOrHigher(currentRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole]
}

// ============================================
// Currency Editing Feature Types
// ============================================
export type {
  RateOverrideData,
  RateOverrideSource,
  TransactionWithOverride,
  BranchCurrencySettings,
  RateOverrideHistoryWithDetails,
  RateOverrideInput,
  BranchRateInput,
  CurrencySettingsInput,
  DenominationInput,
  CurrencyInput,
  BranchCurrencySettingsResponse,
  RateOverrideHistoryResponse,
  CurrencyManagementData,
  OverrideComplianceMetrics,
} from '@/lib/types/currency-editing'
