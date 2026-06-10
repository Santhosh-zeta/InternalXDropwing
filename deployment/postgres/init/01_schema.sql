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
  permissions JSONB,
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
  otp VARCHAR(10),
  otp_expires_at TIMESTAMP NULL,
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
-- VENTURE ROLES TABLE
-- =============================================
CREATE TABLE venture_roles (
  id SERIAL PRIMARY KEY,
  venture_id INTEGER NULL,
  role_name VARCHAR(100) NOT NULL,
  role_key VARCHAR(60) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  icon VARCHAR(10) DEFAULT '🔷',
  base_level INTEGER NOT NULL DEFAULT 5,
  permissions JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 100,
  created_by INTEGER NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (role_key, venture_id),
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TRIGGER update_venture_roles_modtime BEFORE UPDATE ON venture_roles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- =============================================
-- VENTURE ROLE ASSIGNMENTS TABLE
-- =============================================
CREATE TABLE venture_role_assignments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  assigned_by INTEGER NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES venture_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
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
