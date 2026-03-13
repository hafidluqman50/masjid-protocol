CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE registration_status AS ENUM (
    'none',
    'pending',
    'verified',
    'flagged',
    'revoked'
);

CREATE TYPE verification_status AS ENUM (
    'unverified',
    'verified',
    'flagged',
    'revoked'
);

CREATE TABLE indexer_checkpoints (
    id             SERIAL       PRIMARY KEY,
    contract_name  TEXT         NOT NULL UNIQUE,
    contract_addr  TEXT         NOT NULL,
    last_block     BIGINT       NOT NULL DEFAULT 0,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE masjid_registrations (
    masjid_id      TEXT         PRIMARY KEY,
    name_hash      TEXT         NOT NULL,
    proposer       TEXT         NOT NULL,
    masjid_admin   TEXT         NOT NULL,
    instance_addr  TEXT         NOT NULL UNIQUE,
    vault_addr     TEXT         NOT NULL,
    stablecoin     TEXT         NOT NULL,
    masjid_name    TEXT         NOT NULL,
    metadata_uri   TEXT         NOT NULL DEFAULT '',
    attest_yes     INTEGER      NOT NULL DEFAULT 0,
    attest_no      INTEGER      NOT NULL DEFAULT 0,
    status         registration_status NOT NULL DEFAULT 'pending',
    block_number   BIGINT       NOT NULL,
    tx_hash        TEXT         NOT NULL,
    registered_at  TIMESTAMPTZ  NOT NULL,
    verified_at    TIMESTAMPTZ,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_registrations_status        ON masjid_registrations (status);
CREATE INDEX idx_registrations_proposer      ON masjid_registrations (proposer);
CREATE INDEX idx_registrations_masjid_admin  ON masjid_registrations (masjid_admin);
CREATE INDEX idx_registrations_instance_addr ON masjid_registrations (instance_addr);

CREATE TABLE verifier_attests (
    id            BIGSERIAL    PRIMARY KEY,
    masjid_id     TEXT         NOT NULL REFERENCES masjid_registrations (masjid_id) ON DELETE CASCADE,
    verifier      TEXT         NOT NULL,
    support       BOOLEAN      NOT NULL,
    note_hash     TEXT         NOT NULL,
    yes_count     INTEGER      NOT NULL DEFAULT 0,
    no_count      INTEGER      NOT NULL DEFAULT 0,
    block_number  BIGINT       NOT NULL,
    tx_hash       TEXT         NOT NULL,
    attested_at   TIMESTAMPTZ  NOT NULL,
    UNIQUE (masjid_id, verifier)
);

CREATE INDEX idx_verifier_attests_masjid_id  ON verifier_attests (masjid_id);
CREATE INDEX idx_verifier_attests_verifier   ON verifier_attests (verifier);

CREATE TABLE cash_ins (
    id              BIGSERIAL    PRIMARY KEY,
    instance_addr   TEXT         NOT NULL,
    masjid_id       TEXT         REFERENCES masjid_registrations (masjid_id) ON DELETE SET NULL,
    donor           TEXT         NOT NULL,
    amount          NUMERIC(38)  NOT NULL,
    new_balance     NUMERIC(38)  NOT NULL,
    note_hash       TEXT         NOT NULL,
    block_number    BIGINT       NOT NULL,
    tx_hash         TEXT         NOT NULL,
    donated_at      TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_cash_ins_instance_addr  ON cash_ins (instance_addr);
CREATE INDEX idx_cash_ins_masjid_id      ON cash_ins (masjid_id);
CREATE INDEX idx_cash_ins_donor          ON cash_ins (donor);
CREATE INDEX idx_cash_ins_donated_at     ON cash_ins (donated_at DESC);

CREATE TABLE cash_out_requests (
    id              BIGSERIAL    PRIMARY KEY,
    instance_addr   TEXT         NOT NULL,
    request_id      BIGINT       NOT NULL,
    masjid_id       TEXT         REFERENCES masjid_registrations (masjid_id) ON DELETE SET NULL,
    to_addr         TEXT         NOT NULL,
    amount          NUMERIC(38)  NOT NULL,
    note_hash       TEXT         NOT NULL,
    proposer        TEXT         NOT NULL,
    expires_at      TIMESTAMPTZ  NOT NULL,
    approvals       INTEGER      NOT NULL DEFAULT 0,
    executed        BOOLEAN      NOT NULL DEFAULT FALSE,
    canceled        BOOLEAN      NOT NULL DEFAULT FALSE,
    executor        TEXT,
    canceled_by     TEXT,
    block_number    BIGINT       NOT NULL,
    tx_hash         TEXT         NOT NULL,
    proposed_at     TIMESTAMPTZ  NOT NULL,
    settled_at      TIMESTAMPTZ,
    UNIQUE (instance_addr, request_id)
);

CREATE INDEX idx_cashout_instance_addr   ON cash_out_requests (instance_addr);
CREATE INDEX idx_cashout_masjid_id       ON cash_out_requests (masjid_id);
CREATE INDEX idx_cashout_to_addr         ON cash_out_requests (to_addr);
CREATE INDEX idx_cashout_executed        ON cash_out_requests (executed);
CREATE INDEX idx_cashout_canceled        ON cash_out_requests (canceled);

CREATE INDEX idx_cashout_pending         ON cash_out_requests (instance_addr, executed, canceled)
    WHERE executed = FALSE AND canceled = FALSE;

CREATE TABLE cash_out_approvals (
    id              BIGSERIAL    PRIMARY KEY,
    instance_addr   TEXT         NOT NULL,
    request_id      BIGINT       NOT NULL,
    approver        TEXT         NOT NULL,
    approvals       INTEGER      NOT NULL,
    block_number    BIGINT       NOT NULL,
    tx_hash         TEXT         NOT NULL,
    approved_at     TIMESTAMPTZ  NOT NULL,
    UNIQUE (instance_addr, request_id, approver),
    FOREIGN KEY (instance_addr, request_id)
        REFERENCES cash_out_requests (instance_addr, request_id) ON DELETE CASCADE
);

CREATE INDEX idx_cashout_approvals_approver    ON cash_out_approvals (approver);
CREATE INDEX idx_cashout_approvals_request     ON cash_out_approvals (instance_addr, request_id);

CREATE TABLE verifiers (
    address       TEXT         PRIMARY KEY,
    label         TEXT         NOT NULL DEFAULT '',
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    added_at      TIMESTAMPTZ  NOT NULL,
    removed_at    TIMESTAMPTZ,
    block_number  BIGINT       NOT NULL,
    tx_hash       TEXT         NOT NULL
);

CREATE INDEX idx_verifiers_active ON verifiers (is_active);CREATE TABLE IF NOT EXISTS schema_migrations (
    version     TEXT        PRIMARY KEY,          -- e.g. '001', '002'
    description TEXT        NOT NULL DEFAULT '',
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version, description)
VALUES
    ('001', 'Initial schema: tables'),
    ('002', 'Views and migration tracking')
ON CONFLICT (version) DO NOTHING;

CREATE OR REPLACE VIEW v_masjid_summary AS
SELECT
    r.masjid_id,
    r.masjid_name,
    r.metadata_uri,
    r.proposer,
    r.masjid_admin,
    r.instance_addr,
    r.vault_addr,
    r.stablecoin,
    r.status,
    r.attest_yes,
    r.attest_no,
    r.registered_at,
    r.verified_at,
    r.updated_at,

    COUNT(DISTINCT ci.donor)            AS total_donors,
    COALESCE(SUM(ci.amount), 0)         AS total_donated,
    (
        SELECT ci2.new_balance
        FROM   cash_ins ci2
        WHERE  ci2.instance_addr = r.instance_addr
        ORDER  BY ci2.donated_at DESC
        LIMIT  1
    )                                   AS latest_balance,
    COUNT(DISTINCT co.id) FILTER (
        WHERE co.executed = FALSE
          AND co.canceled = FALSE
    )                                   AS pending_cashouts

FROM  masjid_registrations r
LEFT JOIN cash_ins ci
       ON ci.instance_addr = r.instance_addr
LEFT JOIN cash_out_requests co
       ON co.instance_addr = r.instance_addr

GROUP BY
    r.masjid_id,
    r.masjid_name,
    r.metadata_uri,
    r.proposer,
    r.masjid_admin,
    r.instance_addr,
    r.vault_addr,
    r.stablecoin,
    r.status,
    r.attest_yes,
    r.attest_no,
    r.registered_at,
    r.verified_at,
    r.updated_at;

CREATE OR REPLACE VIEW v_pending_registrations AS
SELECT
    r.masjid_id,
    r.masjid_name,
    r.metadata_uri,
    r.proposer,
    r.masjid_admin,
    r.instance_addr,
    r.status,
    r.attest_yes,
    r.attest_no,
    r.registered_at,
    r.updated_at,
    COALESCE(
        ARRAY_AGG(va.verifier) FILTER (WHERE va.verifier IS NOT NULL),
        '{}'
    )                           AS voted_verifiers
FROM  masjid_registrations r
LEFT  JOIN verifier_attests va ON va.masjid_id = r.masjid_id
WHERE r.status IN ('pending', 'flagged')
GROUP BY
    r.masjid_id, r.masjid_name, r.metadata_uri, r.proposer,
    r.masjid_admin, r.instance_addr, r.status, r.attest_yes,
    r.attest_no, r.registered_at, r.updated_at;

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

    r.masjid_name,
    r.stablecoin,
    (co.expires_at < NOW())     AS is_expired,
    COALESCE(
        ARRAY_AGG(ca.approver) FILTER (WHERE ca.approver IS NOT NULL),
        '{}'
    )                           AS approved_by

FROM  cash_out_requests co
LEFT  JOIN masjid_registrations r  ON r.masjid_id     = co.masjid_id
LEFT  JOIN cash_out_approvals   ca ON ca.instance_addr = co.instance_addr
                                  AND ca.request_id    = co.request_id

WHERE co.executed = FALSE
  AND co.canceled = FALSE

GROUP BY
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
    r.masjid_name,
    r.stablecoin;

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
        WHEN co.canceled                    THEN 'canceled'
        WHEN co.executed                    THEN 'executed'
        WHEN co.expires_at < NOW()          THEN 'expired'
        WHEN co.approvals >= 0              THEN 'pending'
        ELSE                                     'pending'
    END                         AS status_label,

    r.masjid_name,
    r.stablecoin,

    COALESCE(
        ARRAY_AGG(ca.approver) FILTER (WHERE ca.approver IS NOT NULL),
        '{}'
    )                           AS approved_by

FROM  cash_out_requests     co
LEFT  JOIN masjid_registrations r  ON r.masjid_id     = co.masjid_id
LEFT  JOIN cash_out_approvals   ca ON ca.instance_addr = co.instance_addr
                                  AND ca.request_id    = co.request_id

GROUP BY
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
    r.masjid_name,
    r.stablecoin;

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

    r.masjid_name,
    r.stablecoin

FROM  cash_ins ci
LEFT  JOIN masjid_registrations r ON r.instance_addr = ci.instance_addr

ORDER BY ci.donated_at DESC;

CREATE OR REPLACE VIEW v_masjid_donation_stats AS
SELECT
    ci.instance_addr,
    ci.masjid_id,
    r.masjid_name,

    COUNT(*)                            AS total_tx,
    COUNT(DISTINCT ci.donor)            AS unique_donors,
    COALESCE(SUM(ci.amount),   0)       AS total_donated,
    COALESCE(MAX(ci.new_balance), 0)    AS peak_balance,
    MIN(ci.donated_at)                  AS first_donation_at,
    MAX(ci.donated_at)                  AS last_donation_at

FROM  cash_ins ci
LEFT  JOIN masjid_registrations r ON r.instance_addr = ci.instance_addr

GROUP BY
    ci.instance_addr,
    ci.masjid_id,
    r.masjid_name;

CREATE OR REPLACE VIEW v_active_verifiers AS
SELECT
    address,
    label,
    added_at,
    block_number,
    tx_hash
FROM  verifiers
WHERE is_active = TRUE
ORDER BY added_at ASC;CREATE TYPE user_role AS ENUM ('admin', 'verifier', 'board', 'guest');

CREATE TABLE users (
    address     TEXT        PRIMARY KEY,
    name        TEXT        NOT NULL DEFAULT '',
    role        user_role   NOT NULL DEFAULT 'guest',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users (role);

INSERT INTO schema_migrations (version, description)
VALUES ('003', 'users table with role')
ON CONFLICT (version) DO NOTHING;
