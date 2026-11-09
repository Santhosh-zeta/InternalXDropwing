-- 0001 baseline: the complete schema as of the first versioned release, plus the
-- reference rows (ventures, access levels). Idempotent: on a database that
-- already has these objects it changes nothing. Later migrations (0002+) add
-- columns and drop retired tables; deployment/postgres/init/*.sql is the same
-- schema at head, and tests/schema-equivalence.test.js keeps the two identical.

-- C. PostgreSQL CREATE TABLE script (DDL)

-- Types for PostgreSQL (replacing MySQL ENUMs)
DO $$ BEGIN CREATE TYPE task_status AS ENUM ('pending', 'in-progress', 'completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_type AS ENUM ('task_assigned', 'task_updated', 'project_update', 'mention', 'deadline', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE learning_resource_type AS ENUM ('link', 'video', 'doc', 'pdf'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed', 'on-hold'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE timesheet_status AS ENUM ('pending', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE milestone_status AS ENUM ('pending', 'completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE risk_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Function to handle ON UPDATE CURRENT_TIMESTAMP behavior
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- VENTURES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ventures (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  logo_url VARCHAR(255),
  primary_color VARCHAR(7) DEFAULT '#6366f1',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
DROP TRIGGER IF EXISTS update_ventures_modtime ON ventures;
CREATE TRIGGER update_ventures_modtime BEFORE UPDATE ON ventures FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =============================================
-- ACCESS LEVELS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS access_levels (
  id SERIAL PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE,
  level_name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(20) UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  -- Stores an HMAC-SHA256 hex digest of the OTP, not the OTP itself (64 hex
  -- chars) — see backend/src/utils/otp.js. Widened from VARCHAR(10), which
  -- only fit the plaintext 6-digit code.
  otp VARCHAR(64),
  otp_expires_at TIMESTAMP NULL,
  -- Failed-guess counter for the current OTP and the lockout it can trigger.
  otp_attempts INTEGER NOT NULL DEFAULT 0,
  otp_locked_until TIMESTAMP NULL,
  reset_password_token VARCHAR(255),
  reset_password_expires_at TIMESTAMP NULL,
  access_level INTEGER NOT NULL DEFAULT 8,
  venture_id INTEGER,
  department VARCHAR(100),
  designation VARCHAR(100),
  phone VARCHAR(20),
  avatar_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  notification_preferences JSONB,
  -- Cost/billing rate per hour: the ONE source every cost, budget, invoice and
  -- client-portal figure is computed from (backend/src/utils/rates.js). NULL =
  -- not set: hours are shown, money is not invented. Visible/settable by L<=3.
  hourly_rate NUMERIC(10, 2),
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (access_level) REFERENCES access_levels(level_number) ON UPDATE CASCADE,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL
);
DROP TRIGGER IF EXISTS update_users_modtime ON users;
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =============================================
-- SESSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- PROJECTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status project_status DEFAULT 'planning',
  priority task_priority DEFAULT 'medium',
  category VARCHAR(100) DEFAULT 'General',
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  budget DECIMAL(15, 2) DEFAULT 0.00,
  venture_id INTEGER,
  start_date DATE,
  end_date DATE,
  created_by INTEGER,
  tags JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
DROP TRIGGER IF EXISTS update_projects_modtime ON projects;
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =============================================
-- PROJECT MEMBERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role VARCHAR(100) DEFAULT 'Contributor',
  -- Optional per-project override of users.hourly_rate.
  rate NUMERIC(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (project_id, user_id)
);

-- =============================================
-- PROJECT MILESTONES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS project_milestones (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  status milestone_status DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- =============================================
-- TASKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status task_status DEFAULT 'pending',
  priority task_priority DEFAULT 'medium',
  assigned_to INTEGER NOT NULL,
  assigned_by INTEGER NOT NULL,
  venture_id INTEGER,
  project_id INTEGER,
  parent_task_id INTEGER,
  due_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
DROP TRIGGER IF EXISTS update_tasks_modtime ON tasks;
CREATE TRIGGER update_tasks_modtime BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =============================================
-- TASK ASSIGNEES TABLE
-- ---------------------------------------------
-- A task has a primary owner (tasks.assigned_to) and may additionally be
-- shared with any number of collaborators. Every read path that answers
-- "which tasks can this user see?" joins through here, so this table is
-- required — the Tasks, KPI, analytics and client-portal endpoints all
-- reference it.
-- =============================================
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (task_id, user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- TIMESHEETS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS timesheets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  task_id INTEGER,
  project_id INTEGER,
  venture_id INTEGER,
  hours_worked DECIMAL(5, 2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  status timesheet_status DEFAULT 'pending',
  approved_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);
DROP TRIGGER IF EXISTS update_timesheets_modtime ON timesheets;
CREATE TRIGGER update_timesheets_modtime BEFORE UPDATE ON timesheets FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =============================================
-- DOCUMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  size INTEGER,
  path VARCHAR(255),
  venture_id INTEGER,
  project_id INTEGER,
  uploaded_by INTEGER,
  -- Clients (L9) only ever see documents of their projects that staff flagged.
  client_visible BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);
DROP TRIGGER IF EXISTS update_documents_modtime ON documents;
CREATE TRIGGER update_documents_modtime BEFORE UPDATE ON documents FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NULL,
  venture_id INTEGER NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE CASCADE
);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type notification_type DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- AUDIT LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- LEARNING HUB TABLES
-- =============================================
CREATE TABLE IF NOT EXISTS learning_checklist_items (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'General',
  sort_order INTEGER DEFAULT 0,
  due_days INTEGER NULL,
  venture_id INTEGER NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS learning_intern_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  checklist_item_id INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  UNIQUE (user_id, checklist_item_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (checklist_item_id) REFERENCES learning_checklist_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_resources (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  url VARCHAR(500) NOT NULL,
  category VARCHAR(100) DEFAULT 'General',
  resource_type learning_resource_type DEFAULT 'link',
  added_by INTEGER NULL,
  venture_id INTEGER NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS learning_feedback (
  id SERIAL PRIMARY KEY,
  manager_id INTEGER NOT NULL,
  intern_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  rating SMALLINT NULL,
  week_label VARCHAR(50) NULL,
  venture_id INTEGER NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (intern_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL
);

-- =============================================
-- STRATEGY / ANALYTICS MODULE
-- =============================================
CREATE TABLE IF NOT EXISTS okrs (
  id SERIAL PRIMARY KEY,
  venture_id INTEGER,
  objective VARCHAR(255) NOT NULL,
  progress INTEGER DEFAULT 0,
  color VARCHAR(20) DEFAULT '#8b5cf6',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL
);
DROP TRIGGER IF EXISTS update_okrs_modtime ON okrs;
CREATE TRIGGER update_okrs_modtime BEFORE UPDATE ON okrs FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TABLE IF NOT EXISTS key_results (
  id SERIAL PRIMARY KEY,
  okr_id INTEGER,
  text TEXT NOT NULL,
  is_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (okr_id) REFERENCES okrs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS strategic_risks (
  id SERIAL PRIMARY KEY,
  venture_id INTEGER,
  risk_name VARCHAR(255) NOT NULL,
  severity risk_severity DEFAULT 'MEDIUM',
  mitigation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL
);

-- =============================================
-- ANNOUNCEMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  type VARCHAR(50) DEFAULT 'general',
  venture_id INTEGER NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL
);

-- D. PostgreSQL Index Script

-- In PostgreSQL, foreign keys do NOT automatically create indexes.
-- It is highly recommended to index foreign keys to improve JOIN performance and cascading deletes.

-- users
CREATE INDEX IF NOT EXISTS idx_users_access_level ON users(access_level);
CREATE INDEX IF NOT EXISTS idx_users_venture_id ON users(venture_id);

-- sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
-- Every authenticated request looks a session up by token_hash
-- (src/services/session.service.js#isSessionActive) — this is the hottest
-- query in the app and was previously an unindexed sequential scan.
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
-- Backs both the "AND expires_at > CURRENT_TIMESTAMP" half of that same
-- lookup and the hourly cleanup sweep's "WHERE expires_at <= CURRENT_TIMESTAMP".
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);


-- projects & members
CREATE INDEX IF NOT EXISTS idx_projects_venture_id ON projects(venture_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_venture_id ON tasks(venture_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);

-- timesheets
CREATE INDEX IF NOT EXISTS idx_timesheets_user_id ON timesheets(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_task_id ON timesheets(task_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_project_id ON timesheets(project_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_venture_id ON timesheets(venture_id);

-- documents
CREATE INDEX IF NOT EXISTS idx_documents_venture_id ON documents(venture_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_venture_id ON messages(venture_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- learning hub
CREATE INDEX IF NOT EXISTS idx_learning_checklist_venture_id ON learning_checklist_items(venture_id);
CREATE INDEX IF NOT EXISTS idx_learning_intern_progress_user_id ON learning_intern_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_intern_progress_item_id ON learning_intern_progress(checklist_item_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_added_by ON learning_resources(added_by);
CREATE INDEX IF NOT EXISTS idx_learning_resources_venture_id ON learning_resources(venture_id);
CREATE INDEX IF NOT EXISTS idx_learning_feedback_manager_id ON learning_feedback(manager_id);
CREATE INDEX IF NOT EXISTS idx_learning_feedback_intern_id ON learning_feedback(intern_id);

-- strategy (okrs)
CREATE INDEX IF NOT EXISTS idx_okrs_venture_id ON okrs(venture_id);
CREATE INDEX IF NOT EXISTS idx_key_results_okr_id ON key_results(okr_id);
CREATE INDEX IF NOT EXISTS idx_strategic_risks_venture_id ON strategic_risks(venture_id);

-- announcements
CREATE INDEX IF NOT EXISTS idx_announcements_venture_id ON announcements(venture_id);

-- Task assignees: both directions are hot — "tasks for a user" on every
-- dashboard load, "assignees of a task" on every task detail view.
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);

-- 1. Ventures
INSERT INTO ventures (id, name, slug, primary_color, description) VALUES
(1, 'Dropwing Design Studio', 'dropwing', '#8B5CF6', 'Creative design studio specializing in brand identity and UI/UX'),
(2, 'Fenixa Solutions', 'fenixa', '#06B6D4', 'Software development and SaaS solutions'),
(3, 'PerSyniX', 'persynix', '#F59E0B', 'AI & ML solutions platform'),
(4, 'Grovia', 'grovia', '#10B981', 'Marketing and growth solutions')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for ventures
SELECT setval('ventures_id_seq', (SELECT MAX(id) FROM ventures));

-- 2. Access Levels
INSERT INTO access_levels (level_number, level_name, description) VALUES
(1, 'Super Admin', 'Full system access — all ventures, all data, all settings'),
(2, 'Managing Director', 'Strategic oversight across all ventures'),
(3, 'Admin', 'Administrative access to assigned venture'),
(4, 'CXO', 'C-level executive with cross-departmental visibility'),
(5, 'Manager', 'Team management and reporting access'),
(6, 'Executive Staff', 'Senior staff with expanded task access'),
(7, 'Staff', 'Standard employee access'),
(8, 'Intern', 'Limited access for internship period'),
(9, 'Client', 'External client portal access')
ON CONFLICT (level_number) DO NOTHING;
