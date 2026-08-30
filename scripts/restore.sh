#!/usr/bin/env bash
#
# CMG Case Dashboard — Restore a database from a backup archive.
#
# DANGER: this overwrites the schema and data of the target database.
# It runs with --clean --if-exists, so all existing objects in the target
# database are replaced by the backup. Requires explicit confirmation
# unless --yes is passed.
#
# Usage:
#   scripts/restore.sh <backup.dump> [--yes] [--into <target_database_url>]
#
#   --into   restore into a different target (default: DATABASE_URL from
#            .env.local). The target database must already exist.
#
# Documents stored in the uploads directory are NOT part of the .dump
# file. Restore them separately from the matching cmg_uploads_*.tar.gz
# archive created by scripts/backup.sh:
#   tar -xzf backups/cmg_uploads_<timestamp>.tar.gz   (restores ./uploads)
#
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <backup.dump> [--yes] [--into <url>]" >&2
  exit 1
fi

DUMP="${1:?dump file required}"
shift
YES=0
TARGET=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --yes) YES=1 ;;
    --into) TARGET="${2:?missing value}"; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

DUMP="$(cd "$(dirname "$DUMP")" && pwd)/$(basename "$DUMP")"
[ -f "$DUMP" ] || { echo "ERROR: backup file not found: $DUMP" >&2; exit 1; }

if [ -z "$TARGET" ]; then
  [ -f .env.local ] || { echo "ERROR: .env.local not found." >&2; exit 1; }
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
  TARGET="${DATABASE_URL:?DATABASE_URL is required}"
fi

# Display the target without leaking the embedded database password.
redact_url() {
  local url="$1" tail creds
  case "$url" in
    postgres://*|postgresql://*)
      tail="${url#*://}"
      creds="${tail%%@*}"
      if [ "$creds" != "$tail" ]; then
        tail="${tail#*@}"
        echo "postgres://${creds%%:*}:****@${tail}"
      else
        echo "$url"
      fi ;;
    *) echo "$url" ;;
  esac
}

echo "==> Restoring $DUMP"
echo "    into $(redact_url "$TARGET")"
echo "    This REPLACES all data in the target database."

if [ "$YES" -ne 1 ]; then
  read -r -p "Type 'restore' to continue: " CONFIRM
  [ "$CONFIRM" = "restore" ] || { echo "Aborted." >&2; exit 1; }
fi

pg_restore --clean --if-exists --no-owner --no-privileges -d "$TARGET" "$DUMP"
echo
echo "Restore complete. Verify with: scripts/verify-backup.sh $DUMP"