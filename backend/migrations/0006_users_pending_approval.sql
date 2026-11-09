-- Self-registered accounts wait for admin approval: is_active = FALSE and
-- pending_approval = TRUE until an admin activates them.
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_approval BOOLEAN NOT NULL DEFAULT FALSE;
