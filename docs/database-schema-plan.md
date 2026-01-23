# Currency Exchange POS - Supabase Database Schema Plan

## Overview

Comprehensive Supabase database schema for a multi-branch currency exchange POS system. Prioritizes data integrity, security (RLS), auditability, and performance for high-volume retail operations.

---

## Schema Components

### 1. Enum Types (6 total)

| Enum | Values | Purpose |
|------|--------|---------|
| `user_role` | operator, supervisor, manager, admin | Role-based access control |
| `transaction_type` | buy, sell | Bureau buys/sells currency |
| `transaction_status` | completed, voided, refunded | Transaction lifecycle |
| `drawer_session_status` | open, closed, suspended | Cash drawer states |
| `denomination_type` | note, coin | Cash denomination tracking |
| `rate_source` | manual, feed, override | Exchange rate audit |

---

### 2. Tables (13 total)

#### Core Entities

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `branches` | Store locations | code, name, address, timezone |
| `staff_profiles` | Extends auth.users | employee_number, role, branch_id, pin_hash, transaction limits |
| `currencies` | Supported currencies | ISO code (PK), name, symbol, decimal_places, thresholds |
| `currency_denominations` | Notes/coins | currency_code, type, value |

#### Exchange Rates

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `exchange_rates` | Current rates | currency_code, branch_id, buy_rate, sell_rate, effective_from/until |
| `exchange_rate_history` | Immutable audit log | Snapshots of all rate changes |

#### Transactions

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `drawer_sessions` | Till sessions | branch_id, till_number, operator_id, opening/closing floats, variance |
| `drawer_denomination_counts` | Cash counts | session_id, denomination_id, quantity, count_type |
| `transactions` | Exchange records | reference_number, type, status, amounts, rate_used, customer info, void/refund tracking |
| `transaction_audit_log` | Full audit trail | action, performed_by, timestamps, details (JSONB) |

#### Operations & Compliance

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `daily_reconciliation` | End-of-day summary | totals, variance, sign-offs |
| `compliance_alerts` | Regulatory alerts | alert_type, severity, resolution tracking |
| `system_settings` | Configuration | key-value JSONB store |

---

### 3. Table Relationships

```
auth.users ──► staff_profiles ──► branches
                    │                  │
                    │                  ├──► drawer_sessions ──► transactions
                    │                  │                            │
                    │                  │                            └──► transaction_audit_log
                    │                  │
                    │                  ├──► exchange_rates ──► exchange_rate_history
                    │                  │
                    │                  ├──► daily_reconciliation
                    │                  └──► compliance_alerts
                    │
currencies ──► currency_denominations
     │
     └──► exchange_rates
```

---

### 4. RLS Policies (Role-Based Access)

| Role | Branches | Staff | Rates | Transactions | Void/Refund | Reports |
|------|----------|-------|-------|--------------|-------------|---------|
| Operator | View all | View self | View branch | Own only | No | No |
| Supervisor | View all | View branch | View branch | View branch | Yes | Branch |
| Manager | View all | Manage branch | Set branch | View branch | Yes | Branch |
| Admin | Full access | Full access | Full access | Full access | Yes | All |

#### Helper Functions

- `get_current_staff_id()` - Returns authenticated user's staff ID
- `get_current_branch_id()` - Returns authenticated user's branch
- `get_current_role()` - Returns authenticated user's role
- `has_role_or_higher(required_role)` - Role hierarchy check

---

### 5. Triggers & Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `update_updated_at()` | BEFORE UPDATE | Auto-update timestamps |
| `generate_transaction_reference()` | BEFORE INSERT on transactions | Generate TXN-LON001-20240115-0001 format |
| `log_rate_change()` | AFTER INSERT/UPDATE/DELETE on exchange_rates | Immutable rate history |
| `log_transaction_change()` | AFTER INSERT/UPDATE on transactions | Audit trail |
| `get_current_rate(currency, branch)` | N/A | Fetch current rate with branch override |

---

### 6. Critical Indexes

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| exchange_rates | `idx_exchange_rates_current` | Partial (WHERE effective_until IS NULL) | Hot path: current rate lookup |
| transactions | `idx_transactions_daily_report` | Composite (branch, created_at, status) | Daily reports |
| transactions | `idx_transactions_reference` | B-tree | Reference number lookup |
| drawer_sessions | `idx_drawer_sessions_open` | Partial (WHERE status = 'open') | Active session check |
| staff_profiles | `idx_staff_profiles_employee_number` | B-tree | Login lookup |

---

### 7. Constraints

