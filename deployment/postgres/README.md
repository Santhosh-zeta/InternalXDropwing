# DGOS / InternalX - PostgreSQL Deployment

This directory contains the production-ready deployment package for the DGOS / InternalX PostgreSQL 16 database.

## Architecture Highlights
- **PostgreSQL 16**: Using the official Alpine image for a minimal footprint.
- **Persistent Storage**: Uses a Docker volume (`postgres_data`) to ensure data survives container restarts.
- **Initialization**: Automatically loads schemas, indexes, and seed data from the `init/` directory on first startup.
- **Health Checks**: Monitors the database connection to ensure readiness before dependent services connect.
- **SSL-Ready**: Can be easily configured with SSL certificates by uncommenting the relevant sections in `docker-compose.yml`.

## Deployment Steps (Ubuntu VPS)

### 1. Prerequisites
Ensure Docker and Docker Compose are installed on your VPS.
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
```

### 2. Configuration
Copy the `.env.example` file to `.env` and set a secure password.
```bash
cp .env.example .env
nano .env  # Update POSTGRES_PASSWORD
```

### 3. Startup
Start the database in detached mode.
```bash
docker compose up -d
```

On the very first startup, PostgreSQL will run the scripts inside the `init/` directory in alphabetical order. 
Check the logs to ensure initialization was successful:
```bash
docker compose logs -f
```

### Schema changes
The `init/` scripts only run on an empty data directory. After that the schema is
managed by the numbered SQL files in `backend/migrations/`, which the backend applies
automatically at boot (`AUTO_MIGRATE=false` to opt out, then `npm run migrate`).
See `docs/production-checklist.md`.

## Backups & Restores

Scripts are provided in the `backup/` directory to manage logical backups.

### Set up automated daily backups
Add a cron job to run the backup script daily at 2:00 AM.
```bash
# Make scripts executable
chmod +x backup/backup.sh backup/restore.sh

# Open crontab
crontab -e

# Add the following line:
0 2 * * * cd /path/to/deployment/postgres/backup && ./backup.sh >> ../backup.log 2>&1
```

### Restoring from a backup
If you need to restore the database from a `.sql.gz` dump, use the provided restore script. **Warning: This will overwrite current data.**
```bash
cd backup/
./restore.sh ../backups/internalx_backup_20260610_120000.sql.gz
```

## Scaling Considerations (SaaS Level)
Currently configured for an initial load of 30-50 users. As the application scales:
1. **Vertical Scaling**: Modify `docker-compose.yml` to uncomment and adjust the PostgreSQL memory parameters (`shared_buffers`, `effective_cache_size`, `max_connections`) relative to the server's available RAM.
2. **Connection Pooling**: Deploy PgBouncer in front of this container if the active connection count exceeds 200.
3. **High Availability**: Consider switching to a Managed PostgreSQL provider or implementing logical replication if zero-downtime becomes a hard requirement.
