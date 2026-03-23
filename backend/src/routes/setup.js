/**
 * /api/setup — One-time admin endpoint to create missing tables.
 * Protected by SETUP_SECRET env variable.
 * Run once: curl -X POST http://localhost:3001/api/setup -H "x-setup-secret: YOUR_SECRET"
 */
const express = require('express');
const router = express.Router();
const { Client } = require('pg');

const SETUP_SQL = `
-- Optional: enrich user_roles with HR fields (safe if columns already exist)
ALTER TABLE IF EXISTS user_roles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT;

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES user_roles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_roles(id) ON DELETE CASCADE,
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  created_by UUID REFERENCES user_roles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  venture_id UUID REFERENCES ventures(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','on_hold')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES user_roles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE (client_id, project_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES user_roles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Onboarding invites (secure-by-token public form + admin approval pipeline)
CREATE TABLE IF NOT EXISTS onboarding_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID REFERENCES ventures(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'member' CHECK (kind IN ('member','client')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','submitted','approved','rejected','onboarded','expired')),
  created_by UUID REFERENCES user_roles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  onboarded_at TIMESTAMPTZ,
  onboarded_user_id UUID REFERENCES user_roles(id) ON DELETE SET NULL,
  decided_by UUID REFERENCES user_roles(id) ON DELETE SET NULL,
  decision_note TEXT,
  assigned_role TEXT CHECK (assigned_role IN ('managing_director','ceo','manager','intern','client','admin')),
  designation TEXT,
  submission JSONB
);

CREATE INDEX IF NOT EXISTS onboarding_invites_venture_status_idx
  ON onboarding_invites (venture_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS onboarding_invites_token_idx
  ON onboarding_invites (token);
`;

router.post('/', async (req, res) => {
    const secret = req.headers['x-setup-secret'];
    if (!process.env.DATABASE_URL) {
        return res.status(503).json({
            error: 'DATABASE_URL not configured',
            instructions: 'Add DATABASE_URL to backend/.env (get from Supabase → Settings → Database → URI)'
        });
    }
    if (secret !== process.env.SETUP_SECRET && process.env.SETUP_SECRET) {
        return res.status(403).json({ error: 'Invalid setup secret' });
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        await client.query(SETUP_SQL);
        await client.end();
        res.json({ message: 'Tables created successfully! Run POST /api/setup/seed to seed data.' });
    } catch (err) {
        await client.end().catch(() => { });
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
