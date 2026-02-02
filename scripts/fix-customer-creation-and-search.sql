-- ================================================
-- Complete Fix for Customer Creation and Search
-- ================================================
--
-- This script fixes both:
-- 1. Encryption key setup (required for customer creation)
-- 2. Function permissions (required for customer search)
--
-- Run this ONCE in Supabase SQL Editor
-- ================================================

-- ================================================
-- PART 1: Fix Encryption Functions
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
-- PART 2: Grant Permissions
-- ================================================

-- Grant execute permissions on encryption/decryption functions
GRANT EXECUTE ON FUNCTION encrypt_pii(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_pii(BYTEA) TO authenticated;
GRANT EXECUTE ON FUNCTION get_encryption_key() TO authenticated;

-- Grant execute permissions on customer functions
GRANT EXECUTE ON FUNCTION search_customers_by_name(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_with_decrypted_data(UUID) TO authenticated;

-- Grant SELECT on customers table for reading
GRANT SELECT ON customers TO authenticated;
GRANT SELECT ON customer_risk_factors TO authenticated;
GRANT SELECT ON customer_relationships TO authenticated;

-- ================================================
-- PART 3: Verification Queries
-- ================================================

-- Test 1: Encryption/Decryption works
SELECT '=== ENCRYPTION TEST ===' as test_name;
SELECT
    encrypt_pii('test') as encrypted,
    decrypt_pii(encrypt_pii('test')) as decrypted,
    CASE WHEN decrypt_pii(encrypt_pii('test')) = 'test' THEN 'PASS' ELSE 'FAIL' END as result;

-- Test 2: Search function works (will be empty until customers exist)
SELECT '=== SEARCH FUNCTION TEST ===' as test_name;
SELECT * FROM search_customers_by_name('test', NULL);

-- Test 3: Check if customers table exists and is accessible
SELECT '=== CUSTOMERS TABLE TEST ===' as test_name;
SELECT COUNT(*) as customer_count FROM customers;
