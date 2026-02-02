-- ================================================
-- Fix Customer Function Permissions
-- ================================================
--
-- This script grants necessary permissions to customer-related
-- functions for the authenticated role.
--
-- Run this in Supabase SQL Editor after the migration script.
-- ================================================

-- Grant execute permissions on customer-related functions
GRANT EXECUTE ON FUNCTION search_customers_by_name(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_with_decrypted_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION encrypt_pii(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_pii(BYTEA) TO authenticated;

-- Also grant SELECT on customers table for reading
GRANT SELECT ON customers TO authenticated;
GRANT SELECT ON customer_risk_factors TO authenticated;
GRANT SELECT ON customer_relationships TO authenticated;

-- Verify permissions
SELECT
    proname as function_name,
    string_agg(a.grantee::regrole::text, ', ') as granted_to
FROM pg_proc p
JOIN pg_authid a ON a.oid = ANY(
    SELECT grantee
    FROM pg_proc_privs
    WHERE objid = p.oid
)
WHERE p.proname IN (
    'search_customers_by_name',
    'get_customer_with_decrypted_data',
    'encrypt_pii',
    'decrypt_pii'
)
GROUP BY proname;
