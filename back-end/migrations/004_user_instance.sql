ALTER TABLE users ADD COLUMN IF NOT EXISTS instance_addr TEXT;

CREATE INDEX IF NOT EXISTS idx_users_instance_addr ON users (instance_addr);

INSERT INTO schema_migrations (version, description)
VALUES ('004', 'add instance_addr to users')
ON CONFLICT (version) DO NOTHING;
