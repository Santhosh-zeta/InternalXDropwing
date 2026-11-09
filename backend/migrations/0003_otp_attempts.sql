-- Per-account OTP attempt counter and lockout. Fresh installs already have these
-- columns from the baseline; this brings older databases up to date.
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_locked_until TIMESTAMP NULL;
