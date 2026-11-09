-- Existing databases only (fresh installs get these columns from init/01_schema.sql).
-- Adds the per-account OTP attempt counter and lockout. Idempotent.
--   psql -d internalx -f deployment/postgres/migrations/001_otp_attempts.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_locked_until TIMESTAMP NULL;