**Data Integrity:**
- `buy_rate <= sell_rate` on exchange_rates (bureau margin)
- `foreign_amount > 0 AND base_amount > 0` on transactions
- Void requires reason and voided_by
- Refund requires original_transaction_id
- Positive float amounts on drawer sessions

**Uniqueness:**
- Single base currency (partial unique index)
- Unique denomination per currency/value
- Unique transaction reference numbers
- Unique daily reconciliation per branch/date

---

## Detailed Table Definitions

### branches

```sql
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,          -- e.g., 'LON-001'
  name VARCHAR(100) NOT NULL,
  address_line_1 VARCHAR(200) NOT NULL,
  address_line_2 VARCHAR(200),
  city VARCHAR(100) NOT NULL,
  postcode VARCHAR(20) NOT NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'GB',
  phone VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true,
  timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/London',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### staff_profiles

```sql
CREATE TABLE staff_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_number VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  role user_role NOT NULL DEFAULT 'operator',
  branch_id UUID NOT NULL REFERENCES branches(id),
  pin_hash VARCHAR(255),                     -- For quick till login
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_transaction_amount DECIMAL(12,2),      -- Per-transaction limit
  daily_transaction_limit DECIMAL(14,2),     -- Daily cumulative limit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,

  CONSTRAINT valid_employee_number CHECK (employee_number ~ '^[A-Z0-9]{4,20}$')
);
```

### currencies

```sql
CREATE TABLE currencies (
  code CHAR(3) PRIMARY KEY,                  -- ISO 4217: GBP, EUR, USD
  name VARCHAR(50) NOT NULL,                 -- British Pound Sterling
  symbol VARCHAR(5) NOT NULL,                -- £, €, $
  decimal_places SMALLINT NOT NULL DEFAULT 2,
  is_base_currency BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  min_transaction_amount DECIMAL(12,2) NOT NULL DEFAULT 1.00,
  max_transaction_amount DECIMAL(12,2) NOT NULL DEFAULT 10000.00,
  requires_id_threshold DECIMAL(12,2),       -- Amount above which ID required
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_single_base_currency ON currencies(is_base_currency)
  WHERE is_base_currency = true;
```

### currency_denominations

```sql
CREATE TABLE currency_denominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  denomination_type denomination_type NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  description VARCHAR(50),                   -- e.g., '£20 note'
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT positive_value CHECK (value > 0),
  CONSTRAINT unique_denomination UNIQUE (currency_code, value)
);
```

### exchange_rates

```sql
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  branch_id UUID REFERENCES branches(id),    -- NULL = all branches
  buy_rate DECIMAL(12,6) NOT NULL,           -- Rate to BUY from customer
  sell_rate DECIMAL(12,6) NOT NULL,          -- Rate to SELL to customer
  spread_percentage DECIMAL(5,4),            -- Calculated spread for reference
  source rate_source NOT NULL DEFAULT 'manual',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,               -- NULL = currently active
  set_by UUID REFERENCES staff_profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT positive_rates CHECK (buy_rate > 0 AND sell_rate > 0),
  CONSTRAINT buy_less_than_sell CHECK (buy_rate <= sell_rate),
  CONSTRAINT valid_date_range CHECK (
    effective_until IS NULL OR effective_until > effective_from
  )
);
```

### exchange_rate_history

```sql
CREATE TABLE exchange_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_id UUID NOT NULL,
  currency_code CHAR(3) NOT NULL,
  branch_id UUID,
  buy_rate DECIMAL(12,6) NOT NULL,
  sell_rate DECIMAL(12,6) NOT NULL,
  source rate_source NOT NULL,
  set_by UUID,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action VARCHAR(10) NOT NULL               -- 'INSERT', 'UPDATE', 'DELETE'
);
```

### drawer_sessions

```sql
CREATE TABLE drawer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  till_number SMALLINT NOT NULL,
  operator_id UUID NOT NULL REFERENCES staff_profiles(id),
  status drawer_session_status NOT NULL DEFAULT 'open',

  -- Opening state
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opening_float_gbp DECIMAL(12,2) NOT NULL,
  opening_verified_by UUID REFERENCES staff_profiles(id),

  -- Closing state
  closed_at TIMESTAMPTZ,
  closing_float_gbp DECIMAL(12,2),
  expected_float_gbp DECIMAL(12,2),
  variance_gbp DECIMAL(12,2),
  closing_verified_by UUID REFERENCES staff_profiles(id),
  closing_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT positive_float CHECK (opening_float_gbp >= 0),
  CONSTRAINT valid_close_time CHECK (closed_at IS NULL OR closed_at >= opened_at)
);
```

### drawer_denomination_counts

```sql
CREATE TABLE drawer_denomination_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES drawer_sessions(id) ON DELETE CASCADE,
  denomination_id UUID NOT NULL REFERENCES currency_denominations(id),
  count_type VARCHAR(10) NOT NULL,           -- 'opening' or 'closing'
  quantity INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT valid_count_type CHECK (count_type IN ('opening', 'closing')),
  CONSTRAINT positive_quantity CHECK (quantity >= 0),
  CONSTRAINT unique_count UNIQUE (session_id, denomination_id, count_type)
);
```

### transactions

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number VARCHAR(20) NOT NULL UNIQUE,
  branch_id UUID NOT NULL REFERENCES branches(id),
  drawer_session_id UUID NOT NULL REFERENCES drawer_sessions(id),
  operator_id UUID NOT NULL REFERENCES staff_profiles(id),

  transaction_type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'completed',

  foreign_currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  foreign_amount DECIMAL(14,2) NOT NULL,
  base_currency_code CHAR(3) NOT NULL DEFAULT 'GBP',
  base_amount DECIMAL(14,2) NOT NULL,

  rate_used DECIMAL(12,6) NOT NULL,
  rate_id UUID REFERENCES exchange_rates(id),

  customer_name VARCHAR(100),
  customer_id_type VARCHAR(50),
  customer_id_number VARCHAR(50),
  customer_id_verified_by UUID REFERENCES staff_profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES staff_profiles(id),
  void_reason TEXT,
  original_transaction_id UUID REFERENCES transactions(id),

  commission_amount DECIMAL(10,2) DEFAULT 0,

  CONSTRAINT positive_amounts CHECK (foreign_amount > 0 AND base_amount > 0),
  CONSTRAINT positive_rate CHECK (rate_used > 0),
  CONSTRAINT void_requires_reason CHECK (
    (status = 'voided' AND void_reason IS NOT NULL AND voided_by IS NOT NULL) OR
    status != 'voided'
  ),
  CONSTRAINT refund_requires_original CHECK (
    (status = 'refunded' AND original_transaction_id IS NOT NULL) OR
    status != 'refunded'
  )
);
```

