-- ══════════════════════════════════════════════════════════════════════
-- DROPWING OS — CANONICAL SCHEMA (Synced from Supabase — 2026-03-24)
-- Source: Supabase schema export (authoritative / matches production)
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE public.companies (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  status     text DEFAULT 'active' CHECK (status = ANY (ARRAY['active','inactive','suspended'])),
  ceo_id     uuid,
  CONSTRAINT companies_pkey PRIMARY KEY (id),
  CONSTRAINT companies_ceo_id_fkey FOREIGN KEY (ceo_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.profiles (
  id          uuid NOT NULL,
  full_name   text NOT NULL,
  role        text NOT NULL CHECK (role = ANY (ARRAY[
                 'managing_director','admin','ceo','manager','intern','client','employee'
               ])),
  company_id  uuid,
  avatar_url  text,
  created_at  timestamp with time zone DEFAULT now(),
  phone       text,
  designation text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

CREATE TABLE public.teams (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  company_id uuid,
  manager_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT teams_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.team_members (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id    uuid,
  profile_id uuid,           -- ← profile_id (NOT user_id)
  CONSTRAINT team_members_pkey PRIMARY KEY (id),
  CONSTRAINT team_members_team_id_fkey    FOREIGN KEY (team_id)    REFERENCES public.teams(id),
  CONSTRAINT team_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.announcements (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  body       text,
  company_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

CREATE TABLE public.projects (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  company_id  uuid,
  status      text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active','completed','on_hold'])),
  created_at  timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

CREATE TABLE public.client_projects (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id  uuid,
  project_id uuid,
  CONSTRAINT client_projects_pkey PRIMARY KEY (id),
  CONSTRAINT client_projects_client_id_fkey  FOREIGN KEY (client_id)  REFERENCES public.profiles(id),
  CONSTRAINT client_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);

CREATE TABLE public.tasks (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  description         text,
  assignee_id         uuid,      -- legacy single-FK, kept for compatibility
  team_id             uuid,      -- legacy single-FK, kept for compatibility
  status              text NOT NULL DEFAULT 'todo' CHECK (status = ANY (ARRAY['todo','in_progress','done'])),
  due_date            date,      -- ← date (not timestamptz)
  created_at          timestamp with time zone DEFAULT now(),
  assigned_profiles   uuid[]  DEFAULT '{}',
  assigned_teams      uuid[]  DEFAULT '{}',
  assigned_roles      text[]  DEFAULT '{}',
  assigned_company_id uuid,
  meeting_info        jsonb,
  is_blocked          boolean DEFAULT false,
  block_reason        text,
  project_id          uuid,
  created_by          uuid,
  priority            text DEFAULT 'medium' CHECK (priority = ANY (ARRAY['low','medium','high','critical'])),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_assignee_id_fkey       FOREIGN KEY (assignee_id)         REFERENCES public.profiles(id),
  CONSTRAINT tasks_team_id_fkey           FOREIGN KEY (team_id)             REFERENCES public.teams(id),
  CONSTRAINT tasks_assigned_company_id_fkey FOREIGN KEY (assigned_company_id) REFERENCES public.companies(id),
  CONSTRAINT tasks_project_id_fkey        FOREIGN KEY (project_id)          REFERENCES public.projects(id),
  CONSTRAINT tasks_created_by_fkey        FOREIGN KEY (created_by)          REFERENCES public.profiles(id)
);

CREATE TABLE public.task_comments (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL,
  user_id    uuid NOT NULL,
  content    text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_comments_pkey PRIMARY KEY (id),
  CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.task_activity (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL,
  user_id    uuid,
  action     text NOT NULL,
  detail     text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT task_activity_pkey PRIMARY KEY (id),
  CONSTRAINT task_activity_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.system_timeline (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  type        text NOT NULL CHECK (type = ANY (ARRAY['task','project','team','user','system'])),
  action      text NOT NULL,
  actor_id    uuid,
  target_id   uuid,
  target_name text,
  metadata    jsonb DEFAULT '{}',
  company_id  uuid,
  priority    text DEFAULT 'normal' CHECK (priority = ANY (ARRAY['normal','important','critical'])),
  created_at  timestamp with time zone DEFAULT now(),
  CONSTRAINT system_timeline_pkey PRIMARY KEY (id),
  CONSTRAINT system_timeline_actor_id_fkey   FOREIGN KEY (actor_id)   REFERENCES public.profiles(id),
  CONSTRAINT system_timeline_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

CREATE TABLE public.notifications (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid,
  title      text,
  message    text NOT NULL,
  type       text,
  read       boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  -- NOTE: no 'link' column in production
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.marketing_leads (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  client_name     text NOT NULL,
  project_type    text NOT NULL,
  estimated_value numeric DEFAULT 0,
  assigned_to     uuid,
  company_id      uuid,
  status          text NOT NULL DEFAULT 'pending_approval',
  created_at      timestamp with time zone DEFAULT now(),
  updated_at      timestamp with time zone DEFAULT now(),
  CONSTRAINT marketing_leads_pkey PRIMARY KEY (id),
  CONSTRAINT marketing_leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id),
  CONSTRAINT marketing_leads_company_id_fkey  FOREIGN KEY (company_id)  REFERENCES public.companies(id)
);

CREATE TABLE public.onboarding_invites (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id       uuid,
  email            text NOT NULL,
  kind             text NOT NULL DEFAULT 'member' CHECK (kind = ANY (ARRAY['member','client'])),
  token            text NOT NULL UNIQUE,
  status           text NOT NULL DEFAULT 'created' CHECK (status = ANY (
                     ARRAY['created','submitted','approved','rejected','onboarded','expired']
                   )),
  created_by       uuid,
  created_at       timestamp with time zone DEFAULT now(),
  expires_at       timestamp with time zone,
  submitted_at     timestamp with time zone,
  approved_at      timestamp with time zone,
  rejected_at      timestamp with time zone,
  onboarded_at     timestamp with time zone,
  onboarded_user_id uuid,
  decided_by       uuid,
  decision_note    text,
  -- NOTE: assigned_role excludes 'employee' in production
  assigned_role    text CHECK (assigned_role = ANY (
                     ARRAY['managing_director','ceo','manager','intern','client','admin']
                   )),
  designation      text,
  submission       jsonb,
  CONSTRAINT onboarding_invites_pkey PRIMARY KEY (id),
  CONSTRAINT onboarding_invites_company_id_fkey        FOREIGN KEY (company_id)        REFERENCES public.companies(id),
  CONSTRAINT onboarding_invites_created_by_fkey        FOREIGN KEY (created_by)        REFERENCES public.profiles(id),
  CONSTRAINT onboarding_invites_onboarded_user_id_fkey FOREIGN KEY (onboarded_user_id) REFERENCES public.profiles(id),
  CONSTRAINT onboarding_invites_decided_by_fkey        FOREIGN KEY (decided_by)        REFERENCES public.profiles(id)
);
