-- ================================================================
-- DROPWING GROUPS INTERNAL PORTAL — FULL SCHEMA
-- Paste this entire file into the Supabase SQL Editor and click Run
-- ================================================================

-- 1. Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (
    role IN ('managing_director','ceo','manager','intern','client')
  ),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE (team_id, profile_id)
);

-- 5. Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active','completed','on_hold')
  ),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Client Projects (link table)
CREATE TABLE IF NOT EXISTS client_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE (client_id, project_id)
);

-- 8. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (
    status IN ('todo','in_progress','done')
  ),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Seed Companies ──────────────────────────────────────────────
INSERT INTO companies (name) VALUES
  ('Webforge'),
  ('PerSyniX'),
  ('Design Studio'),
  ('Grovia')
ON CONFLICT (name) DO NOTHING;

-- ── Row Level Security ──────────────────────────────────────────
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by backend with service_role_key)
-- The backend bypasses RLS automatically when using service role key
-- The following policies allow authenticated users to read their own profile:

CREATE POLICY IF NOT EXISTS "own_profile_read" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- ── Handle on_auth_user_created trigger (auto-create profile placeholder) ──
-- Uncomment if you want to auto-create profiles on signup:
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS trigger AS $$
-- BEGIN
--   INSERT INTO public.profiles (id, full_name, role)
--   VALUES (new.id, new.raw_user_meta_data->>'full_name', 'intern');
--   RETURN new;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
