-- ══════════════════════════════════════════════════════════════════════
-- DROPWING OS — PHASE 1 CRITICAL MIGRATION
-- Run this in Supabase SQL Editor (SQL tab → New Query → Run)
-- Safe to run multiple times (IF NOT EXISTS / DO NOTHING guards)
-- ══════════════════════════════════════════════════════════════════════

-- ─── Fix 1: Add 'admin' + 'employee' to profiles.role CHECK constraint ────────
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (
    role IN ('managing_director','admin','ceo','manager','intern','client','employee')
  );

-- ─── Fix 2: Add project_id FK to tasks ───────────────────────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- ─── Fix 3: Add is_blocked + block_reason to tasks ───────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_blocked   BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS block_reason TEXT;

-- ─── Fix 4: Add created_by + priority to tasks ───────────────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'
  CHECK (priority IN ('low','medium','high','critical'));

-- ─── Fix 5: Add status + ceo_id to companies ─────────────────────────────────
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active','inactive','suspended'));

ALTER TABLE companies ADD COLUMN IF NOT EXISTS ceo_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- ─── Fix 6: Create marketing_leads (if missing) ──────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name     TEXT NOT NULL,
  project_type    TEXT NOT NULL,
  estimated_value NUMERIC DEFAULT 0,
  assigned_to     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending_approval',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;

-- Drop the over-broad policy (if it was created before) and replace it
DROP POLICY IF EXISTS "Allow all authenticated users to read and insert marketing_leads" ON marketing_leads;
DROP POLICY IF EXISTS "marketing_leads_company_read"   ON marketing_leads;
DROP POLICY IF EXISTS "marketing_leads_company_insert" ON marketing_leads;

CREATE POLICY "marketing_leads_company_read" ON marketing_leads
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "marketing_leads_company_insert" ON marketing_leads
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ─── Fix 7: Create notifications (if missing) ────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT,
  message    TEXT NOT NULL,
  type       TEXT,
  read       BOOLEAN DEFAULT false,
  link       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to read own notifications"  ON notifications;
DROP POLICY IF EXISTS "Allow inserts to notifications"         ON notifications;
DROP POLICY IF EXISTS "Allow updates to notifications"         ON notifications;

CREATE POLICY "notif_read"   ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ─── Fix 8: Create task_comments (if missing) ────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

-- ─── Fix 9: Create task_activity (if missing) ────────────────────────────────
CREATE TABLE IF NOT EXISTS task_activity (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  detail     TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON task_activity(task_id);

-- ─── Fix 10: Create system_timeline (if missing) ─────────────────────────────
CREATE TABLE IF NOT EXISTS system_timeline (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('task','project','team','user','system')),
  action      TEXT NOT NULL,
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_id   UUID,
  target_name TEXT,
  metadata    JSONB DEFAULT '{}',
  company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  priority    TEXT DEFAULT 'normal' CHECK (priority IN ('normal','important','critical')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE system_timeline ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_system_timeline_created ON system_timeline(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_timeline_type    ON system_timeline(type);
CREATE INDEX IF NOT EXISTS idx_system_timeline_company ON system_timeline(company_id);

-- ─── Verify (uncomment to check) ─────────────────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'tasks' ORDER BY ordinal_position;
