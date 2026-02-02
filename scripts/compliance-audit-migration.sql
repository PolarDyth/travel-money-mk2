-- ================================================
-- Compliance & Auditing System Migration
-- ================================================
-- This migration adds:
-- 1. Customer management with encrypted PII
-- 2. Suspicious transaction detection
-- 3. Customer relationship tracking
-- 4. Enhanced audit logging
-- ================================================

-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================
-- ENUMS
-- ================================================

-- Risk level enum for customers
CREATE TYPE customer_risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Customer relationship type
CREATE TYPE customer_relationship_type AS ENUM (
    'same_id',
    'same_address',
    'same_phone',
    'linked_transactions',
    'manual_flag'
);

-- Risk factor types
CREATE TYPE customer_risk_factor_type AS ENUM (
    'structuring',
    'velocity',
    'high_risk',
    'back_to_back',
    'group_transaction',
    'unusual_behavior',
    'watchlist_match'
);

-- Pattern severity levels
CREATE TYPE pattern_severity AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- Pattern types for suspicious transactions
CREATE TYPE suspicious_pattern_type AS ENUM (
    'structuring',
    'velocity',
    'back_to_back',
    'group',
    'unusual'
);

-- Audit action types
CREATE TYPE audit_action_type AS ENUM (
    'create',
    'update',
    'delete',
    'view',
    'void',
    'refund',
    'export'
);

-- ================================================
-- TABLES
-- ================================================

-- Customers table with encrypted PII
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Encrypted PII fields
    first_name_bytea BYTEA NOT NULL,           -- AES-256 encrypted
    last_name_bytea BYTEA NOT NULL,            -- AES-256 encrypted
    date_of_birth_bytea BYTEA,                 -- AES-256 encrypted (optional)
    address_bytea BYTEA,                       -- AES-256 encrypted (optional)
    phone_bytea BYTEA,                         -- AES-256 encrypted
    email_bytea BYTEA,                         -- AES-256 encrypted
    id_type_bytea BYTEA,                       -- AES-256 encrypted (passport, driving_license, etc)
    id_number_bytea BYTEA NOT NULL,            -- AES-256 encrypted

    -- Risk assessment
    risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level customer_risk_level NOT NULL DEFAULT 'LOW',

    -- Watchlist
    is_on_watchlist BOOLEAN NOT NULL DEFAULT FALSE,
    watchlist_reason TEXT,

    -- ID verification
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    document_reference TEXT,                   -- Reference to stored document

    -- Tracking
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_count INTEGER NOT NULL DEFAULT 0,
    total_gbp_volume DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- Branch
    branch_id UUID REFERENCES branches(id) NOT NULL
);

-- Customer risk factors (historical risk scoring data)
CREATE TABLE customer_risk_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    -- Risk factor details
    factor_type customer_risk_factor_type NOT NULL,
    severity pattern_severity NOT NULL,
    score_impact INTEGER NOT NULL,             -- Points added to risk_score

    -- Context
    description TEXT NOT NULL,
    related_transaction_ids UUID[],            -- Transactions that caused this factor
    metadata JSONB,                            -- Additional pattern-specific data

    -- Expiration for temporary factors
    expires_at TIMESTAMPTZ,                    -- NULL = permanent

    -- Detection
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    detected_by UUID REFERENCES staff_profiles(id)
);

-- Suspicious patterns (configurable detection rules)
CREATE TABLE suspicious_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Pattern details
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    pattern_type suspicious_pattern_type NOT NULL,
    severity pattern_severity NOT NULL,

    -- Thresholds configuration (JSONB for flexibility)
    thresholds JSONB NOT NULL,                 -- Pattern-specific thresholds

    -- Scope
    branch_id UUID REFERENCES branches(id),    -- NULL = global pattern
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Metadata
    metadata JSONB
);

