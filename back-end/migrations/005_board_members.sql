ALTER TABLE users DROP COLUMN IF EXISTS instance_addr;

CREATE TABLE board_members (
    id            BIGSERIAL    PRIMARY KEY,
    member_addr   TEXT         NOT NULL,
    instance_addr TEXT         NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    added_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    block_number  BIGINT       NOT NULL DEFAULT 0,
    tx_hash       TEXT         NOT NULL DEFAULT '',
    UNIQUE (member_addr, instance_addr)
);

CREATE INDEX idx_board_members_member   ON board_members (LOWER(member_addr));
CREATE INDEX idx_board_members_instance ON board_members (LOWER(instance_addr));

INSERT INTO schema_migrations (version, description)
VALUES ('005', 'board_members table')
ON CONFLICT (version) DO NOTHING;
