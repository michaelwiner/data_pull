#!/usr/bin/env bash
# Apply the migrations to a throwaway Postgres and run the RLS security tests.
#
# Needs a local Postgres 16 server. The Supabase-specific pieces this schema
# leans on (the auth schema, auth.uid(), the anon/authenticated roles) are
# stubbed by tests/sql/00_supabase_shim.sql.
#
#   ./scripts/db-test.sh
set -euo pipefail

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGHOST="${PGHOST:-/tmp/pgrun}"
PGPORT="${PGPORT:-5433}"
PGUSER="${PGUSER:-postgres}"
DB="${DB:-benefits_rls_$$}"

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() { psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -q \
  -c "drop database if exists $DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

createdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$DB"

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$DB" -v ON_ERROR_STOP=1 -q \
  -f "$here/tests/sql/00_supabase_shim.sql" \
  -f "$here/supabase/migrations/0001_init.sql" \
  -f "$here/supabase/migrations/0002_functions.sql"

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$DB" -v ON_ERROR_STOP=1 -q \
  -f "$here/tests/sql/01_rls_test.sql"
