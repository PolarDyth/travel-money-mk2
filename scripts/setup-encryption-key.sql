-- ================================================
-- Setup Encryption Key for Customer PII
-- ================================================
--
-- This script sets up the encryption key required for
-- customer data encryption/decryption.
--
-- IMPORTANT: Run this in Supabase SQL Editor
--
-- The encryption key should be:
-- - 32+ characters for AES-256
-- - Stored securely in environment variables
-- - Never committed to version control
-- ================================================

-- Set the encryption key (replace with your actual key)
-- This key must be consistent across all database connections
-- DO NOT use this example key in production - generate a secure random key
SET app.encryption_key = 'wkA7oRDkEWNpVePLh3j6XnSSX25KJoQ0kaR1AOSNyynRaOeiIVBGzd1SLqJZ9hiBAlZ8LJfaV5BRUxJYOSNpAL8yisWgVDCCOg3pRCgDZFr2JPZXOm7olGGTaUqsCAEJlUyxOcvbnfaD74OuRURlt5nQElev5fri5ez7je8ZQFUD1nvIBttb6p3pSgcjFU89eWf2b4yWq5iS1kmO2Ocs6Q4eoUI48SMt59IQcVpJs03bpYSpVl9ccGilAOClXiIU';

-- For development only, you can use a simpler key
-- SET app.encryption_key = 'development-encryption-key-12345';

-- Verify the key is set
SELECT current_setting('app.encryption_key', TRUE) as encryption_key_is_set;

-- Test encryption/decryption
SELECT
  encrypt_pii('test') as encrypted_data,
  decrypt_pii(encrypt_pii('test')) as decrypted_data;

-- Expected result:
-- - encrypted_data: <base64 encoded bytes>
-- - decrypted_data: 'test'
