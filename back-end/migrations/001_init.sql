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

CREATE INDEX idx_verifiers_active ON verifiers (is_active);