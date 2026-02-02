-- ================================================
-- Fix Encryption Key - Run This in Supabase SQL Editor
-- ================================================
--
-- This script modifies the encryption functions to use
-- a fallback key when no session key is configured.
--
-- Run this ONCE in Supabase SQL Editor to enable customer creation.
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
-- VERIFICATION - Run this to test
-- ================================================
SELECT
    encrypt_pii('test') as encrypted,
    decrypt_pii(encrypt_pii('test')) as decrypted,
    length(decrypt_pii(encrypt_pii('test'))) as decrypted_length;

-- Expected results:
-- - encrypted: <base64 bytes>
-- - decrypted: 'test'
-- - decrypted_length: 4

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION encrypt_pii(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_pii(BYTEA) TO authenticated;
GRANT EXECUTE ON FUNCTION get_encryption_key() TO authenticated;
