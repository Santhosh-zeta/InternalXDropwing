-- C. PostgreSQL CREATE TABLE script (DDL)

-- Types for PostgreSQL (replacing MySQL ENUMs)
CREATE TYPE task_status AS ENUM ('pending', 'in-progress', 'completed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE notification_type AS ENUM ('task_assigned', 'task_updated', 'project_update', 'mention', 'deadline', 'system');
CREATE TYPE learning_resource_type AS ENUM ('link', 'video', 'doc', 'pdf');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed', 'on-hold');
CREATE TYPE timesheet_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE milestone_status AS ENUM ('pending', 'completed');
CREATE TYPE risk_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

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
CREATE TABLE ventures (
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
CREATE TRIGGER update_ventures_modtime BEFORE UPDATE ON ventures FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =============================================
-- ACCESS LEVELS TABLE
-- =============================================
CREATE TABLE access_levels (
  id SERIAL PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE,
  level_name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
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
  -- TRUE for accounts created by self-registration that wait for admin approval
  -- (is_active is FALSE until then). Distinguishes "pending" from "deactivated".
  pending_approval BOOLEAN NOT NULL DEFAULT FALSE,
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
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =============================================
-- SESSIONS TABLE
-- =============================================
CREATE TABLE sessions (
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
CREATE TABLE projects (
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
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =============================================
-- PROJECT MEMBERS TABLE
-- =============================================
CREATE TABLE project_members (
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
CREATE TABLE project_milestones (
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
CREATE TABLE tasks (
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
CREATE TABLE task_assignees (
  task_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (task_id, user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- TIMESHEETS TABLE
-- =============================================
CREATE TABLE timesheets (
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
CREATE TRIGGER update_timesheets_modtime BEFORE UPDATE ON timesheets FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =============================================
-- DOCUMENTS TABLE
-- =============================================
CREATE TABLE documents (
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
CREATE TRIGGER update_documents_modtime BEFORE UPDATE ON documents FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE messages (
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
CREATE TABLE notifications (
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
CREATE TABLE audit_logs (
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
CREATE TABLE learning_checklist_items (
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

CREATE TABLE learning_intern_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  checklist_item_id INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  UNIQUE (user_id, checklist_item_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (checklist_item_id) REFERENCES learning_checklist_items(id) ON DELETE CASCADE
);

CREATE TABLE learning_resources (
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

CREATE TABLE learning_feedback (
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
CREATE TABLE okrs (
  id SERIAL PRIMARY KEY,
  venture_id INTEGER,
  objective VARCHAR(255) NOT NULL,
  progress INTEGER DEFAULT 0,
  color VARCHAR(20) DEFAULT '#8b5cf6',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL
);
CREATE TRIGGER update_okrs_modtime BEFORE UPDATE ON okrs FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TABLE key_results (
  id SERIAL PRIMARY KEY,
  okr_id INTEGER,
  text TEXT NOT NULL,
  is_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (okr_id) REFERENCES okrs(id) ON DELETE CASCADE
);

CREATE TABLE strategic_risks (
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
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  type VARCHAR(50) DEFAULT 'general',
  venture_id INTEGER NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL
);

-- B2: full-text search indexes (same as backend/migrations/0003_b2_search.sql)
CREATE INDEX IF NOT EXISTS idx_fts_tasks ON tasks
  USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_fts_projects ON projects
  USING GIN (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(client_name, '')));
CREATE INDEX IF NOT EXISTS idx_fts_documents ON documents
  USING GIN (to_tsvector('simple', regexp_replace(coalesce(original_name, ''), '[^[:alnum:]]+', ' ', 'g')));
CREATE INDEX IF NOT EXISTS idx_fts_announcements ON announcements
  USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')));
CREATE INDEX IF NOT EXISTS idx_fts_users ON users
  USING GIN (to_tsvector('simple', coalesce(full_name, '') || ' ' || coalesce(designation, '') || ' ' || coalesce(department, '')));
CREATE INDEX IF NOT EXISTS idx_fts_messages ON messages
  USING GIN (to_tsvector('simple', content));

-- B2: assistant tables (same as backend/migrations/0004_b2_assistant.sql)
CREATE TABLE IF NOT EXISTS assistant_conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assistant_conv_user ON assistant_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS assistant_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  -- Anthropic content blocks, replayed verbatim on the next turn.
  content JSONB NOT NULL,
  -- Plain text shown in the UI (NULL for tool_result turns).
  text TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assistant_msg_conv ON assistant_messages(conversation_id, id);

CREATE TABLE IF NOT EXISTS assistant_usage (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  messages INTEGER NOT NULL DEFAULT 0,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

-- B2: scheduler tables (same as backend/migrations/0005_b2_scheduler.sql)
CREATE TABLE IF NOT EXISTS scheduler_runs (
  job VARCHAR(40) NOT NULL,
  run_key VARCHAR(40) NOT NULL,
  ran_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (job, run_key)
);

CREATE TABLE IF NOT EXISTS scheduler_alerts (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  finding_key VARCHAR(80) NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, finding_key)
);
