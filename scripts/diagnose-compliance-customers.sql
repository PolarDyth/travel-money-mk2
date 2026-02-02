-- ================================================
-- Diagnostic Script for High-Risk Customers Query
-- ================================================
-- Run this in Supabase SQL Editor to diagnose why
-- the admin compliance dashboard can't fetch customers
-- ================================================

-- ================================================
-- TEST 1: Check if required tables exist
-- ================================================
SELECT '=== TABLE EXISTENCE CHECK ===' as diagnostic_step;

SELECT
    table_name,
    CASE
        WHEN table_name IN (
            SELECT tablename FROM pg_tables WHERE schemaname = 'public'
            AND tablename IN ('customers', 'customer_risk_factors', 'customer_relationships', 'suspicious_patterns')
        ) THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
FROM (
    VALUES ('customers'), ('customer_risk_factors'), ('customer_relationships'), ('suspicious_patterns')
) AS t(table_name);

-- ================================================
-- TEST 2: Check if required views exist
-- ================================================
SELECT '=== VIEW EXISTENCE CHECK ===' as diagnostic_step;

SELECT
    viewname,
    CASE
        WHEN viewname IN (
            SELECT viewname FROM pg_views WHERE schemaname = 'public'
            AND viewname IN ('high_risk_customers', 'active_suspicious_patterns')
        ) THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
FROM (
    VALUES ('high_risk_customers'), ('active_suspicious_patterns')
) AS v(viewname);

-- ================================================
-- TEST 3: Check if customers table has any data
-- ================================================
SELECT '=== CUSTOMER DATA CHECK ===' as diagnostic_step;

SELECT
    COUNT(*) as total_customers,
    COUNT(*) FILTER (WHERE risk_level = 'HIGH') as high_risk_count,
    COUNT(*) FILTER (WHERE risk_level = 'CRITICAL') as critical_count,
    COUNT(*) FILTER (WHERE is_on_watchlist = TRUE) as watchlist_count
FROM customers;

-- ================================================
-- TEST 4: Test the high_risk_customers view directly
-- ================================================
SELECT '=== HIGH-RISK CUSTOMERS VIEW TEST ===' as diagnostic_step;

-- This will show the actual error if the view fails
SELECT * FROM high_risk_customers LIMIT 5;

-- ================================================
-- TEST 5: Check encryption/decryption functions
-- ================================================
SELECT '=== ENCRYPTION FUNCTION TEST ===' as diagnostic_step;

SELECT
    encrypt_pii('test_value') as encrypted,
    decrypt_pii(encrypt_pii('test_value')) as decrypted,
    CASE
        WHEN decrypt_pii(encrypt_pii('test_value')) = 'test_value' THEN 'WORKING'
        ELSE 'BROKEN'
    END as encryption_status;

-- ================================================
-- TEST 6: Check RLS policies on customers
-- ================================================
SELECT '=== RLS POLICIES CHECK ===' as diagnostic_step;

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'customers';

-- ================================================
-- TEST 7: Check grants on views
-- ================================================
SELECT '=== GRANTS CHECK ===' as diagnostic_step;

SELECT
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'high_risk_customers'
   OR table_name = 'active_suspicious_patterns';

-- ================================================
-- TEST 8: Check if app.encryption_key is set
-- ================================================
SELECT '=== ENCRYPTION KEY CHECK ===' as diagnostic_step;

SELECT
    current_setting('app.encryption_key', TRUE) as encryption_key_is_set,
    CASE
        WHEN current_setting('app.encryption_key', TRUE) IS NOT NULL THEN 'KEY IS SET'
        ELSE 'USING FALLBACK KEY'
    END as key_status;
