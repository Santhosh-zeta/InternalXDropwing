-- ── Task Comments ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id   UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Task Activity Log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_activity (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,   -- 'created', 'status_changed', 'reassigned', 'commented', 'blocked'
  detail     TEXT,            -- e.g. 'todo → in_progress', comment preview, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Task Blockers ─────────────────────────────────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_blocked   BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS block_reason TEXT;

-- RLS: service role bypasses all these (backend)
ALTER TABLE task_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity  ENABLE ROW LEVEL SECURITY;
