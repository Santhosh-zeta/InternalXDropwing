#!/bin/bash
# backup.sh - Performs a logical dump of the PostgreSQL database

# Load environment variables
source ../.env

# Defaults
BACKUP_DIR=${BACKUP_DIR:-"../backups"}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
CONTAINER_NAME="dgos_postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${POSTGRES_DB}_backup_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup for $POSTGRES_DB..."

# Execute pg_dump inside the container and compress it
docker exec "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Backup successfully created at: $BACKUP_FILE"
  
  # Remove backups older than retention period
  echo "Cleaning up backups older than $RETENTION_DAYS days..."
  find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +$RETENTION_DAYS -exec rm -f {} \;
  echo "Cleanup complete."
else
  echo "❌ Backup failed!"
  # Delete the corrupted/incomplete file
  rm -f "$BACKUP_FILE"
  exit 1
fi
