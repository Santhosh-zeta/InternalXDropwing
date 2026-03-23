-- ================================================================
-- DROPWING INTERNAL PORTAL — ONBOARDING INVITES (ADD-ON)
-- Run in Supabase SQL Editor (safe to re-run)
-- ================================================================

-- Optional: enrich profiles with HR fields (safe if columns already exist)
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT;

-- Onboarding invites (secure-by-token public form + admin approval pipeline)
CREATE TABLE IF NOT EXISTS onboarding_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'member' CHECK (kind IN ('member','client')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','submitted','approved','rejected','onboarded','expired')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  onboarded_at TIMESTAMPTZ,
  onboarded_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decision_note TEXT,
  assigned_role TEXT CHECK (assigned_role IN ('managing_director','ceo','manager','intern','client','admin')),
  designation TEXT,
  submission JSONB
);

CREATE INDEX IF NOT EXISTS onboarding_invites_company_status_idx
  ON onboarding_invites (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS onboarding_invites_token_idx
  ON onboarding_invites (token);

-- RLS (recommended): only allow service role / backend to manage this table
ALTER TABLE onboarding_invites ENABLE ROW LEVEL SECURITY;

-- IMPORTANT:
-- This table is intended to be accessed ONLY by your backend using the Supabase service role key
-- (which bypasses RLS). Do NOT add permissive policies here; the public onboarding form should
-- call the backend, not Supabase directly.
