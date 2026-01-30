-- Currency Editing by Role - Database Schema Migration
-- Run this in Supabase SQL Editor to add the required tables and columns

-- ============================================
-- 1. Create exchange_rate_settings table
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_rate_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),

  -- Currency availability
  is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Rate override permissions
  allow_rate_override BOOLEAN NOT NULL DEFAULT false,
  max_override_percentage DECIMAL(5,2),  -- e.g., 5.0 = 5% variance

  -- Supervisor override settings
  require_supervisor_approval BOOLEAN NOT NULL DEFAULT true,
  supervisor_override_reason_required BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_branch_currency UNIQUE (branch_id, currency_code),
  CONSTRAINT valid_override_percentage CHECK (max_override_percentage >= 0 AND max_override_percentage <= 100)
);

CREATE INDEX IF NOT EXISTS idx_rate_settings_branch ON exchange_rate_settings(branch_id, is_enabled);

-- ============================================
-- 2. Add columns to transactions table
-- ============================================
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS rate_override_reason TEXT,
ADD COLUMN IF NOT EXISTS rate_override_approved_by UUID REFERENCES staff_profiles(id),
ADD COLUMN IF NOT EXISTS rate_override_source VARCHAR(20) DEFAULT 'standard'; -- 'standard', 'supervisor', 'manager'

-- Add constraint for valid sources
ALTER TABLE transactions
ADD CONSTRAINT IF NOT EXISTS valid_override_source
CHECK (rate_override_source IN ('standard', 'supervisor', 'manager'));

-- ============================================
-- 3. Create rate_override_history table
-- ============================================
CREATE TABLE IF NOT EXISTS rate_override_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  original_rate DECIMAL(12,6) NOT NULL,
  override_rate DECIMAL(12,6) NOT NULL,
  override_percentage DECIMAL(5,2),
  override_reason TEXT NOT NULL,
  approved_by UUID NOT NULL REFERENCES staff_profiles(id),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT positive_rates CHECK (original_rate > 0 AND override_rate > 0)
);

CREATE INDEX IF NOT EXISTS idx_override_history_transaction ON rate_override_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_override_history_approved_by ON rate_override_history(approved_by);
CREATE INDEX IF NOT EXISTS idx_override_history_date ON rate_override_history(approved_at DESC);

-- ============================================
-- 4. Enable Row Level Security
-- ============================================

-- Exchange Rate Settings
ALTER TABLE exchange_rate_settings ENABLE ROW LEVEL SECURITY;

-- Manager can see their branch settings
CREATE POLICY IF NOT EXISTS "Managers can view branch rate settings"
ON exchange_rate_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE staff_profiles.id = auth.uid()
    AND staff_profiles.role IN ('manager', 'admin')
    AND (
      staff_profiles.role = 'admin'
      OR staff_profiles.branch_id = exchange_rate_settings.branch_id
    )
  )
);

-- Manager can update their branch settings
CREATE POLICY IF NOT EXISTS "Managers can update branch rate settings"
ON exchange_rate_settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE staff_profiles.id = auth.uid()
    AND staff_profiles.role IN ('manager', 'admin')
    AND (
      staff_profiles.role = 'admin'
      OR staff_profiles.branch_id = exchange_rate_settings.branch_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE staff_profiles.id = auth.uid()
    AND staff_profiles.role IN ('manager', 'admin')
    AND (
      staff_profiles.role = 'admin'
      OR staff_profiles.branch_id = exchange_rate_settings.branch_id
    )
  )
);

-- Manager can insert settings for their branch
CREATE POLICY IF NOT EXISTS "Managers can insert branch rate settings"
ON exchange_rate_settings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE staff_profiles.id = auth.uid()
    AND staff_profiles.role IN ('manager', 'admin')
    AND (
      staff_profiles.role = 'admin'
      OR staff_profiles.branch_id = exchange_rate_settings.branch_id
    )
  )
);

-- Supervisors can view settings for their branch
CREATE POLICY IF NOT EXISTS "Supervisors can view branch rate settings"
ON exchange_rate_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE staff_profiles.id = auth.uid()
    AND staff_profiles.role IN ('supervisor', 'manager', 'admin')
    AND (
      staff_profiles.role IN ('manager', 'admin')
      OR staff_profiles.branch_id = exchange_rate_settings.branch_id
    )
  )
);

-- Rate Override History
ALTER TABLE rate_override_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all override history
CREATE POLICY IF NOT EXISTS "Admins can view all override history"
ON rate_override_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE staff_profiles.id = auth.uid()
    AND staff_profiles.role = 'admin'
  )
);

-- Managers can view override history for their branch
CREATE POLICY IF NOT EXISTS "Managers can view branch override history"
ON rate_override_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles sp
    JOIN transactions t ON t.branch_id = sp.branch_id
    WHERE sp.id = auth.uid()
    AND sp.role IN ('manager', 'admin')
    AND (
      sp.role = 'admin'
      OR t.id = rate_override_history.transaction_id
    )
  )
);

-- Supervisors can view override history for their branch
CREATE POLICY IF NOT EXISTS "Supervisors can view branch override history"
ON rate_override_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_profiles sp
    JOIN transactions t ON t.branch_id = sp.branch_id
    WHERE sp.id = auth.uid()
    AND sp.role IN ('supervisor', 'manager', 'admin')
    AND (
      sp.role IN ('manager', 'admin')
      OR t.id = rate_override_history.transaction_id
    )
  )
);

-- ============================================
-- 5. Add function to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for exchange_rate_settings
CREATE TRIGGER IF NOT EXISTS update_exchange_rate_settings_updated_at
  BEFORE UPDATE ON exchange_rate_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Insert default settings for existing branches
-- ============================================
INSERT INTO exchange_rate_settings (branch_id, currency_code, is_enabled, allow_rate_override)
SELECT DISTINCT
  sp.branch_id,
  c.code,
  true,
  false
FROM staff_profiles sp
CROSS JOIN currencies c
WHERE sp.role IN ('manager', 'supervisor')
  AND sp.branch_id IS NOT NULL
  AND c.is_active = true
ON CONFLICT (branch_id, currency_code) DO NOTHING;

-- ============================================
-- 7. Add helpful comments
-- ============================================
COMMENT ON TABLE exchange_rate_settings IS 'Branch-specific currency settings and rate override permissions';
COMMENT ON TABLE rate_override_history IS 'Audit trail for rate overrides in transactions';

COMMENT ON COLUMN exchange_rate_settings.is_enabled IS 'Whether this currency is available at this branch';
COMMENT ON COLUMN exchange_rate_settings.allow_rate_override IS 'Whether supervisors can override rates for this currency';
COMMENT ON COLUMN exchange_rate_settings.max_override_percentage IS 'Maximum percentage variance allowed for rate overrides';
COMMENT ON COLUMN exchange_rate_settings.require_supervisor_approval IS 'Whether rate overrides require supervisor approval';
COMMENT ON COLUMN exchange_rate_settings.supervisor_override_reason_required IS 'Whether supervisors must provide a reason for rate overrides';

COMMENT ON COLUMN transactions.rate_override_reason IS 'Reason provided for rate override';
COMMENT ON COLUMN transactions.rate_override_approved_by IS 'Staff member who approved the rate override';
COMMENT ON COLUMN transactions.rate_override_source IS 'Source of the rate used: standard, supervisor, or manager';
