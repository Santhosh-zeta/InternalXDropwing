-- ── System Timeline Table ─────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor

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

CREATE INDEX IF NOT EXISTS idx_system_timeline_created ON system_timeline(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_timeline_company ON system_timeline(company_id);
CREATE INDEX IF NOT EXISTS idx_system_timeline_type    ON system_timeline(type);

ALTER TABLE system_timeline ENABLE ROW LEVEL SECURITY;
-- Backend service role bypasses RLS automatically
