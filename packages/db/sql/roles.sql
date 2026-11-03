-- Least-privilege database roles. Run once per environment as a superuser:
--
--   psql "$SUPERUSER_URL" -v db=ritechs -v owner_pw="'…'" -v app_pw="'…'" -f packages/db/sql/roles.sql
--
-- ritechs_owner  owns the schema; used ONLY by `npm run db:migrate` (MIGRATION_DATABASE_URL).
-- ritechs_app    used by the API and worker (DATABASE_URL). It can read and write rows,
--                but cannot create, alter or drop tables, so a compromised app process
--                cannot destroy the schema or disable the audit-log trigger.

CREATE ROLE ritechs_owner LOGIN PASSWORD :owner_pw;
CREATE ROLE ritechs_app   LOGIN PASSWORD :app_pw CONNECTION LIMIT 60;

ALTER DATABASE :db OWNER TO ritechs_owner;
\connect :db
ALTER SCHEMA public OWNER TO ritechs_owner;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO ritechs_app;

-- Existing and future tables/sequences created by the owner.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ritechs_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ritechs_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ritechs_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ritechs_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ritechs_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ritechs_app;

-- The app may only append to the audit log.
-- UPDATE/TRUNCATE are revoked outright; DELETE stays because the trigger only allows the
-- retention purge (rows older than 400 days, explicit opt-in) and blocks everything else.
REVOKE UPDATE, TRUNCATE ON audit_logs FROM ritechs_app;

-- Guard rails against runaway queries and idle transactions holding locks.
ALTER ROLE ritechs_app SET statement_timeout = '10s';
ALTER ROLE ritechs_app SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE ritechs_app SET lock_timeout = '5s';
