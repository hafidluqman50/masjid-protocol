-- 010: Add surrogate BIGSERIAL ids to users, masjids, verifiers
-- Natural keys (address, masjid_id) demoted to UNIQUE NOT NULL.
-- FK columns in dependent tables still reference the natural UNIQUE key —
-- PostgreSQL allows FK to any UNIQUE column, not only PK.

-- ── users ─────────────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN id BIGSERIAL;
ALTER TABLE users DROP CONSTRAINT users_pkey;
ALTER TABLE users ADD CONSTRAINT users_pkey      PRIMARY KEY (id);
ALTER TABLE users ADD CONSTRAINT users_address_key UNIQUE (address);

-- ── verifiers ─────────────────────────────────────────────────────────────────
ALTER TABLE verifiers ADD COLUMN id BIGSERIAL;
ALTER TABLE verifiers DROP CONSTRAINT verifiers_pkey;
ALTER TABLE verifiers ADD CONSTRAINT verifiers_pkey        PRIMARY KEY (id);
ALTER TABLE verifiers ADD CONSTRAINT verifiers_address_key UNIQUE (address);

-- ── masjids ───────────────────────────────────────────────────────────────────
-- Must drop FK deps first, then restore after PK swap.

ALTER TABLE masjid_attests DROP CONSTRAINT IF EXISTS masjid_attests_masjid_id_fkey;
ALTER TABLE cash_ins       DROP CONSTRAINT IF EXISTS cash_ins_masjid_id_fkey;
ALTER TABLE cash_outs      DROP CONSTRAINT IF EXISTS cash_outs_masjid_id_fkey;
ALTER TABLE cash_outs      DROP CONSTRAINT IF EXISTS cash_out_requests_masjid_id_fkey;

ALTER TABLE masjids ADD COLUMN id BIGSERIAL;
ALTER TABLE masjids DROP CONSTRAINT IF EXISTS masjids_pkey;
ALTER TABLE masjids DROP CONSTRAINT IF EXISTS masjid_registrations_pkey;
ALTER TABLE masjids ADD CONSTRAINT masjids_pkey          PRIMARY KEY (id);
ALTER TABLE masjids ADD CONSTRAINT masjids_masjid_id_key UNIQUE (masjid_id);

-- Restore FK constraints — now referencing UNIQUE(masjid_id) instead of PK
ALTER TABLE masjid_attests
    ADD CONSTRAINT masjid_attests_masjid_id_fkey
    FOREIGN KEY (masjid_id) REFERENCES masjids (masjid_id) ON DELETE CASCADE;

ALTER TABLE cash_ins
    ADD CONSTRAINT cash_ins_masjid_id_fkey
    FOREIGN KEY (masjid_id) REFERENCES masjids (masjid_id) ON DELETE SET NULL;

ALTER TABLE cash_outs
    ADD CONSTRAINT cash_outs_masjid_id_fkey
    FOREIGN KEY (masjid_id) REFERENCES masjids (masjid_id) ON DELETE SET NULL;

INSERT INTO schema_migrations (version, description)
VALUES ('010', 'surrogate BIGSERIAL ids for users, masjids, verifiers')
ON CONFLICT (version) DO NOTHING;
