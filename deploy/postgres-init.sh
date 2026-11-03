#!/bin/sh
# Runs once, when the Postgres volume is first created: adds the
# least-privilege application role (see packages/db/sql/roles.sql).
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE ROLE ritechs_app LOGIN PASSWORD '${DB_APP_PASSWORD}' CONNECTION LIMIT 60;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO ritechs_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ritechs_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ritechs_app;
ALTER ROLE ritechs_app SET statement_timeout = '10s';
ALTER ROLE ritechs_app SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE ritechs_app SET lock_timeout = '5s';
SQL
