DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_role;
DELETE FROM schema_migrations WHERE version = '003';
