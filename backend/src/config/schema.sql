-- InternalX Dropwing Groups - Database Schema
-- Database: u247884947_InternalDG

-- =============================================
-- VENTURES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ventures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  logo_url VARCHAR(255),
  primary_color VARCHAR(7) DEFAULT '#6366f1',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- ACCESS LEVELS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS access_levels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  level_number INT NOT NULL UNIQUE,
  level_name VARCHAR(50) NOT NULL,
  description TEXT,
  permissions JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(20) UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  otp VARCHAR(10),
  otp_expires_at TIMESTAMP NULL,
  reset_password_token VARCHAR(255),
  reset_password_expires_at TIMESTAMP NULL,
  access_level INT NOT NULL DEFAULT 8,
  venture_id INT,
  department VARCHAR(100),
  designation VARCHAR(100),
  phone VARCHAR(20),
  avatar_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (access_level) REFERENCES access_levels(level_number) ON UPDATE CASCADE,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL
);

-- =============================================
-- SESSIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- TASKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('pending', 'in-progress', 'completed') DEFAULT 'pending',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  assigned_to INT NOT NULL,
  assigned_by INT NOT NULL,
  venture_id INT,
  due_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL
);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('task_assigned', 'task_updated', 'project_update', 'mention', 'deadline', 'system') DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_read (is_read)
);

-- =============================================
-- SEED: VENTURES
-- =============================================
INSERT IGNORE INTO ventures (name, slug, primary_color, description) VALUES
('Dropwing Design Studio', 'dropwing',  '#8B5CF6', 'Creative design studio specializing in brand identity and UI/UX'),
('SerphoSoft',             'serphosoft', '#06B6D4', 'Software development and SaaS solutions'),
('PerSyniX',               'persynix',  '#F59E0B', 'AI & ML solutions platform'),
('Grovia',                 'grovia',    '#10B981', 'Marketing and growth solutions');

-- =============================================
-- SEED: ACCESS LEVELS
-- =============================================
INSERT IGNORE INTO access_levels (level_number, level_name, description) VALUES
(1, 'Super Admin', 'Full system access — all ventures, all data, all settings'),
(2, 'Managing Director', 'Strategic oversight across all ventures'),
(3, 'Admin', 'Administrative access to assigned venture'),
(4, 'CXO', 'C-level executive with cross-departmental visibility'),
(5, 'Manager', 'Team management and reporting access'),
(6, 'Executive Staff', 'Senior staff with expanded task access'),
(7, 'Staff', 'Standard employee access'),
(8, 'Intern', 'Limited access for internship period'),
(9, 'Client', 'External client portal access');

-- =============================================
-- SEED: TEST USERS (password = Test@1234)
-- Use `node seed.js` in /backend to regenerate with fresh bcrypt hashes.
-- This static hash is for reference only — run seed.js for live seeding.
-- bcrypt hash: $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku
-- =============================================

