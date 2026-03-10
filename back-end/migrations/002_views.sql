CREATE TABLE IF NOT EXISTS schema_migrations (
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
ORDER BY added_at ASC;