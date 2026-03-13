UPDATE cash_outs co
SET    masjid_id = m.id
FROM   masjids m
WHERE  LOWER(m.instance_addr) = LOWER(co.instance_addr)
  AND  co.masjid_id IS NULL;

INSERT INTO schema_migrations (version, description)
VALUES ('014', 'Fix cash_outs NULL masjid_id by backfilling from instance_addr')
ON CONFLICT (version) DO NOTHING;
