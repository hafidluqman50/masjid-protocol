-- 011: Change FK columns in relation tables from TEXT to BIGINT
-- masjid_attests.masjid_id, cash_ins.masjid_id, cash_outs.masjid_id
-- now reference masjids.id (BIGINT) instead of masjids.masjid_id (TEXT).
-- Data is preserved via UPDATE ... FROM JOIN before old columns are dropped.
-- Views are recreated to expose m.masjid_id (TEXT bytes32) for external API
-- compatibility — no frontend changes needed.

-- ── masjid_attests ────────────────────────────────────────────────────────────

ALTER TABLE masjid_attests DROP CONSTRAINT IF EXISTS masjid_attests_masjid_id_fkey;
ALTER TABLE masjid_attests DROP CONSTRAINT IF EXISTS masjid_attests_masjid_id_verifier_key;
DROP INDEX   IF EXISTS idx_masjid_attests_masjid_id;

ALTER TABLE masjid_attests ADD COLUMN masjid_ref BIGINT;

UPDATE masjid_attests ma
SET    masjid_ref = m.id
FROM   masjids m
WHERE  m.masjid_id = ma.masjid_id;

ALTER TABLE masjid_attests DROP COLUMN masjid_id;
ALTER TABLE masjid_attests RENAME COLUMN masjid_ref TO masjid_id;
ALTER TABLE masjid_attests ALTER COLUMN masjid_id SET NOT NULL;

ALTER TABLE masjid_attests
    ADD CONSTRAINT masjid_attests_masjid_id_fkey
    FOREIGN KEY (masjid_id) REFERENCES masjids (id) ON DELETE CASCADE;

ALTER TABLE masjid_attests
    ADD CONSTRAINT masjid_attests_masjid_id_verifier_key
    UNIQUE (masjid_id, verifier);

CREATE INDEX idx_masjid_attests_masjid_id ON masjid_attests (masjid_id);

-- ── cash_ins ──────────────────────────────────────────────────────────────────

ALTER TABLE cash_ins DROP CONSTRAINT IF EXISTS cash_ins_masjid_id_fkey;
DROP INDEX   IF EXISTS idx_cash_ins_masjid_id;

ALTER TABLE cash_ins ADD COLUMN masjid_ref BIGINT;

UPDATE cash_ins ci
SET    masjid_ref = m.id
FROM   masjids m
WHERE  m.masjid_id = ci.masjid_id;

ALTER TABLE cash_ins DROP COLUMN masjid_id;
ALTER TABLE cash_ins RENAME COLUMN masjid_ref TO masjid_id;
-- nullable (SET NULL on cascade)

ALTER TABLE cash_ins
    ADD CONSTRAINT cash_ins_masjid_id_fkey
    FOREIGN KEY (masjid_id) REFERENCES masjids (id) ON DELETE SET NULL;

CREATE INDEX idx_cash_ins_masjid_id ON cash_ins (masjid_id);

-- ── cash_outs ─────────────────────────────────────────────────────────────────

ALTER TABLE cash_outs DROP CONSTRAINT IF EXISTS cash_outs_masjid_id_fkey;
ALTER TABLE cash_outs DROP CONSTRAINT IF EXISTS cash_out_requests_masjid_id_fkey;
DROP INDEX   IF EXISTS idx_cash_outs_masjid_id;

ALTER TABLE cash_outs ADD COLUMN masjid_ref BIGINT;

UPDATE cash_outs co
SET    masjid_ref = m.id
FROM   masjids m
WHERE  m.masjid_id = co.masjid_id;

ALTER TABLE cash_outs DROP COLUMN masjid_id;
ALTER TABLE cash_outs RENAME COLUMN masjid_ref TO masjid_id;
-- nullable

ALTER TABLE cash_outs
    ADD CONSTRAINT cash_outs_masjid_id_fkey
    FOREIGN KEY (masjid_id) REFERENCES masjids (id) ON DELETE SET NULL;

CREATE INDEX idx_cash_outs_masjid_id ON cash_outs (masjid_id);

-- ── Recreate views ────────────────────────────────────────────────────────────
-- Views expose m.masjid_id (TEXT bytes32) so external API is unchanged.
-- Internal joins now use integer id.

DROP VIEW IF EXISTS v_masjid_summary        CASCADE;
DROP VIEW IF EXISTS v_pending_registrations CASCADE;
DROP VIEW IF EXISTS v_pending_cashouts      CASCADE;
DROP VIEW IF EXISTS v_cashout_history       CASCADE;
DROP VIEW IF EXISTS v_donation_feed         CASCADE;
DROP VIEW IF EXISTS v_masjid_donation_stats CASCADE;