-- Global accounts (no venture)
INSERT IGNORE INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation) VALUES
('DG-SA-001', 'Super Admin',       'sa@dropwinggroups.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 1, NULL, 'Executive', 'Super Administrator'),
('DG-MD-001', 'Managing Director', 'md@dropwinggroups.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 2, NULL, 'Executive', 'Managing Director');

-- L1 Super Admin (per venture)
INSERT IGNORE INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation) VALUES
('DW-SA-001', 'Super Admin Dropwing',   'sa@dropwing.in',    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 1, 1, 'Executive', 'Super Administrator'),
('SS-SA-002', 'Super Admin SerphoSoft', 'sa@serphosoft.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 1, 2, 'Executive', 'Super Administrator'),
('PX-SA-003', 'Super Admin PerSyniX',   'sa@persynix.com',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 1, 3, 'Executive', 'Super Administrator'),
('GV-SA-004', 'Super Admin Grovia',     'sa@grovia.in',      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 1, 4, 'Executive', 'Super Administrator');

-- L2 Managing Director (per venture)
INSERT IGNORE INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation) VALUES
('DW-MD-005', 'Managing Director Dropwing',   'md@dropwing.in',    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 2, 1, 'Executive', 'Managing Director'),
('SS-MD-006', 'Managing Director SerphoSoft', 'md@serphosoft.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 2, 2, 'Executive', 'Managing Director'),
('PX-MD-007', 'Managing Director PerSyniX',   'md@persynix.com',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 2, 3, 'Executive', 'Managing Director'),
('GV-MD-008', 'Managing Director Grovia',     'md@grovia.in',      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 2, 4, 'Executive', 'Managing Director');

-- L3 Admin (per venture)
INSERT IGNORE INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation) VALUES
('DW-AD-009', 'Admin Dropwing',   'ad@dropwing.in',    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 3, 1, 'Operations', 'Administrator'),
('SS-AD-010', 'Admin SerphoSoft', 'ad@serphosoft.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 3, 2, 'Operations', 'Administrator'),
('PX-AD-011', 'Admin PerSyniX',   'ad@persynix.com',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 3, 3, 'Operations', 'Administrator'),
('GV-AD-012', 'Admin Grovia',     'ad@grovia.in',      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 3, 4, 'Operations', 'Administrator');

-- L4 CXO (per venture)
INSERT IGNORE INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation) VALUES
('DW-CX-013', 'CXO Dropwing',   'cx@dropwing.in',    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 4, 1, 'Executive', 'Chief Technology Officer'),
('SS-CX-014', 'CXO SerphoSoft', 'cx@serphosoft.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 4, 2, 'Executive', 'Chief Technology Officer'),
('PX-CX-015', 'CXO PerSyniX',   'cx@persynix.com',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 4, 3, 'Executive', 'Chief Technology Officer'),
('GV-CX-016', 'CXO Grovia',     'cx@grovia.in',      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 4, 4, 'Executive', 'Chief Technology Officer');

-- L5 Manager (per venture)
INSERT IGNORE INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation) VALUES
('DW-MG-017', 'Manager Dropwing',   'mg@dropwing.in',    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 5, 1, 'Product', 'Product Manager'),
('SS-MG-018', 'Manager SerphoSoft', 'mg@serphosoft.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 5, 2, 'Product', 'Product Manager'),
('PX-MG-019', 'Manager PerSyniX',   'mg@persynix.com',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 5, 3, 'Product', 'Product Manager'),
('GV-MG-020', 'Manager Grovia',     'mg@grovia.in',      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 5, 4, 'Product', 'Product Manager');

-- L6 Executive Staff (per venture)
INSERT IGNORE INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation) VALUES
('DW-ES-021', 'Executive Staff Dropwing',   'es@dropwing.in',    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 6, 1, 'Operations', 'Executive Officer'),
('SS-ES-022', 'Executive Staff SerphoSoft', 'es@serphosoft.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 6, 2, 'Operations', 'Executive Officer'),
('PX-ES-023', 'Executive Staff PerSyniX',   'es@persynix.com',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 6, 3, 'Operations', 'Executive Officer'),
('GV-ES-024', 'Executive Staff Grovia',     'es@grovia.in',      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 6, 4, 'Operations', 'Executive Officer');

-- L7 Staff (per venture)
INSERT IGNORE INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation) VALUES
('DW-ST-025', 'Staff Dropwing',   'st@dropwing.in',    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 7, 1, 'Design', 'Senior Designer'),
('SS-ST-026', 'Staff SerphoSoft', 'st@serphosoft.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 7, 2, 'Design', 'Senior Designer'),
('PX-ST-027', 'Staff PerSyniX',   'st@persynix.com',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 7, 3, 'Design', 'Senior Designer'),
('GV-ST-028', 'Staff Grovia',     'st@grovia.in',      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 7, 4, 'Design', 'Senior Designer');

-- L8 Intern (per venture)
INSERT IGNORE INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation) VALUES
('DW-IN-029', 'Intern Dropwing',   'in@dropwing.in',    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 8, 1, 'Engineering', 'Software Intern'),
('SS-IN-030', 'Intern SerphoSoft', 'in@serphosoft.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 8, 2, 'Engineering', 'Software Intern'),
('PX-IN-031', 'Intern PerSyniX',   'in@persynix.com',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 8, 3, 'Engineering', 'Software Intern'),
('GV-IN-032', 'Intern Grovia',     'in@grovia.in',      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 8, 4, 'Engineering', 'Software Intern');

-- L9 Client (per venture)
INSERT IGNORE INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation) VALUES
('DW-CL-033', 'Client Dropwing',   'cl@dropwing.in',    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 9, 1, 'External', 'Client'),
('SS-CL-034', 'Client SerphoSoft', 'cl@serphosoft.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 9, 2, 'External', 'Client'),
('PX-CL-035', 'Client PerSyniX',   'cl@persynix.com',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 9, 3, 'External', 'Client'),
('GV-CL-036', 'Client Grovia',     'cl@grovia.in',      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku', 9, 4, 'External', 'Client');

-- =============================================
-- LEARNING HUB TABLES
-- =============================================
CREATE TABLE IF NOT EXISTS learning_checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'General',
  sort_order INT DEFAULT 0,
  due_days INT NULL,
  venture_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS learning_intern_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  checklist_item_id INT NOT NULL,
  completed TINYINT(1) DEFAULT 0,
  completed_at TIMESTAMP NULL,
  UNIQUE KEY uq_user_item (user_id, checklist_item_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (checklist_item_id) REFERENCES learning_checklist_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  url VARCHAR(500) NOT NULL,
  category VARCHAR(100) DEFAULT 'General',
  resource_type ENUM('link','video','doc','pdf') DEFAULT 'link',
  added_by INT NULL,
  venture_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS learning_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  manager_id INT NOT NULL,
  intern_id INT NOT NULL,
  note TEXT NOT NULL,
  rating TINYINT NULL,
  week_label VARCHAR(50) NULL,
  venture_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (intern_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL
);
