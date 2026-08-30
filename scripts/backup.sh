#!/usr/bin/env bash
#
# CMG Case Dashboard — Database + document backup.
#
# Creates a PostgreSQL custom-format dump (schema + data, no owner/ACLs)
# and a compressed archive of the private uploads directory.
#
# Existing backups are NEVER deleted or overwritten — every run produces
# a unique, timestamped file.
#
# Usage:
#   scripts/backup.sh
#
# Env overrides:
#   BACKUP_DIR  directory to write backups into (default: ./backups)
#   UPLOAD_DIR  private document storage root     (default: ./uploads)
#
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "ERROR: .env.local not found. Create it from .env.example first." >&2
  exit 1
fi

# Load DATABASE_URL (and any other vars) from .env.local.
set -a
# shellcheck disable=SC1091
source .env.local
set +a

: "${DATABASE_URL:?DATABASE_URL is required (set it in .env.local)}"

BACKUP_DIR="${BACKUP_DIR:-backups}"
UPLOAD_DIR="${UPLOAD_DIR:-uploads}"
mkdir -p "$BACKUP_DIR"

TS="$(date +%Y%m%d_%H%M%S)"
DB_OUT="$BACKUP_DIR/cmg_case_dashboard_${TS}.dump"
UPLOADS_OUT="$BACKUP_DIR/cmg_uploads_${TS}.tar.gz"

echo "==> Backing up PostgreSQL database -> $DB_OUT"
pg_dump --format=custom --no-owner --no-privileges -d "$DATABASE_URL" -f "$DB_OUT"

if [ -d "$UPLOAD_DIR" ] && [ -n "$(ls -A "$UPLOAD_DIR" 2>/dev/null || true)" ]; then
  echo "==> Backing up private documents -> $UPLOADS_OUT"
  tar -czf "$UPLOADS_OUT" "$UPLOAD_DIR"
else
  echo "==> No documents in $UPLOAD_DIR; skipping the documents archive."
fi

echo
echo "Backup complete:"
ls -lh "$BACKUP_DIR" | grep "$TS"
echo
echo "Next step: run  scripts/verify-backup.sh $DB_OUT"