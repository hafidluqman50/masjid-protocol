-- Rename masjid_registrations → masjids
-- Also update FK constraints and indexes that reference the old name.

ALTER TABLE verifier_attests DROP CONSTRAINT IF EXISTS verifier_attests_masjid_id_fkey;
ALTER TABLE cash_ins DROP CONSTRAINT IF EXISTS cash_ins_masjid_id_fkey;
ALTER TABLE cash_out_requests DROP CONSTRAINT IF EXISTS cash_out_requests_masjid_id_fkey;

ALTER TABLE masjid_registrations RENAME TO masjids;

-- Rename indexes
ALTER INDEX idx_registrations_status        RENAME TO idx_masjids_status;
ALTER INDEX idx_registrations_proposer      RENAME TO idx_masjids_proposer;
ALTER INDEX idx_registrations_masjid_admin  RENAME TO idx_masjids_masjid_admin;
ALTER INDEX idx_registrations_instance_addr RENAME TO idx_masjids_instance_addr;

-- Restore foreign key constraints pointing to the renamed table
ALTER TABLE verifier_attests
    ADD CONSTRAINT verifier_attests_masjid_id_fkey
    FOREIGN KEY (masjid_id) REFERENCES masjids (masjid_id) ON DELETE CASCADE;

ALTER TABLE cash_ins
    ADD CONSTRAINT cash_ins_masjid_id_fkey
    FOREIGN KEY (masjid_id) REFERENCES masjids (masjid_id) ON DELETE SET NULL;

ALTER TABLE cash_out_requests
    ADD CONSTRAINT cash_out_requests_masjid_id_fkey
    FOREIGN KEY (masjid_id) REFERENCES masjids (masjid_id) ON DELETE SET NULL;
