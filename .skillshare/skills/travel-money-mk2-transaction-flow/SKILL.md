name: transaction-flow
description: Transaction submission flow for travel-money-mk2 - reference generation, drawer sessions, currency exchange patterns
targets: [claude]
user-invocable: false

# Transaction Flow Pattern

This skill covers the currency exchange transaction flow in the travel-money-mk2 POS system.

## Overview

A transaction involves:
1. Active drawer session must be open
2. Customer selects currency and amount
3. System calculates exchange rate
4. Cash denominations are counted (if cash payment)
5. Transaction is recorded with audit trail
6. Receipt is generated

## Transaction Reference Format

```
TXN-{BRANCH}-{YYYYMMDD}-{SEQ}
```

Example: `TXN-LON-20250314-0001`

Components:
- **TXN**: Literal prefix
- **BRANCH**: 3-letter branch code (e.g., LON, MAN, EDI)
- **YYYYMMDD**: Transaction date
- **SEQ**: 4-digit sequence number (per branch per day)

## Drawer Session Requirement

Every transaction requires an **active drawer session**.

```typescript
// Check for active drawer session
const { data: session, error: sessionError } = await supabase
  .from('drawer_sessions')
  .select('id, opening_float_gbp')
  .eq('operator_id', staff.id)
  .eq('status', 'open')
  .single()

if (sessionError || !session) {
  return { error: 'No active drawer session. Please open a till first.' }
}
```

## Transaction Types

### Buy Transaction
Bureau **buys** foreign currency FROM customer (customer sells to bureau).
- Customer gives foreign currency
- Bureau pays GBP to customer
- Uses **buy rate** (lower rate)

### Sell Transaction
Bureau **sells** foreign currency TO customer.
- Customer pays GBP to bureau
- Bureau gives foreign currency to customer
- Uses **sell rate** (higher rate)

## Transaction Draft Structure

```typescript
type TransactionDraft = {
  type: 'buy' | 'sell';           // Buy or sell
  currency_code: string;          // ISO code (USD, EUR, etc.)
  foreign_amount: number;         // Foreign currency amount
  base_amount: number;            // GBP amount
  exchange_rate: number;          // Rate used for calculation
  rate_id?: string;               // Reference to exchange_rates table
  customer?: {
    first_name?: string;
    last_name?: string;
    address_line_1?: string;
    city?: string;
    postcode?: string;
    id_type?: string;
    id_reference?: string;
  };
  payment_method?: 'cash' | 'card';
  denominations: Array<{
    denomination_id: string;
    count: number;
  }>;
}
```

## Complete Transaction Submission

```typescript
'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function submitTransaction(draft: TransactionDraft) {
  const supabase = await createClient()

  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  // 2. Get staff profile with branch
  const { data: staff, error: staffError } = await supabase
    .from('staff_profiles')
    .select('id, branch_id, branches(code)')
    .eq('id', user.id)
    .single()

  if (staffError || !staff) return { error: 'Staff profile not found' }

  // 3. Get branch code
  const branchCode = staff.branches?.code || 'UNK'

  // 4. Verify active drawer session
  const { data: session, error: sessionError } = await supabase
    .from('drawer_sessions')
    .select('id')
    .eq('operator_id', staff.id)
    .eq('status', 'open')
    .single()

  if (sessionError || !session) {
    return { error: 'No active drawer session. Please open a till first.' }
  }

  // 5. Generate reference number
  const referenceDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const referenceRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  const referenceNumber = `TXN-${branchCode}-${referenceDate}-${referenceRandom}`

  // 6. Insert transaction
  const { data: transaction, error: txnError } = await supabase
    .from('transactions')
    .insert({
      branch_id: staff.branch_id,
      operator_id: staff.id,
      drawer_session_id: session.id,
      transaction_type: draft.type,
      foreign_currency_code: draft.currency_code,
      foreign_amount: draft.foreign_amount,
      base_amount: draft.base_amount,
      base_currency_code: 'GBP',
      rate_used: draft.exchange_rate,
      status: 'completed',
      reference_number: referenceNumber,
      customer_name: draft.customer
        ? `${draft.customer.first_name || ''} ${draft.customer.last_name || ''}`.trim()
        : null,
    })
    .select()
    .single()

  if (txnError) {
    console.error('Transaction Error:', txnError)
    return { error: 'Failed to record transaction' }
  }

  // 7. Record denomination counts (if cash)
  if (draft.denominations?.length > 0) {
    const { error: denomError } = await supabase
      .from('drawer_denomination_counts')
      .insert(
        draft.denominations.map(d => ({
          drawer_session_id: session.id,
          denomination_id: d.denomination_id,
          quantity: d.count,
          count_type: 'transaction',
        }))
      )

    if (denomError) {
      console.error('Denomination Error:', denomError)
      // Log but don't fail transaction
    }
  }

  // 8. Revalidate
  revalidatePath('/operator')

  return { success: true, transactionId: transaction.id }
}
```

## Rate Calculation

```typescript
// For SELL transactions (customer buys foreign)
baseAmount = foreignAmount / sellRate

// For BUY transactions (customer sells foreign)
baseAmount = foreignAmount * buyRate
```

## Void/Refund Flow

Only supervisors and higher can void/refund:

```typescript
async function voidTransaction(transactionId: string, reason: string) {
  // 1. Verify role
  if (!hasRoleOrHigher(staff.role, 'supervisor')) {
    return { error: 'Insufficient permissions' }
  }

  // 2. Update transaction status
  const { error } = await supabase
    .from('transactions')
    .update({
      status: 'voided',
      voided_by: staff.id,
      voided_at: new Date().toISOString(),
      void_reason: reason,
    })
    .eq('id', transactionId)

  // 3. Record in audit log
  await supabase.from('transaction_audit_log').insert({
    transaction_id: transactionId,
    action: 'void',
    performed_by: staff.id,
    details: { reason },
  })
}
```

## Audit Trail

Every transaction mutation creates an audit log entry:

```typescript
await supabase.from('transaction_audit_log').insert({
  transaction_id: transaction.id,
  action: 'create', // or 'void', 'refund'
  performed_by: staff.id,
  details: {
    type: draft.type,
    foreign_amount: draft.foreign_amount,
    base_amount: draft.base_amount,
  },
})
```

## Related Tables

| Table | Relationship |
|-------|--------------|
| `drawer_sessions` | Transaction links to active session |
| `drawer_denomination_counts` | Cash counted during transaction |
| `transaction_audit_log` | Every change logged here |
| `exchange_rates` | Rate used is recorded for traceability |
| `staff_profiles` | Operator who processed transaction |

## Key Rules

1. **No drawer session = no transaction** - always check first
2. **Reference numbers must be unique** - use branch + date + sequence
3. **All changes audited** - write to transaction_audit_log
4. **Void/refund requires supervisor+** - enforce via role check
5. **Denominations for cash only** - card payments skip denomination counting
