# PostgreSQL Migration Checklist

## Pre-Migration
- [ ] Take a full logical backup of the current MySQL database using `mysqldump`.
- [ ] Review the updated PostgreSQL schema (`C_PostgreSQL_Schema.sql`) for completeness.
- [ ] Ensure the backend uses a compatible ORM/driver for PostgreSQL (e.g., `pg` instead of `mysql2`).
- [ ] Update `.env` variables to point to the new PostgreSQL database (`DB_HOST`, `DB_PORT=5432`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).

## Execution
- [ ] Provision the PostgreSQL 16 database server (via Docker Compose or managed hosting).
- [ ] Run the schema generation script (`C_PostgreSQL_Schema.sql`).
- [ ] Run the indexes script (`D_PostgreSQL_Indexes.sql`).
- [ ] Run the seed data script (`postgres_seed.sql`).
- [ ] Use `pgloader` or a custom script to migrate existing row data from MySQL to PostgreSQL (if any real data exists). Note: `pgloader mysql://user:pass@host/db postgresql://user:pass@host/db` works very well for this.

## Post-Migration
- [ ] Verify `updated_at` triggers are working properly on inserts and updates.
- [ ] Test the backend application endpoints. Focus heavily on functions using raw SQL queries that might contain MySQL-specific syntax (e.g., `INSERT IGNORE`, `ON DUPLICATE KEY UPDATE`).
    - *Action Required*: You MUST change all `INSERT IGNORE` to `INSERT ... ON CONFLICT DO NOTHING`.
    - *Action Required*: You MUST change all `ON DUPLICATE KEY UPDATE` to `ON CONFLICT (...) DO UPDATE SET ...`.
- [ ] Ensure JSON parsing is updated as PostgreSQL `JSONB` sometimes behaves slightly differently natively than MySQL `JSON` text columns.
- [ ] Set up automated daily logical backups via `pg_dump`.
