-- 008: Full schema rework — unified masjids lifecycle
-- - masjids now covers full lifecycle: pending → rejected/verified → flagged/revoked
-- - request_attests + verifier_attests → masjid_attests
-- - registration_requests merged into masjids
-- - cash_out_requests → cash_outs
-- - cash_out_approvals → cash_out_votes
-- All indexed data cleared since contract is being redeployed.

-- Drop all views first
DROP VIEW IF EXISTS v_pending_registrations CASCADE;
DROP VIEW IF EXISTS v_masjid_summary CASCADE;
DROP VIEW IF EXISTS v_pending_cashouts CASCADE;
DROP VIEW IF EXISTS v_cashout_history CASCADE;
DROP VIEW IF EXISTS v_donation_feed CASCADE;
DROP VIEW IF EXISTS v_masjid_donation_stats CASCADE;

-- Add 'rejected' to registration_status enum
ALTER TYPE registration_status ADD VALUE IF NOT EXISTS 'rejected' AFTER 'pending';

-- Clear all indexed data (contract is redeployed, will re-index from new block)
TRUNCATE TABLE cash_out_approvals CASCADE;
TRUNCATE TABLE cash_out_requests   CASCADE;
TRUNCATE TABLE cash_ins            CASCADE;
TRUNCATE TABLE board_members       CASCADE;
TRUNCATE TABLE verifiers           CASCADE;

-- Drop old attestation tables
DROP TABLE IF EXISTS request_attests     CASCADE;
DROP TABLE IF EXISTS registration_requests CASCADE;
DROP TABLE IF EXISTS verifier_attests    CASCADE;

-- Clear masjids after dependencies are gone
TRUNCATE TABLE masjids CASCADE;

-- Alter masjids to support pending/rejected (no instance yet)
ALTER TABLE masjids
    ALTER COLUMN instance_addr DROP NOT NULL,
    ALTER COLUMN vault_addr    DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS cash_out_threshold BIGINT NOT NULL DEFAULT 0;

-- Replace full unique constraint on instance_addr with partial index (allow NULLs)
ALTER TABLE masjids DROP CONSTRAINT IF EXISTS masjids_instance_addr_key;
ALTER TABLE masjids DROP CONSTRAINT IF EXISTS masjid_registrations_instance_addr_key;
DROP INDEX IF EXISTS idx_masjids_instance_addr;
CREATE UNIQUE INDEX idx_masjids_instance_addr ON masjids (instance_addr)
    WHERE instance_addr IS NOT NULL;

-- Unified attestation table (covers pre-deploy and post-deploy attestations)
CREATE TABLE masjid_attests (
    id            BIGSERIAL    PRIMARY KEY,
    masjid_id     TEXT         NOT NULL REFERENCES masjids (masjid_id) ON DELETE CASCADE,
    verifier      TEXT         NOT NULL,
    support       BOOLEAN      NOT NULL,
    yes_count     INTEGER      NOT NULL DEFAULT 0,
    no_count      INTEGER      NOT NULL DEFAULT 0,
    block_number  BIGINT       NOT NULL,
    tx_hash       TEXT         NOT NULL,
    attested_at   TIMESTAMPTZ  NOT NULL,
    UNIQUE (masjid_id, verifier)
);

CREATE INDEX idx_masjid_attests_masjid_id ON masjid_attests (masjid_id);
CREATE INDEX idx_masjid_attests_verifier  ON masjid_attests (verifier);

-- Rename cash_out_requests → cash_outs
ALTER TABLE cash_out_requests RENAME TO cash_outs;

ALTER INDEX IF EXISTS idx_cashout_instance_addr RENAME TO idx_cash_outs_instance_addr;
ALTER INDEX IF EXISTS idx_cashout_masjid_id     RENAME TO idx_cash_outs_masjid_id;
ALTER INDEX IF EXISTS idx_cashout_to_addr       RENAME TO idx_cash_outs_to_addr;
ALTER INDEX IF EXISTS idx_cashout_executed      RENAME TO idx_cash_outs_executed;
ALTER INDEX IF EXISTS idx_cashout_canceled      RENAME TO idx_cash_outs_canceled;
ALTER INDEX IF EXISTS idx_cashout_pending       RENAME TO idx_cash_outs_pending;

-- Rename cash_out_approvals → cash_out_votes
ALTER TABLE cash_out_approvals RENAME TO cash_out_votes;

ALTER INDEX IF EXISTS idx_cashout_approvals_approver RENAME TO idx_cash_out_votes_approver;
ALTER INDEX IF EXISTS idx_cashout_approvals_request  RENAME TO idx_cash_out_votes_request;

-- Reset indexer checkpoints so re-indexing starts from new deployment block
TRUNCATE TABLE indexer_checkpoints CASCADE;

-- ── Views ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_masjid_summary AS
SELECT
    m.masjid_id,
    m.masjid_name,
    m.metadata_uri,
    m.proposer,
    m.masjid_admin,
    m.instance_addr,
    m.vault_addr,
    m.stablecoin,
    m.cash_out_threshold,
    m.status,
    m.attest_yes,
    m.attest_no,
    m.registered_at,
    m.verified_at,
    m.updated_at,

    COUNT(DISTINCT ci.donor)        AS total_donors,
    COALESCE(SUM(ci.amount), 0)     AS total_donated,
    (
        SELECT ci2.new_balance
        FROM   cash_ins ci2
        WHERE  ci2.instance_addr = m.instance_addr
        ORDER  BY ci2.donated_at DESC
        LIMIT  1
    )                               AS latest_balance,
    COUNT(DISTINCT co.id) FILTER (
        WHERE co.executed = FALSE
          AND co.canceled = FALSE
    )                               AS pending_cashouts

