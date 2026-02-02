-- ================================================
-- Fix Script for High-Risk Customers Query Issue
-- ================================================
-- Run this in Supabase SQL Editor after running
-- the diagnostic script to fix any issues found
-- ================================================

-- ================================================
-- PART 1: Re-run the customer encryption fix
-- (from fix-customer-creation-and-search.sql)
-- ================================================

-- Drop existing functions and recreate with fallback key
DROP FUNCTION IF EXISTS get_encryption_key() CASCADE;
DROP FUNCTION IF EXISTS encrypt_pii(TEXT) CASCADE;
DROP FUNCTION IF EXISTS decrypt_pii(BYTEA) CASCADE;

-- Get encryption key from environment, with fallback key
CREATE OR REPLACE FUNCTION get_encryption_key() RETURNS TEXT AS $$
DECLARE
    key TEXT;
BEGIN
    key := NULLIF(current_setting('app.encryption_key', TRUE), '');

    -- If no key is set, use the configured fallback key
    IF key IS NULL THEN
        key := 'wkA7oRDkEWNpVePLh3j6XnSSX25KJoQ0kaR1AOSNyynRaOeiIVBGzd1SLqJZ9hiBAlZ8LJfaV5BRUxJYOSNpAL8yisWgVDCCOg3pRCgDZFr2JPZXOm7olGGTaUqsCAEJlUyxOcvbnfaD74OuRURlt5nQElev5fri5ez7je8ZQFUD1nvIBttb6p3pSgcjFU89eWf2b4yWq5iS1kmO2Ocs6Q4eoUI48SMt59IQcVpJs03bpYSpVl9ccGilAOClXiIU';
    END IF;

    RETURN key;
END;
$$ LANGUAGE plpgsql STABLE;

-- Encrypt string with AES-256
CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT) RETURNS BYTEA AS $$
DECLARE
    key TEXT;
BEGIN
    IF plaintext IS NULL THEN
        RETURN NULL;
    END IF;

    key := get_encryption_key();
    RETURN pgp_sym_encrypt(plaintext, key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrypt BYTEA to string
CREATE OR REPLACE FUNCTION decrypt_pii(ciphertext BYTEA) RETURNS TEXT AS $$
DECLARE
    key TEXT;
BEGIN
    IF ciphertext IS NULL THEN
        RETURN NULL;
    END IF;

    key := get_encryption_key();
    RETURN pgp_sym_decrypt(ciphertext, key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- PART 2: Recreate views with proper security
-- ================================================

-- Drop views if they exist
DROP VIEW IF EXISTS active_suspicious_patterns CASCADE;
DROP VIEW IF EXISTS high_risk_customers CASCADE;

-- Active suspicious patterns view
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
WHERE sp.is_active = TRUE;

COMMENT ON VIEW active_suspicious_patterns IS 'View of active suspicious pattern detection rules';

-- High-risk customers view (with decrypted PII)
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
    decrypt_pii(c.first_name_bytea)::TEXT AS first_name,
    decrypt_pii(c.last_name_bytea)::TEXT AS last_name,
    decrypt_pii(c.phone_bytea)::TEXT AS phone
FROM customers c
JOIN branches b ON c.branch_id = b.id
WHERE c.risk_level IN ('HIGH', 'CRITICAL') OR c.is_on_watchlist = TRUE;

COMMENT ON VIEW high_risk_customers IS 'View of high-risk customers with decrypted PII for compliance dashboard';

-- ================================================
-- PART 3: Grant proper permissions
-- ================================================

-- Grant execute permissions on encryption/decryption functions
GRANT EXECUTE ON FUNCTION encrypt_pii(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_pii(BYTEA) TO authenticated;
GRANT EXECUTE ON FUNCTION get_encryption_key() TO authenticated;

-- Grant SELECT on views for authenticated users
GRANT SELECT ON high_risk_customers TO authenticated;
GRANT SELECT ON active_suspicious_patterns TO authenticated;

-- Grant SELECT on customer tables
GRANT SELECT ON customers TO authenticated;
GRANT SELECT ON customer_risk_factors TO authenticated;
GRANT SELECT ON customer_relationships TO authenticated;
GRANT SELECT ON suspicious_patterns TO authenticated;

-- Grant execute permissions on customer helper functions
GRANT EXECUTE ON FUNCTION search_customers_by_name(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_with_decrypted_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_active_risk_factors(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_customer_risk_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_customer_risk_level(UUID) TO authenticated;

-- ================================================
-- PART 4: Set search_path for security (important!)
-- ================================================

-- Alter functions to set search_path for security
ALTER FUNCTION encrypt_pii(TEXT) SET search_path = public;
ALTER FUNCTION decrypt_pii(BYTEA) SET search_path = public;
ALTER FUNCTION get_encryption_key() SET search_path = public;
ALTER FUNCTION search_customers_by_name(TEXT, UUID) SET search_path = public;
ALTER FUNCTION get_customer_with_decrypted_data(UUID) SET search_path = public;
ALTER FUNCTION get_customer_active_risk_factors(UUID) SET search_path = public;
ALTER FUNCTION calculate_customer_risk_score(UUID) SET search_path = public;
ALTER FUNCTION update_customer_risk_level(UUID) SET search_path = public;

-- ================================================
-- PART 5: Verification - Test the view
-- ================================================

-- This should return all high-risk customers (empty if none exist)
SELECT '=== HIGH-RISK CUSTOMERS VIEW TEST ===' as test_name;
SELECT * FROM high_risk_customers;

-- Test encryption/decryption
SELECT '=== ENCRYPTION TEST ===' as test_name;
SELECT
    encrypt_pii('test') as encrypted,
    decrypt_pii(encrypt_pii('test')) as decrypted,
    CASE WHEN decrypt_pii(encrypt_pii('test')) = 'test' THEN 'PASS' ELSE 'FAIL' END as result;

-- Count customers by risk level
SELECT '=== CUSTOMER RISK DISTRIBUTION ===' as test_name;
SELECT
    risk_level,
    COUNT(*) as customer_count
FROM customers
GROUP BY risk_level
ORDER BY risk_level;

-- Check if view is accessible to authenticated role
SELECT '=== PERMISSION CHECK ===' as test_name;
SELECT
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'high_risk_customers';
