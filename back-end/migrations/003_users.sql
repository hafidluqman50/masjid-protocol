CREATE TYPE user_role AS ENUM ('admin', 'verifier', 'board', 'guest');

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
