-- Add status tracking for operations halting
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'active';