### transaction_audit_log

```sql
CREATE TABLE transaction_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  action VARCHAR(50) NOT NULL,
  performed_by UUID NOT NULL REFERENCES staff_profiles(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_status transaction_status,
  new_status transaction_status,
  details JSONB,
  ip_address INET,
  user_agent TEXT
);
```

### daily_reconciliation

```sql
CREATE TABLE daily_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  reconciliation_date DATE NOT NULL,

  total_buy_transactions INTEGER NOT NULL DEFAULT 0,
  total_sell_transactions INTEGER NOT NULL DEFAULT 0,
  total_voided_transactions INTEGER NOT NULL DEFAULT 0,

  total_buy_gbp DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_sell_gbp DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_commission_gbp DECIMAL(12,2) NOT NULL DEFAULT 0,

  expected_cash_gbp DECIMAL(14,2),
  actual_cash_gbp DECIMAL(14,2),
  variance_gbp DECIMAL(12,2),

  reconciled_by UUID REFERENCES staff_profiles(id),
  reconciled_at TIMESTAMPTZ,
  manager_approved_by UUID REFERENCES staff_profiles(id),
  manager_approved_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_daily_recon UNIQUE (branch_id, reconciliation_date)
);
```

### compliance_alerts

```sql
CREATE TABLE compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  transaction_id UUID REFERENCES transactions(id),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL,

  acknowledged_by UUID REFERENCES staff_profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES staff_profiles(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);
```

### system_settings

```sql
CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES staff_profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Next Steps

1. **Set up Supabase MCP** - Configure MCP server to interact with database directly
2. **Create enums first** - Required before tables that reference them
3. **Create tables in order** - Respect foreign key dependencies
4. **Add RLS policies** - Enable row-level security
5. **Add triggers and functions** - For automation
6. **Seed initial data** - Currencies, denominations, test branch

---

## Notes

- **Buy rate**: Rate at which bureau BUYS foreign currency FROM customer (lower rate)
- **Sell rate**: Rate at which bureau SELLS foreign currency TO customer (higher rate)
- **Base currency**: GBP (British Pound Sterling)
- All monetary amounts use DECIMAL for precision
- All timestamps use TIMESTAMPTZ for timezone awareness
