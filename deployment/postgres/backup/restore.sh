#!/bin/bash
# restore.sh - Restores a logical dump of the PostgreSQL database

if [ -z "$1" ]; then
  echo "Usage: ./restore.sh <path_to_backup.sql.gz>"
  echo "Example: ./restore.sh ../backups/internalx_backup_20260610_120000.sql.gz"
  exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file '$BACKUP_FILE' not found."
  exit 1
fi

# Load environment variables
source ../.env

CONTAINER_NAME="dgos_postgres"

echo "⚠️ WARNING: This will OVERWRITE the current database '$POSTGRES_DB'!"
read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore aborted."
    exit 1
fi

echo "Starting restore process..."

# We need to terminate existing connections to drop the database safely
echo "Terminating active connections to $POSTGRES_DB..."
docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();"

echo "Dropping and recreating the database..."
docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE $POSTGRES_DB;"

echo "Restoring data from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

if [ $? -eq 0 ]; then
  echo "✅ Restore completed successfully."
else
  echo "❌ Restore failed!"
  exit 1
fi
