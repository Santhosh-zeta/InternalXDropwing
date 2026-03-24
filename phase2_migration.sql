-- ══════════════════════════════════════════════════════════════════════
-- DROPWING OS — PHASE 2 MIGRATION
-- Run in Supabase SQL Editor. Safe to run multiple times.
-- ══════════════════════════════════════════════════════════════════════

-- ─── 1. project_teams join table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id    UUID NOT NULL REFERENCES teams(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, team_id)
);

ALTER TABLE project_teams ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_project_teams_project ON project_teams(project_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_team    ON project_teams(team_id);

-- ─── 2. Add start_date and deadline to projects ───────────────────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deadline   DATE;

-- ─── 3. Verify ───────────────────────────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'projects';
-- SELECT * FROM project_teams LIMIT 5;