FROM  masjids m
LEFT JOIN cash_ins ci   ON ci.instance_addr = m.instance_addr
LEFT JOIN cash_outs co  ON co.instance_addr = m.instance_addr

GROUP BY
    m.masjid_id, m.masjid_name, m.metadata_uri, m.proposer,
    m.masjid_admin, m.instance_addr, m.vault_addr, m.stablecoin,
    m.cash_out_threshold, m.status, m.attest_yes, m.attest_no,
    m.registered_at, m.verified_at, m.updated_at;

CREATE OR REPLACE VIEW v_pending_registrations AS
SELECT
    m.masjid_id,
    m.name_hash,
    m.proposer,
    m.masjid_name,
    m.metadata_uri,
    m.stablecoin,
    m.cash_out_threshold,
    m.attest_yes,
    m.attest_no,
    m.registered_at,
    m.updated_at,
    COALESCE(
        ARRAY_AGG(ma.verifier) FILTER (WHERE ma.verifier IS NOT NULL),
        '{}'
    ) AS voted_verifiers
FROM  masjids m
LEFT  JOIN masjid_attests ma ON ma.masjid_id = m.masjid_id
WHERE m.status = 'pending'
GROUP BY
    m.masjid_id, m.name_hash, m.proposer, m.masjid_name, m.metadata_uri,
    m.stablecoin, m.cash_out_threshold, m.attest_yes, m.attest_no,
    m.registered_at, m.updated_at;

CREATE OR REPLACE VIEW v_pending_cashouts AS
SELECT
    co.id,
    co.instance_addr,
    co.request_id,
    co.masjid_id,
    co.to_addr,
    co.amount,
    co.note_hash,
    co.proposer,
    co.approvals,
    co.expires_at,
    co.proposed_at,
    co.block_number,
    co.tx_hash,

    m.masjid_name,
    m.stablecoin,
    (co.expires_at < NOW())     AS is_expired,
    COALESCE(
        ARRAY_AGG(cv.approver) FILTER (WHERE cv.approver IS NOT NULL),
        '{}'
    )                           AS approved_by

FROM  cash_outs co
LEFT  JOIN masjids m            ON m.masjid_id     = co.masjid_id
LEFT  JOIN cash_out_votes cv    ON cv.instance_addr = co.instance_addr
                               AND cv.request_id    = co.request_id

WHERE co.executed = FALSE
  AND co.canceled = FALSE

GROUP BY
    co.id, co.instance_addr, co.request_id, co.masjid_id,
    co.to_addr, co.amount, co.note_hash, co.proposer,
    co.approvals, co.expires_at, co.proposed_at,
    co.block_number, co.tx_hash, m.masjid_name, m.stablecoin;

CREATE OR REPLACE VIEW v_cashout_history AS
SELECT
    co.id,
    co.instance_addr,
    co.request_id,
    co.masjid_id,
    co.to_addr,
    co.amount,
    co.note_hash,
    co.proposer,
    co.approvals,
    co.expires_at,
    co.executed,
    co.canceled,
    co.executor,
    co.canceled_by,
    co.proposed_at,
    co.settled_at,

    CASE
        WHEN co.canceled           THEN 'canceled'
        WHEN co.executed           THEN 'executed'
        WHEN co.expires_at < NOW() THEN 'expired'
        ELSE                            'pending'
    END                         AS status_label,

    m.masjid_name,
    m.stablecoin,

    COALESCE(
        ARRAY_AGG(cv.approver) FILTER (WHERE cv.approver IS NOT NULL),
        '{}'
    )                           AS approved_by

FROM  cash_outs co
LEFT  JOIN masjids m            ON m.masjid_id     = co.masjid_id
LEFT  JOIN cash_out_votes cv    ON cv.instance_addr = co.instance_addr
                               AND cv.request_id    = co.request_id

GROUP BY
    co.id, co.instance_addr, co.request_id, co.masjid_id,
    co.to_addr, co.amount, co.note_hash, co.proposer,
    co.approvals, co.expires_at, co.executed, co.canceled,
    co.executor, co.canceled_by, co.proposed_at, co.settled_at,
    m.masjid_name, m.stablecoin;

CREATE OR REPLACE VIEW v_donation_feed AS
SELECT
    ci.id,
    ci.instance_addr,
    ci.masjid_id,
    ci.donor,
    ci.amount,
    ci.new_balance,
    ci.note_hash,
    ci.donated_at,
    ci.tx_hash,
    ci.block_number,

    m.masjid_name,
    m.stablecoin

FROM  cash_ins ci
LEFT  JOIN masjids m ON m.instance_addr = ci.instance_addr

ORDER BY ci.donated_at DESC;

CREATE OR REPLACE VIEW v_masjid_donation_stats AS
SELECT
    ci.instance_addr,
    ci.masjid_id,
    m.masjid_name,

    COUNT(*)                         AS total_tx,
    COUNT(DISTINCT ci.donor)         AS unique_donors,
    COALESCE(SUM(ci.amount), 0)      AS total_donated,
    COALESCE(MAX(ci.new_balance), 0) AS peak_balance,
    MIN(ci.donated_at)               AS first_donation_at,
    MAX(ci.donated_at)               AS last_donation_at

FROM  cash_ins ci
LEFT  JOIN masjids m ON m.instance_addr = ci.instance_addr

GROUP BY
    ci.instance_addr,
    ci.masjid_id,
    m.masjid_name;

INSERT INTO schema_migrations (version, description)
VALUES ('008', 'Full schema rework: unified masjids lifecycle, masjid_attests, cash_outs, cash_out_votes')
ON CONFLICT (version) DO NOTHING;