-- Customer relationships (link related customers)
CREATE TABLE customer_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    customer_a_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    customer_b_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    relationship_type customer_relationship_type NOT NULL,
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),

    -- Evidence and metadata
    evidence JSONB,                            -- Detection evidence
    metadata JSONB,

    -- Detection info
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    detected_by UUID REFERENCES staff_profiles(id),

    -- Prevent duplicates and self-relationships
    UNIQUE(customer_a_id, customer_b_id, relationship_type),
    CHECK (customer_a_id != customer_b_id)
);

-- ================================================
-- MODIFY EXISTING TABLES
-- ================================================

-- Add customer link to transactions
ALTER TABLE transactions
    ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    ADD COLUMN session_ip_address INET,
    ADD COLUMN session_user_agent TEXT,
    ADD COLUMN session_device_fingerprint TEXT,
    ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN last_viewed_at TIMESTAMPTZ;

-- Enhance transaction_audit_log
ALTER TABLE transaction_audit_log
    ALTER COLUMN ip_address TYPE INET USING ip_address::INET,
    ADD COLUMN session_id UUID,
    ADD COLUMN device_fingerprint TEXT,
    ADD COLUMN field_changes JSONB,            -- Before/after values for updates
    ADD COLUMN api_endpoint TEXT,
    ADD COLUMN action_type audit_action_type NOT NULL DEFAULT 'create';

-- ================================================
-- INDEXES
-- ================================================

-- Customers indexes
CREATE INDEX idx_customers_branch_id ON customers(branch_id);
CREATE INDEX idx_customers_risk_level ON customers(risk_level);
CREATE INDEX idx_customers_watchlist ON customers(is_on_watchlist) WHERE is_on_watchlist = TRUE;
CREATE INDEX idx_customers_last_seen ON customers(last_seen_at DESC);
CREATE INDEX idx_customers_id_number ON customers USING pg_pgmroonga(id_number_bytea);

-- Customer risk factors indexes
CREATE INDEX idx_customer_risk_factors_customer_id ON customer_risk_factors(customer_id);
CREATE INDEX idx_customer_risk_factors_type ON customer_risk_factors(factor_type);
CREATE INDEX idx_customer_risk_factors_severity ON customer_risk_factors(severity);
CREATE INDEX idx_customer_risk_factors_expires ON customer_risk_factors(expires_at) WHERE expires_at IS NOT NULL;

-- Suspicious patterns indexes
CREATE INDEX idx_suspicious_patterns_type ON suspicious_patterns(pattern_type);
CREATE INDEX idx_suspicious_patterns_active ON suspicious_patterns(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_suspicious_patterns_branch ON suspicious_patterns(branch_id);

-- Customer relationships indexes
CREATE INDEX idx_customer_relationships_customer_a ON customer_relationships(customer_a_id);
CREATE INDEX idx_customer_relationships_customer_b ON customer_relationships(customer_b_id);
CREATE INDEX idx_customer_relationships_type ON customer_relationships(relationship_type);
CREATE INDEX idx_customer_relationships_confidence ON customer_relationships(confidence_score DESC);

-- Transactions indexes (new columns)
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_session_ip ON transactions(session_ip_address);
CREATE INDEX idx_transactions_viewed ON transactions(last_viewed_at DESC);

-- Transaction audit log indexes (new columns)
CREATE INDEX idx_transaction_audit_log_session_id ON transaction_audit_log(session_id);
CREATE INDEX idx_transaction_audit_log_action_type ON transaction_audit_log(action_type);
CREATE INDEX idx_transaction_audit_log_api_endpoint ON transaction_audit_log(api_endpoint);

-- ================================================
-- ENCRYPTION/DECRYPTION FUNCTIONS
-- ================================================

-- Get encryption key from environment (must be set in session)
CREATE OR REPLACE FUNCTION get_encryption_key() RETURNS TEXT AS $$
    SELECT NULLIF(current_setting('app.encryption_key', TRUE), '');
$$ LANGUAGE SQL STABLE;

-- Encrypt string with AES-256
CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT) RETURNS BYTEA AS $$
DECLARE
    key TEXT;
