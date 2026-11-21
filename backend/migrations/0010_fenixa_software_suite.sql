-- Migration 0010: Fenixa Solutions End-to-End Software Development Suite
-- Integrates WorkZ Agile capabilities (Sprints, Epics, Stories, Bugs, Releases, Retrospectives, Task Links, Comments)
-- into InternalX with multi-venture scoping tailored for Fenixa Solutions.

-- 1. Software Epics / Product Requirements Specifications
CREATE TABLE IF NOT EXISTS software_epics (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  venture_id INTEGER NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  key VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  prd_content TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_software_epics_project ON software_epics(project_id);
CREATE INDEX IF NOT EXISTS idx_software_epics_venture ON software_epics(venture_id);

-- 2. Sprints (Agile / Scrum Cycles)
CREATE TABLE IF NOT EXISTS sprints (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  venture_id INTEGER NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  goal TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'planned', -- planned, active, completed
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_venture ON sprints(venture_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);

-- 3. Sprint Retrospectives & Notes
CREATE TABLE IF NOT EXISTS sprint_notes (
  id SERIAL PRIMARY KEY,
  sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL DEFAULT 'went_well', -- went_well, to_improve, action_item
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sprint_notes_sprint ON sprint_notes(sprint_id);

-- 4. Software Releases & Deployment Versions
CREATE TABLE IF NOT EXISTS software_releases (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  venture_id INTEGER NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  version_name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'unreleased', -- unreleased, released, archived
  release_date DATE,
  release_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_software_releases_project ON software_releases(project_id);
CREATE INDEX IF NOT EXISTS idx_software_releases_venture ON software_releases(venture_id);

-- 5. Extend Tasks for End-to-End Software Engineering Lifecycle
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS issue_key VARCHAR(30);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS issue_type VARCHAR(30) DEFAULT 'task';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS epic_id INTEGER REFERENCES software_epics(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS release_id INTEGER REFERENCES software_releases(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimate_hours NUMERIC(6, 2) DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_spent_hours NUMERIC(6, 2) DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS resolution VARCHAR(50) DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS environment VARCHAR(50) DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS steps_to_reproduce TEXT DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS board_order NUMERIC(10, 4) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_epic_id ON tasks(epic_id);
CREATE INDEX IF NOT EXISTS idx_tasks_release_id ON tasks(release_id);
CREATE INDEX IF NOT EXISTS idx_tasks_issue_key ON tasks(issue_key);
CREATE INDEX IF NOT EXISTS idx_tasks_issue_type ON tasks(issue_type);

-- 6. Task Comments (with user mentions & discussion threads)
CREATE TABLE IF NOT EXISTS task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

-- 7. Task Dependency Links (blocks, is_blocked_by, relates_to, duplicates)
CREATE TABLE IF NOT EXISTS task_links (
  id SERIAL PRIMARY KEY,
  source_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  target_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  link_type VARCHAR(50) NOT NULL DEFAULT 'relates_to',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (source_task_id, target_task_id, link_type)
);
CREATE INDEX IF NOT EXISTS idx_task_links_source ON task_links(source_task_id);
CREATE INDEX IF NOT EXISTS idx_task_links_target ON task_links(target_task_id);
