# VPS Deployment Instructions

## Prerequisites
- A fresh Ubuntu 22.04 or 24.04 VPS instance.
- A user account with `sudo` privileges.

## 1. Initial Server Setup

Update the system and install necessary packages:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git vim ufw
```

Install Docker and Docker Compose:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Log out and log back in for group changes to take effect
```

## 2. Firewall Configuration (UFW)
Secure your server by allowing only necessary ports.
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Only expose 5432 if you plan to connect directly to the DB from outside.
# Otherwise, keep it closed and connect via SSH tunnel or let the backend connect over the internal Docker network.
sudo ufw enable
```

## 3. Deploying PostgreSQL Database

1. Upload the `postgres_migration` folder (containing the `.sql` scripts and `G_docker-compose.yml`) to the server.
2. Navigate to the folder:
```bash
cd ~/postgres_migration
```
3. Start the PostgreSQL instance:
```bash
docker compose -f G_docker-compose.yml up -d
```
4. Check if the database container is healthy:
```bash
docker ps
```

## 4. Initializing the Schema and Seed Data

Copy the migration SQL files into the container and execute them via `psql`:

```bash
# 1. Create Schema
docker exec -i dgos_postgres psql -U postgres -d internalx < C_PostgreSQL_Schema.sql

# 2. Apply Indexes
docker exec -i dgos_postgres psql -U postgres -d internalx < D_PostgreSQL_Indexes.sql

# 3. Seed Initial Data
docker exec -i dgos_postgres psql -U postgres -d internalx < postgres_seed.sql
```

## 5. Setting up Automated Backups (Cron)

Create a backup script `~/backup_db.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
mkdir -p $BACKUP_DIR
FILENAME="$BACKUP_DIR/internalx_$(date +%Y%m%d_%H%M%S).sql.gz"

docker exec dgos_postgres pg_dump -U postgres internalx | gzip > $FILENAME

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -name '*.gz' -delete
```

Make it executable and add to crontab:
```bash
chmod +x ~/backup_db.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /home/$USER/backup_db.sh") | crontab -
```

Your database is now deployed, seeded, and backed up!
