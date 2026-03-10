DROP VIEW IF EXISTS v_active_verifiers        CASCADE;
DROP VIEW IF EXISTS v_masjid_donation_stats   CASCADE;
DROP VIEW IF EXISTS v_donation_feed           CASCADE;
DROP VIEW IF EXISTS v_cashout_history         CASCADE;
DROP VIEW IF EXISTS v_pending_cashouts        CASCADE;
DROP VIEW IF EXISTS v_pending_registrations   CASCADE;
DROP VIEW IF EXISTS v_masjid_summary          CASCADE;

DROP TABLE IF EXISTS cash_out_approvals       CASCADE;
DROP TABLE IF EXISTS cash_out_requests        CASCADE;
DROP TABLE IF EXISTS cash_ins                 CASCADE;
DROP TABLE IF EXISTS verifier_attests         CASCADE;
DROP TABLE IF EXISTS verifiers                CASCADE;
DROP TABLE IF EXISTS schema_migrations        CASCADE;
DROP TABLE IF EXISTS indexer_checkpoints      CASCADE;
DROP TABLE IF EXISTS masjid_registrations     CASCADE;

DROP TYPE IF EXISTS verification_status       CASCADE;
DROP TYPE IF EXISTS registration_status       CASCADE;