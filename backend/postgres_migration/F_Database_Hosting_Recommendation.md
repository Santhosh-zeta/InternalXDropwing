# Database Hosting Recommendation

**Target Scenario:** Ubuntu VPS, PostgreSQL 16, 30–50 users initially, future SaaS scaling.

## 1. Initial Deployment (30-50 Users)
For an initial load of 30-50 users, a moderately sized VPS will be more than sufficient to run both the application and the database using Docker Compose.

**Recommended Specs:**
- **Provider:** DigitalOcean, Hetzner, AWS (Lightsail/EC2), or Linode.
- **CPU:** 2 vCPU
- **RAM:** 4 GB - 8 GB (PostgreSQL loves RAM for caching).
- **Storage:** 50 GB - 80 GB NVMe SSD (SSD is mandatory for database IOPS).

## 2. Configuration for PostgreSQL 16 on VPS
When deploying on a VPS, the default PostgreSQL configuration is overly conservative. Update `postgresql.conf` with:
- `max_connections = 200`
- `shared_buffers = 1GB` (25% of RAM)
- `effective_cache_size = 3GB` (75% of RAM)
- `maintenance_work_mem = 256MB`
- `checkpoint_completion_target = 0.9`
- `wal_buffers = 16MB`
- `default_statistics_target = 100`

## 3. Scaling to SaaS (Future)
When the platform scales beyond a single-server deployment or starts onboarding multiple high-usage enterprise clients:
1. **Vertical Scaling First:** Upgrade the VPS to 8+ vCPU and 32GB+ RAM.
2. **Managed Database:** Transition to a Managed PostgreSQL service (e.g., AWS RDS, DigitalOcean Managed Databases, or Supabase). This offloads backups, high availability (HA), and replication to the cloud provider.
3. **Connection Pooling:** Introduce `PgBouncer` to manage connection limits efficiently.

## 4. Backup Strategy (VPS Deployment)
Since you are self-hosting, backups are your responsibility.
- **Automated Logical Backups:** Run a daily cron job executing `pg_dump` and upload the dump to an S3 bucket (e.g., AWS S3 or Backblaze B2).
- **Retention Policy:** Keep 7 daily, 4 weekly, and 12 monthly backups.
- **WAL Archiving:** For Point-In-Time-Recovery (PITR), consider setting up `pgBackRest` or `wal-g`.

## 5. Restore Strategy
In case of disaster:
```bash
# Drop existing DB connections if any
# Recreate database
psql -U postgres -c "DROP DATABASE internalx;"
psql -U postgres -c "CREATE DATABASE internalx;"

# Restore from latest daily logical backup
pg_restore -U postgres -d internalx -1 /path/to/backup.dump
```
