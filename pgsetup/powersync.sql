-- Create the PowerSync role (only if it doesn't exist)
SELECT format('CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD %L', :'ps_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'powersync_role') \gexec

-- Read-only access (safe to repeat)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;

-- Create the publication (only if it doesn't exist)
SELECT 'CREATE PUBLICATION powersync FOR ALL TABLES'
WHERE NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') \gexec

-- Storage database for PowerSync (only if it doesn't exist)
SELECT format('CREATE ROLE powersync_storage_user LOGIN PASSWORD %L', :'storage_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'powersync_storage_user') \gexec

SELECT 'CREATE DATABASE powersync_storage OWNER powersync_storage_user'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'powersync_storage') \gexec

-- Always sync passwords from .env
SELECT format('ALTER ROLE powersync_role PASSWORD %L', :'ps_password') \gexec
SELECT format('ALTER ROLE powersync_storage_user PASSWORD %L', :'storage_password') \gexec