-- ================================================
-- Fix RLS Security for Compliance Views
-- ================================================
-- This script implements proper role-based and branch-based
-- access control for compliance-related data
-- ================================================

-- ================================================
-- PART 1: Create role-specific security functions
-- ================================================

-- Function to check if user is admin or supervisor (can see all branches)
CREATE OR REPLACE FUNCTION is_compliance_officer() RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM staff_profiles
        WHERE id = auth.uid()
        AND is_active = TRUE
        AND role IN ('supervisor', 'manager', 'admin')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get user's branch ID
CREATE OR REPLACE FUNCTION get_user_branch_id() RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT branch_id FROM staff_profiles
        WHERE id = auth.uid() AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can access customer PII
CREATE OR REPLACE FUNCTION can_access_customer_pII(customer_branch_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    -- Admins/supervisors can see all
    IF is_compliance_officer() THEN
        RETURN TRUE;
    END IF;

    -- Operators can only see customers from their branch
    RETURN EXISTS (
        SELECT 1 FROM staff_profiles
        WHERE id = auth.uid()
        AND is_active = TRUE
        AND branch_id = customer_branch_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ================================================
-- PART 2: Replace existing views with secure versions
-- ================================================

-- Drop old views
DROP VIEW IF EXISTS high_risk_customers CASCADE;
DROP VIEW IF EXISTS active_suspicious_patterns CASCADE;

-- High-risk customers view - with PII filtering
CREATE VIEW high_risk_customers AS
SELECT
    c.id,
    c.created_at,
    c.risk_score,
    c.risk_level,
    c.is_on_watchlist,
    c.transaction_count,
    c.total_gbp_volume,
    c.branch_id,
    b.name AS branch_name,
    -- Only decrypt PII if user has access
    CASE
        WHEN can_access_customer_pII(c.branch_id) THEN
            decrypt_pii(c.first_name_bytea)::TEXT
        ELSE
            '[REDACTED]'
    END AS first_name,
    CASE
        WHEN can_access_customer_pII(c.branch_id) THEN
            decrypt_pii(c.last_name_bytea)::TEXT
        ELSE
            '[REDACTED]'
    END AS last_name,
    CASE
        WHEN can_access_customer_pII(c.branch_id) THEN
            decrypt_pii(c.phone_bytea)::TEXT
        ELSE
            '[REDACTED]'
    END AS phone
FROM customers c
JOIN branches b ON c.branch_id = b.id
WHERE (c.risk_level IN ('HIGH', 'CRITICAL') OR c.is_on_watchlist = TRUE)
  -- Row-level filtering: operators only see their branch, supervisors+ see all
  AND (is_compliance_officer() OR c.branch_id = get_user_branch_id());

COMMENT ON VIEW high_risk_customers IS 'View of high-risk customers with role-based PII access and branch filtering';

-- Active suspicious patterns - role-filtered
CREATE VIEW active_suspicious_patterns AS
SELECT
    sp.id,
    sp.name,
    sp.description,
    sp.pattern_type,
    sp.severity,
    sp.thresholds,
    sp.branch_id,
    b.name AS branch_name,
    sp.is_active,
    sp.metadata
FROM suspicious_patterns sp
LEFT JOIN branches b ON sp.branch_id = b.id
WHERE sp.is_active = TRUE
  -- Operators only see patterns for their branch, supervisors+ see all
  AND (sp.branch_id IS NULL OR is_compliance_officer() OR sp.branch_id = get_user_branch_id());

COMMENT ON VIEW active_suspicious_patterns IS 'View of active suspicious patterns with branch filtering';

-- ================================================
-- PART 3: Update RLS policies on underlying tables
-- ================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated staff to read customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated staff to read suspicious patterns" ON suspicious_patterns;

-- Create new granular policies for customers

-- Operators: can only read customers from their branch
CREATE POLICY "Allow operators to read branch customers"
    ON customers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff_profiles
            WHERE staff_profiles.id = auth.uid()
            AND staff_profiles.is_active = TRUE
            AND staff_profiles.role IN ('operator', 'supervisor', 'manager', 'admin')
            AND (
                staff_profiles.role IN ('supervisor', 'manager', 'admin')  -- Supervisors+ can see all
                OR staff_profiles.branch_id = customers.branch_id          -- Operators only their branch
            )
        )
    );

-- Supervisors/Managers/Admins: can read all customers (for compliance)
CREATE POLICY "Allow compliance officers to read all customers"
    ON customers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff_profiles
            WHERE staff_profiles.id = auth.uid()
            AND staff_profiles.is_active = TRUE
            AND staff_profiles.role IN ('supervisor', 'manager', 'admin')
        )
    );

-- Update suspicious patterns policies similarly
DROP POLICY IF EXISTS "Allow authenticated staff to read suspicious patterns" ON suspicious_patterns;

-- Operators: can only read patterns for their branch or global patterns
CREATE POLICY "Allow operators to read branch patterns"
    ON suspicious_patterns FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff_profiles
            WHERE staff_profiles.id = auth.uid()
            AND staff_profiles.is_active = TRUE
            AND staff_profiles.role IN ('operator', 'supervisor', 'manager', 'admin')
            AND (
                staff_profiles.role IN ('supervisor', 'manager', 'admin')  -- Supervisors+ can see all
                OR suspicious_patterns.branch_id IS NULL                  -- Global patterns
                OR suspicious_patterns.branch_id = staff_profiles.branch_id  -- Own branch patterns
            )
        )
    );

-- ================================================
-- PART 4: Set search_path for security
-- ================================================

ALTER FUNCTION is_compliance_officer() SET search_path = public;
ALTER FUNCTION get_user_branch_id() SET search_path = public;
ALTER FUNCTION can_access_customer_pII(UUID) SET search_path = public;

-- ================================================
-- PART 5: Grant permissions
-- ================================================

GRANT EXECUTE ON FUNCTION is_compliance_officer() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_branch_id() TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_customer_pII(UUID) TO authenticated;

GRANT SELECT ON high_risk_customers TO authenticated;
GRANT SELECT ON active_suspicious_patterns TO authenticated;

-- ================================================
-- PART 6: Verification queries
-- ================================================

-- Test 1: Check that the views work
SELECT '=== HIGH-RISK CUSTOMERS (your access level) ===' as test_name;
SELECT * FROM high_risk_customers;

-- Test 2: Check suspicious patterns
SELECT '=== ACTIVE SUSPICIOUS PATTERNS (your access level) ===' as test_name;
SELECT * FROM active_suspicious_patterns;

-- Test 3: Show current user role and branch
SELECT '=== YOUR ACCESS INFO ===' as test_name;
SELECT
    role,
    is_active,
    branch_id,
    (SELECT name FROM branches WHERE id = staff_profiles.branch_id) as branch_name
FROM staff_profiles
WHERE id = auth.uid();

-- Test 4: Show all customers (to verify branch filtering works)
SELECT '=== ALL CUSTOMERS COUNT (your access level) ===' as test_name;
SELECT COUNT(*) as visible_customers FROM customers;
