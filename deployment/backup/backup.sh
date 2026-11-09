#!/usr/bin/env bash
# Nightly logical backup of the production database (docker-compose.yml stack).
#
#   deployment/backup/backup.sh            # run from anywhere; uses the repo's .env
#
# Writes   $BACKUP_DIR/internalx_YYYYmmdd_HHMMSS.sql.gz   (default BACKUP_DIR=<repo>/backups)
# Keeps    $BACKUP_RETENTION_DAYS days (default 14), deletes older dumps.
# Schedule it: see deployment/backup/internalx-backup.cron or the systemd timer next to it.
#
# This backs up the DATABASE. Uploaded documents live in the `uploads` volume: copy it too
# (see docs/production-checklist.md, "Backups").
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO"

# Load .env without executing it (values may contain shell metacharacters).
env_get() { grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
DB_USER="$(env_get POSTGRES_USER)";  DB_USER="${DB_USER:-internalx}"
DB_NAME="$(env_get POSTGRES_DB)";    DB_NAME="${DB_NAME:-internalx}"

BACKUP_DIR="${BACKUP_DIR:-$REPO/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
umask 077   # dumps contain password hashes and personal data

STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$BACKUP_DIR/internalx_${STAMP}.sql.gz"
TMP="$OUT.partial"

echo "[backup] dumping $DB_NAME -> $OUT"
if docker compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges | gzip -9 > "$TMP"; then
  # a dump that is only gzip's header means pg_dump produced nothing
  if [ "$(gzip -dc "$TMP" | wc -c)" -lt 1024 ]; then
    rm -f "$TMP"; echo "[backup] FAILED: dump is empty" >&2; exit 1
  fi
  mv "$TMP" "$OUT"
else
  rm -f "$TMP"; echo "[backup] FAILED: pg_dump error" >&2; exit 1
fi

find "$BACKUP_DIR" -type f -name 'internalx_*.sql.gz' -mtime +"$RETENTION_DAYS" -print -delete | sed 's/^/[backup] pruned /'
echo "[backup] ok ($(du -h "$OUT" | cut -f1))"
