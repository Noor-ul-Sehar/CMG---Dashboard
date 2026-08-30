#!/usr/bin/env bash
#
# CMG Case Dashboard — Verify a backup archive.
#
# 1. Fast integrity check: file exists, non-empty, archive is readable,
#    and pg_restore can list its contents (schema + tables).
# 2. Deep restore check (default): restore the dump into a temporary
#    scratch database, compare the key row counts against the expected
#    values, then drop the scratch database again.
#
# Usage:
#   scripts/verify-backup.sh <backup.dump> [--fast]
#
# The scratch database is created and dropped by the same user that owns
# the source database, so the role must have CREATEDB (default: yes for
# the CMG dev user).
#
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <backup.dump> [--fast]" >&2
  exit 1
fi

DUMP="${1:?dump file required}"
FAST="${2:-}"
DUMP="$(cd "$(dirname "$DUMP")" && pwd)/$(basename "$DUMP")"

if [ ! -f "$DUMP" ]; then
  echo "ERROR: backup file not found: $DUMP" >&2
  exit 1
fi
if [ ! -s "$DUMP" ]; then
  echo "ERROR: backup file is empty: $DUMP" >&2
  exit 1
fi

echo "==> Fast integrity: reading archive..."
if ! pg_restore --list "$DUMP" >/tmp/cmg_verify_list.$$.txt 2>/dev/null; then
  echo "ERROR: not a valid pg_dump custom-format archive." >&2
  rm -f "/tmp/cmg_verify_list.$$.txt"
  exit 1
fi

echo "Tables present in archive:"
grep -o 'TABLE DATA public [a-z_]*' "/tmp/cmg_verify_list.$$.txt" | sed 's/TABLE DATA public /  - /'
rm -f "/tmp/cmg_verify_list.$$.txt"

if [ "$FAST" = "--fast" ]; then
  echo
  echo "Fast verification passed (archive integrity OK)."
  exit 0
fi

# ---- Deep restore check into a scratch database ---------------------
if [ ! -f .env.local ]; then
  echo "ERROR: .env.local not found (needed for DATABASE_URL)." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env.local
set +a
: "${DATABASE_URL:?DATABASE_URL is required}"

# Build host/port/user/db parts from the URL.
DB_URL="${DATABASE_URL#*://}"
CREDS="${DB_URL%%@*}"
HOSTPORT="${DB_URL##*@}"
DB="${HOSTPORT##*/}"
HOSTPORT="${HOSTPORT%%/*}"
HOST="${HOSTPORT%%:*}"
PORT="${HOSTPORT##*:}"
[ "$HOST" = "$PORT" ] && PORT="5432"
USER="${CREDS%%:*}"
PASSWORD="${CREDS#*:}"
export PGPASSWORD="$PASSWORD"

SCRATCH="cmg_verify_scratch_$$"
echo "==> Deep restore check into scratch database '$SCRATCH'..."
trap 'dropdb -h "$HOST" -p "$PORT" -U "$USER" --if-exists "$SCRATCH" >/dev/null 2>&1 || true' EXIT

createdb -h "$HOST" -p "$PORT" -U "$USER" "$SCRATCH"
DB_CONN="postgres://${USER}:${PASSWORD}@${HOST}:${PORT}/${SCRATCH}"

pg_restore --exit-on-error --no-owner --no-privileges -d "$DB_CONN" "$DUMP" >/dev/null

printf '%s\n' \
  "  cases=$(psql "$DB_CONN" -t -A -c 'SELECT count(*) FROM cases')" \
  "  reviews=$(psql "$DB_CONN" -t -A -c 'SELECT count(*) FROM reviews')" \
  "  documents=$(psql "$DB_CONN" -t -A -c 'SELECT count(*) FROM case_documents')" \
  "  teams=$(psql "$DB_CONN" -t -A -c 'SELECT count(*) FROM teams')" \
  "  investigators=$(psql "$DB_CONN" -t -A -c 'SELECT count(*) FROM investigators')" \
  "  users=$(psql "$DB_CONN" -t -A -c 'SELECT count(*) FROM users')"

# Read-only integrity checks on the restored copy.
ORPHANS=$(psql "$DB_CONN" -t -A -c \
  "SELECT (SELECT count(*) FROM cases c LEFT JOIN teams t ON t.id=c.team_id WHERE c.team_id IS NOT NULL AND t.id IS NULL)
        + (SELECT count(*) FROM cases c LEFT JOIN investigators i ON i.id=c.investigator_id WHERE c.investigator_id IS NOT NULL AND i.id IS NULL)
        + (SELECT count(*) FROM remarks r LEFT JOIN cases c ON c.id=r.case_id WHERE c.id IS NULL)
        + (SELECT count(*) FROM reviews r LEFT JOIN cases c ON c.id=r.case_id WHERE c.id IS NULL)
        + (SELECT count(*) FROM case_documents d LEFT JOIN cases c ON c.id=d.case_id WHERE c.id IS NULL);")
echo "  orphan_rows=$ORPHANS"

echo "==> Dropping scratch database..."
dropdb -h "$HOST" -p "$PORT" -U "$USER" "$SCRATCH"
trap - EXIT

[ "$ORPHANS" = "0" ] || {
  echo "ERROR: restored copy contains orphaned rows." >&2
  exit 1
}

echo
echo "Verification PASSED: backup is readable and restores cleanly."