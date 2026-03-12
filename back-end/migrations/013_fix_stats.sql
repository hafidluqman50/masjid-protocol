UPDATE cash_ins ci
SET    masjid_id = m.id
FROM   masjids m
WHERE  LOWER(m.instance_addr) = LOWER(ci.instance_addr)
  AND  ci.masjid_id IS NULL;

DROP VIEW IF EXISTS v_masjid_donation_stats;

CREATE VIEW v_masjid_donation_stats AS
SELECT
    ci.instance_addr,
    m.masjid_id,
    m.masjid_name,

    COUNT(*)                         AS total_donations,
    COUNT(DISTINCT ci.donor)         AS total_donors,
    COALESCE(SUM(ci.amount), 0)      AS total_amount,
    COALESCE(MAX(ci.new_balance), 0) AS peak_balance,
    MIN(ci.donated_at)               AS first_donation_at,
    MAX(ci.donated_at)               AS last_donated_at

FROM  cash_ins ci
LEFT  JOIN masjids m ON m.id = ci.masjid_id

GROUP BY
    ci.instance_addr,
    m.masjid_id,
    m.masjid_name;

INSERT INTO schema_migrations (version, description)
VALUES ('013', 'Fix cash_ins NULL masjid_id; rename stats view columns to match frontend')
ON CONFLICT (version) DO NOTHING;
