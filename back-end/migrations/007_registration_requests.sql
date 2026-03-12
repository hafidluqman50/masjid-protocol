-- 007: Add registration_requests and request_attests tables
-- Replace old verifier vote model (on deployed masjids) with pre-deploy request flow.

CREATE TABLE IF NOT EXISTS registration_requests (
    request_id        TEXT         PRIMARY KEY,
    name_hash         TEXT         NOT NULL,
    proposer          TEXT         NOT NULL,
    masjid_name       TEXT         NOT NULL,
    metadata_uri      TEXT         NOT NULL DEFAULT '',
    stablecoin        TEXT         NOT NULL,
    cash_out_threshold BIGINT      NOT NULL DEFAULT 0,
    attest_yes        INTEGER      NOT NULL DEFAULT 0,
    attest_no         INTEGER      NOT NULL DEFAULT 0,
    status            TEXT         NOT NULL DEFAULT 'pending',
    block_number      BIGINT       NOT NULL,
    tx_hash           TEXT         NOT NULL,
    requested_at      TIMESTAMPTZ  NOT NULL,
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reg_req_name_hash   ON registration_requests (name_hash);
CREATE INDEX IF NOT EXISTS idx_reg_req_proposer    ON registration_requests (proposer);
CREATE INDEX IF NOT EXISTS idx_reg_req_status      ON registration_requests (status);

CREATE TABLE IF NOT EXISTS request_attests (
    id            BIGSERIAL    PRIMARY KEY,
    request_id    TEXT         NOT NULL REFERENCES registration_requests (request_id) ON DELETE CASCADE,
    verifier      TEXT         NOT NULL,
    support       BOOLEAN      NOT NULL,
    yes_count     INTEGER      NOT NULL DEFAULT 0,
    no_count      INTEGER      NOT NULL DEFAULT 0,
    block_number  BIGINT       NOT NULL,
    tx_hash       TEXT         NOT NULL,
    attested_at   TIMESTAMPTZ  NOT NULL,
    UNIQUE (request_id, verifier)
);

CREATE INDEX IF NOT EXISTS idx_req_attests_request_id ON request_attests (request_id);
CREATE INDEX IF NOT EXISTS idx_req_attests_verifier   ON request_attests (verifier);

-- Fix views that still reference old table name (masjid_registrations → masjids)
CREATE OR REPLACE VIEW v_pending_registrations AS
SELECT
    r.request_id,
    r.name_hash,
    r.proposer,
    r.masjid_name,
    r.metadata_uri,
    r.stablecoin,
    r.cash_out_threshold,
    r.attest_yes,
    r.attest_no,
    r.status,
    r.requested_at,
    r.updated_at,
    COALESCE(
        ARRAY_AGG(ra.verifier) FILTER (WHERE ra.verifier IS NOT NULL),
        '{}'
    ) AS voted_verifiers
FROM  registration_requests r
LEFT  JOIN request_attests ra ON ra.request_id = r.request_id
WHERE r.status = 'pending'
GROUP BY
    r.request_id, r.name_hash, r.proposer, r.masjid_name, r.metadata_uri,
    r.stablecoin, r.cash_out_threshold, r.attest_yes, r.attest_no,
    r.status, r.requested_at, r.updated_at;

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
LEFT JOIN cash_ins ci          ON ci.instance_addr = m.instance_addr
LEFT JOIN cash_out_requests co ON co.instance_addr = m.instance_addr

GROUP BY
    m.masjid_id, m.masjid_name, m.metadata_uri, m.proposer,
    m.masjid_admin, m.instance_addr, m.vault_addr, m.stablecoin,
    m.status, m.attest_yes, m.attest_no, m.registered_at,
    m.verified_at, m.updated_at;

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
        ARRAY_AGG(ca.approver) FILTER (WHERE ca.approver IS NOT NULL),
        '{}'
    )                           AS approved_by

FROM  cash_out_requests co
LEFT  JOIN masjids m           ON m.masjid_id     = co.masjid_id
LEFT  JOIN cash_out_approvals ca ON ca.instance_addr = co.instance_addr
                               AND ca.request_id    = co.request_id

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
        ARRAY_AGG(ca.approver) FILTER (WHERE ca.approver IS NOT NULL),
        '{}'
    )                           AS approved_by

FROM  cash_out_requests co
LEFT  JOIN masjids m           ON m.masjid_id     = co.masjid_id
LEFT  JOIN cash_out_approvals ca ON ca.instance_addr = co.instance_addr
                               AND ca.request_id    = co.request_id

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
VALUES ('007', 'Add registration_requests and request_attests; fix views for renamed masjids table')
ON CONFLICT (version) DO NOTHING;
