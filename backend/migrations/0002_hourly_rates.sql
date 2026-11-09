-- One rate source for all money figures (see backend/src/utils/rates.js).
-- Idempotent: a database created from the current 01_schema.sql already has these.
ALTER TABLE users           ADD COLUMN IF NOT EXISTS hourly_rate    NUMERIC(10, 2);
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS rate           NUMERIC(10, 2);
ALTER TABLE documents       ADD COLUMN IF NOT EXISTS client_visible BOOLEAN NOT NULL DEFAULT FALSE;