BEGIN
    IF plaintext IS NULL THEN
        RETURN NULL;
    END IF;

    key := get_encryption_key();
    IF key IS NULL THEN
        RAISE EXCEPTION 'Encryption key not set. Set app.encryption_key configuration parameter.';
    END IF;

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
    IF key IS NULL THEN
        RAISE EXCEPTION 'Encryption key not set. Set app.encryption_key configuration parameter.';
    END IF;

    RETURN pgp_sym_decrypt(ciphertext, key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- TRIGGERS
-- ================================================

-- Update customers.updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();

-- Update suspicious_patterns.updated_at
CREATE TRIGGER trigger_suspicious_patterns_updated_at
    BEFORE UPDATE ON suspicious_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();

-- Update customer transaction stats after transaction
CREATE OR REPLACE FUNCTION update_customer_stats() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.customer_id IS NOT NULL THEN
            UPDATE customers
            SET
                transaction_count = transaction_count + 1,
                total_gbp_volume = total_gbp_volume +
                    CASE NEW.transaction_type
                        WHEN 'buy' THEN NEW.base_amount
                        WHEN 'sell' THEN NEW.base_amount
                        ELSE 0
                    END,
                last_seen_at = NOW()
            WHERE id = NEW.customer_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' AND OLD.customer_id != NEW.customer_id THEN
        -- Handle customer change
        IF OLD.customer_id IS NOT NULL THEN
            UPDATE customers
            SET
                transaction_count = transaction_count - 1,
                total_gbp_volume = total_gbp_volume -
                    CASE OLD.transaction_type
                        WHEN 'buy' THEN OLD.base_amount
                        WHEN 'sell' THEN OLD.base_amount
                        ELSE 0
                    END
            WHERE id = OLD.customer_id;
        END IF;
        IF NEW.customer_id IS NOT NULL THEN
            UPDATE customers
            SET
                transaction_count = transaction_count + 1,
                total_gbp_volume = total_gbp_volume +
                    CASE NEW.transaction_type
                        WHEN 'buy' THEN NEW.base_amount
                        WHEN 'sell' THEN NEW.base_amount
                        ELSE 0
                    END,
                last_seen_at = NOW()
            WHERE id = NEW.customer_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_stats
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_stats();

-- Increment view count when transaction is viewed
CREATE OR REPLACE FUNCTION increment_transaction_view_count() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.action_type = 'view' THEN
        UPDATE transactions
        SET
            view_count = view_count + 1,
            last_viewed_at = NOW()
        WHERE id = NEW.transaction_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_transaction_view_count
    AFTER INSERT ON transaction_audit_log
    FOR EACH ROW
    WHEN (NEW.action_type = 'view')
    EXECUTE FUNCTION increment_transaction_view_count();

-- ================================================
-- RLS POLICIES
-- ================================================

-- Enable RLS on new tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_risk_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_relationships ENABLE ROW LEVEL SECURITY;

-- Customers: All authenticated staff can read (for KYC)
CREATE POLICY "Allow authenticated staff to read customers"
    ON customers FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM staff_profiles
        WHERE staff_profiles.id = auth.uid()
        AND staff_profiles.is_active = TRUE
    ));

-- Customers: Only operators can create (during transaction)
CREATE POLICY "Allow operators to create customers"
    ON customers FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff_profiles
            WHERE staff_profiles.id = auth.uid()
            AND staff_profiles.is_active = TRUE
            AND staff_profiles.role IN ('operator', 'supervisor', 'manager', 'admin')
        )
    );

-- Customers: Supervisors+ can update (for watchlist, risk updates)
CREATE POLICY "Allow supervisors to update customers"
    ON customers FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff_profiles
            WHERE staff_profiles.id = auth.uid()
            AND staff_profiles.is_active = TRUE
            AND staff_profiles.role IN ('supervisor', 'manager', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff_profiles
            WHERE staff_profiles.id = auth.uid()
            AND staff_profiles.is_active = TRUE
            AND staff_profiles.role IN ('supervisor', 'manager', 'admin')
        )
    );

