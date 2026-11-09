#!/usr/bin/env bash
# Restore a dump made by backup.sh into the production stack. DESTROYS the current database.
#
#   deployment/backup/restore.sh backups/internalx_20261109_021500.sql.gz
#
# Tip: restore into a scratch copy first (second compose project / other host) and look at it,
# before overwriting production. Practise this before you need it.
set -euo pipefail

FILE="${1:-}"
[ -n "$FILE" ] && [ -f "$FILE" ] || { echo "usage: $0 <dump.sql.gz>" >&2; exit 1; }

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO"
env_get() { grep -E "^$1=" .env | tail -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
DB_USER="$(env_get POSTGRES_USER)";  DB_USER="${DB_USER:-internalx}"
DB_NAME="$(env_get POSTGRES_DB)";    DB_NAME="${DB_NAME:-internalx}"

echo "This will DROP and recreate database '$DB_NAME' and load $FILE."
read -r -p "Type the database name to continue: " answer
[ "$answer" = "$DB_NAME" ] || { echo "aborted"; exit 1; }

echo "[restore] stopping the app"
docker compose stop app

docker compose exec -T db psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" >/dev/null
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\";"

echo "[restore] loading dump"
gzip -dc "$FILE" | docker compose exec -T db psql -v ON_ERROR_STOP=1 -q -U "$DB_USER" -d "$DB_NAME"

echo "[restore] starting the app (pending migrations, if the dump is older, apply at boot)"
docker compose start app
echo "[restore] done. Check: curl -s http://127.0.0.1:\${APP_PORT:-5000}/api/ready"