CREATE VIEW v_masjid_summary AS
SELECT
    m.id,
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

    COUNT(DISTINCT ci.donor)    AS total_donors,
    COALESCE(SUM(ci.amount), 0) AS total_donated,
    (
        SELECT ci2.new_balance
        FROM   cash_ins ci2
        WHERE  ci2.instance_addr = m.instance_addr
        ORDER  BY ci2.donated_at DESC
        LIMIT  1
    )                           AS latest_balance,
    COUNT(DISTINCT co.id) FILTER (
        WHERE co.executed = FALSE AND co.canceled = FALSE
    )                           AS pending_cashouts

FROM  masjids m
LEFT JOIN cash_ins ci  ON ci.instance_addr = m.instance_addr
LEFT JOIN cash_outs co ON co.instance_addr = m.instance_addr

GROUP BY
    m.id, m.masjid_id, m.masjid_name, m.metadata_uri, m.proposer,
    m.masjid_admin, m.instance_addr, m.vault_addr, m.stablecoin,
    m.cash_out_threshold, m.status, m.attest_yes, m.attest_no,
    m.registered_at, m.verified_at, m.updated_at;

-- v_pending_registrations: expose m.id (BIGINT) for subquery joins in ListPendingForVerifier
CREATE VIEW v_pending_registrations AS
SELECT
    m.id,
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
LEFT  JOIN masjid_attests ma ON ma.masjid_id = m.id
WHERE m.status = 'pending'
GROUP BY
    m.id, m.masjid_id, m.name_hash, m.proposer, m.masjid_name, m.metadata_uri,
    m.stablecoin, m.cash_out_threshold, m.attest_yes, m.attest_no,
    m.registered_at, m.updated_at;

CREATE VIEW v_pending_cashouts AS
SELECT
    co.id,
    co.instance_addr,
    co.request_id,
    m.masjid_id,
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
LEFT  JOIN masjids m         ON m.id         = co.masjid_id
LEFT  JOIN cash_out_votes cv ON cv.instance_addr = co.instance_addr
                             AND cv.request_id    = co.request_id

WHERE co.executed = FALSE
  AND co.canceled = FALSE

GROUP BY
    co.id, co.instance_addr, co.request_id, m.masjid_id,
    co.to_addr, co.amount, co.note_hash, co.proposer,
    co.approvals, co.expires_at, co.proposed_at,
    co.block_number, co.tx_hash, m.masjid_name, m.stablecoin;

CREATE VIEW v_cashout_history AS
SELECT
    co.id,
    co.instance_addr,
    co.request_id,
    m.masjid_id,
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
LEFT  JOIN masjids m         ON m.id         = co.masjid_id
LEFT  JOIN cash_out_votes cv ON cv.instance_addr = co.instance_addr
                             AND cv.request_id    = co.request_id

GROUP BY
    co.id, co.instance_addr, co.request_id, m.masjid_id,
    co.to_addr, co.amount, co.note_hash, co.proposer,
    co.approvals, co.expires_at, co.executed, co.canceled,
    co.executor, co.canceled_by, co.proposed_at, co.settled_at,
    m.masjid_name, m.stablecoin;

CREATE VIEW v_donation_feed AS
SELECT
    ci.id,
    ci.instance_addr,
    m.masjid_id,
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
LEFT  JOIN masjids m ON m.id = ci.masjid_id

ORDER BY ci.donated_at DESC;

CREATE VIEW v_masjid_donation_stats AS
SELECT
    ci.instance_addr,
    m.masjid_id,
    m.masjid_name,

    COUNT(*)                         AS total_tx,
    COUNT(DISTINCT ci.donor)         AS unique_donors,
    COALESCE(SUM(ci.amount), 0)      AS total_donated,
    COALESCE(MAX(ci.new_balance), 0) AS peak_balance,
    MIN(ci.donated_at)               AS first_donation_at,
    MAX(ci.donated_at)               AS last_donation_at

FROM  cash_ins ci
LEFT  JOIN masjids m ON m.id = ci.masjid_id

GROUP BY
    ci.instance_addr,
    m.masjid_id,
    m.masjid_name;

INSERT INTO schema_migrations (version, description)
VALUES ('011', 'integer FKs: masjid_attests/cash_ins/cash_outs masjid_id → BIGINT → masjids(id)')
ON CONFLICT (version) DO NOTHING;