-- Customer risk factors: All staff can read
CREATE POLICY "Allow authenticated staff to read customer risk factors"
    ON customer_risk_factors FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM staff_profiles
        WHERE staff_profiles.id = auth.uid()
        AND staff_profiles.is_active = TRUE
    ));

-- Customer risk factors: System/admin can insert
CREATE POLICY "Allow admins to insert customer risk factors"
    ON customer_risk_factors FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff_profiles
            WHERE staff_profiles.id = auth.uid()
            AND staff_profiles.role IN ('manager', 'admin')
        )
    );

-- Suspicious patterns: All staff can read active patterns
CREATE POLICY "Allow authenticated staff to read suspicious patterns"
    ON suspicious_patterns FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM staff_profiles
        WHERE staff_profiles.id = auth.uid()
        AND staff_profiles.is_active = TRUE
    ));

-- Suspicious patterns: Admins can manage
CREATE POLICY "Allow admins to manage suspicious patterns"
    ON suspicious_patterns FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff_profiles
            WHERE staff_profiles.id = auth.uid()
            AND staff_profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff_profiles
            WHERE staff_profiles.id = auth.uid()
            AND staff_profiles.role = 'admin'
        )
    );

-- Customer relationships: All staff can read
CREATE POLICY "Allow authenticated staff to read customer relationships"
    ON customer_relationships FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM staff_profiles
        WHERE staff_profiles.id = auth.uid()
        AND staff_profiles.is_active = TRUE
    ));

-- Customer relationships: System/admin can insert
CREATE POLICY "Allow admins to insert customer relationships"
    ON customer_relationships FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff_profiles
            WHERE staff_profiles.id = auth.uid()
            AND staff_profiles.role IN ('manager', 'admin')
        )
    );

-- ================================================
-- GRANTS
-- ================================================

-- Grant usage on enums
GRANT USAGE ON TYPE
    customer_risk_level,
    customer_relationship_type,
    customer_risk_factor_type,
    pattern_severity,
    suspicious_pattern_type,
    audit_action_type
TO authenticated;

-- Grant select on tables
GRANT SELECT ON
    customers,
    customer_risk_factors,
    suspicious_patterns,
    customer_relationships
TO authenticated;

-- Grant insert/update where appropriate
GRANT INSERT, UPDATE ON customers TO authenticated;
GRANT INSERT ON customer_risk_factors, customer_relationships TO authenticated;
GRANT INSERT, UPDATE, DELETE ON suspicious_patterns TO authenticated;

-- ================================================
-- FUNCTIONS FOR QUERY HELPERS
-- ================================================

-- Get customer with decrypted PII
CREATE OR REPLACE FUNCTION get_customer_with_decrypted_data(customer_id UUID)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    first_name TEXT,
    last_name TEXT,
    date_of_birth TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    id_type TEXT,
    id_number TEXT,
    risk_score INTEGER,
    risk_level customer_risk_level,
    is_on_watchlist BOOLEAN,
    watchlist_reason TEXT,
    branch_id UUID,
    transaction_count INTEGER,
    total_gbp_volume DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.created_at,
        c.updated_at,
        decrypt_pii(c.first_name_bytea)::TEXT,
        decrypt_pii(c.last_name_bytea)::TEXT,
        decrypt_pii(c.date_of_birth_bytea)::TEXT,
        decrypt_pii(c.address_bytea)::TEXT,
        decrypt_pii(c.phone_bytea)::TEXT,
        decrypt_pii(c.email_bytea)::TEXT,
        decrypt_pii(c.id_type_bytea)::TEXT,
        decrypt_pii(c.id_number_bytea)::TEXT,
        c.risk_score,
        c.risk_level,
        c.is_on_watchlist,
        c.watchlist_reason,
        c.branch_id,
        c.transaction_count,
        c.total_gbp_volume
    FROM customers c
    WHERE c.id = customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search customers by decrypted name
