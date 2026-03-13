-- Seed admin wallet
INSERT INTO users (address, name, role)
VALUES (lower('0x5617007a51331f4e7241DE852cDc4Bbbe723CAE4'), 'Admin', 'admin')
ON CONFLICT (address) DO UPDATE SET role = 'admin', updated_at = NOW();

INSERT INTO schema_migrations (version, description)
VALUES ('009', 'seed admin wallet')
ON CONFLICT (version) DO NOTHING;