CREATE OR REPLACE FUNCTION search_customers_by_name(
    search_term TEXT,
    search_branch_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    email TEXT,
    risk_score INTEGER,
    risk_level customer_risk_level,
    is_on_watchlist BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        decrypt_pii(c.first_name_bytea)::TEXT AS first_name,
        decrypt_pii(c.last_name_bytea)::TEXT AS last_name,
        decrypt_pii(c.phone_bytea)::TEXT AS phone,
        decrypt_pii(c.email_bytea)::TEXT AS email,
        c.risk_score,
        c.risk_level,
        c.is_on_watchlist
    FROM customers c
    WHERE
        (search_branch_id IS NULL OR c.branch_id = search_branch_id)
        AND (
            LOWER(decrypt_pii(c.first_name_bytea)) LIKE LOWER('%' || search_term || '%')
            OR LOWER(decrypt_pii(c.last_name_bytea)) LIKE LOWER('%' || search_term || '%')
            OR LOWER(
                decrypt_pii(c.first_name_bytea) || ' ' || decrypt_pii(c.last_name_bytea)
            ) LIKE LOWER('%' || search_term || '%')
        )
    ORDER BY c.last_seen_at DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get customer risk factors with active/non-expired
CREATE OR REPLACE FUNCTION get_customer_active_risk_factors(customer_id UUID)
RETURNS TABLE (
    id UUID,
    factor_type customer_risk_factor_type,
    severity pattern_severity,
    score_impact INTEGER,
    description TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        crf.id,
        crf.factor_type,
        crf.severity,
        crf.score_impact,
        crf.description,
        crf.created_at,
        crf.expires_at
    FROM customer_risk_factors crf
    WHERE crf.customer_id = customer_id
        AND (crf.expires_at IS NULL OR crf.expires_at > NOW())
    ORDER BY crf.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate customer risk score from factors
CREATE OR REPLACE FUNCTION calculate_customer_risk_score(customer_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_score INTEGER;
BEGIN
    SELECT COALESCE(SUM(score_impact), 0) INTO total_score
    FROM customer_risk_factors
    WHERE customer_id = customer_id
        AND (expires_at IS NULL OR expires_at > NOW());

    RETURN LEAST(total_score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update customer risk level based on score
CREATE OR REPLACE FUNCTION update_customer_risk_level(customer_id UUID)
RETURNS customer_risk_level AS $$
DECLARE
    risk_score INTEGER;
    new_level customer_risk_level;
BEGIN
    SELECT c.risk_score INTO risk_score
    FROM customers c
    WHERE c.id = customer_id;

    new_level := CASE
        WHEN risk_score >= 75 THEN 'CRITICAL'
        WHEN risk_score >= 50 THEN 'HIGH'
        WHEN risk_score >= 25 THEN 'MEDIUM'
        ELSE 'LOW'
    END::customer_risk_level;

    UPDATE customers
    SET risk_level = new_level
    WHERE id = customer_id;

    RETURN new_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- VIEWS FOR CONVENIENT QUERYING
-- ================================================

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

-- High-risk customers view
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

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE customers IS 'Customer records with encrypted PII for KYC compliance';
COMMENT ON COLUMN customers.first_name_bytea IS 'AES-256 encrypted first name';
COMMENT ON COLUMN customers.risk_score IS '0-100 risk score based on factors';
COMMENT ON COLUMN customers.is_on_watchlist IS 'Flagged for regulatory monitoring';

COMMENT ON TABLE customer_risk_factors IS 'Historical risk factors contributing to customer risk score';
COMMENT ON COLUMN customer_risk_factors.expires_at IS 'NULL = permanent factor, otherwise temporary';

COMMENT ON TABLE suspicious_patterns IS 'Configurable detection rules for suspicious transactions';
COMMENT ON COLUMN suspicious_patterns.thresholds IS 'JSONB config for pattern-specific thresholds';

COMMENT ON TABLE customer_relationships IS 'Links between related customers for group/structuring detection';
COMMENT ON COLUMN customer_relationships.confidence_score IS '0-100 confidence in relationship detection';
