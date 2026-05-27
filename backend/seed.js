require('dotenv').config();
const { pool } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function runSeed() {
  console.log('🌱 Starting InternalX database seed...');

  let conn;
  try {
    conn = await pool.getConnection();
    console.log('✅ Connected to MySQL');

    // ── Create core tables ──────────────────────────────────────────
    console.log('\n📦 Creating core tables...');

    await conn.query(`
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
      )
    `);
    console.log('  ✓ ventures');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS access_levels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level_number INT NOT NULL UNIQUE,
        level_name VARCHAR(50) NOT NULL,
        description TEXT,
        permissions JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ access_levels');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(20) UNIQUE,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
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
      )
    `);
    console.log('  ✓ users');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ sessions');

    await conn.query(`
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
      )
    `);
    console.log('  ✓ tasks');

    await conn.query(`
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
      )
    `);
    console.log('  ✓ notifications');

    // ── Learning Hub tables ─────────────────────────────────────────
    console.log('\n📚 Creating Learning Hub tables...');

    await conn.query(`
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
      )
    `);
    console.log('  ✓ learning_checklist_items');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS learning_intern_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        checklist_item_id INT NOT NULL,
        completed TINYINT(1) DEFAULT 0,
        completed_at TIMESTAMP NULL,
        UNIQUE KEY uq_user_item (user_id, checklist_item_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (checklist_item_id) REFERENCES learning_checklist_items(id) ON DELETE CASCADE
      )
    `);
    console.log('  ✓ learning_intern_progress');

    await conn.query(`
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
      )
    `);
    console.log('  ✓ learning_resources');

    await conn.query(`
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
      )
    `);
    console.log('  ✓ learning_feedback');

    // ── Seed Ventures ───────────────────────────────────────────────
    console.log('\n🏢 Seeding ventures...');
    const ventures = [
      ['Dropwing Design Studio', 'dropwing',   '#8B5CF6', 'Creative design studio specializing in brand identity and UI/UX'],
      ['Fenixa Solutions',       'fenixa',      '#06B6D4', 'Software development and SaaS solutions'],
      ['PerSyniX',               'persynix',    '#F59E0B', 'AI & ML solutions platform'],
      ['Grovia',                 'grovia',      '#10B981', 'Marketing and growth solutions'],
    ];
    for (const [name, slug, color, desc] of ventures) {
      await conn.query(
        `INSERT IGNORE INTO ventures (name, slug, primary_color, description) VALUES (?, ?, ?, ?)`,
        [name, slug, color, desc]
      );
      console.log(`  ✓ ${name}`);
    }

    // ── Seed Access Levels ──────────────────────────────────────────
    console.log('\n🎚️  Seeding access levels...');
    const levels = [
      [1, 'Super Admin',      'Full system access — all ventures, all data, all settings'],
      [2, 'Managing Director','Strategic oversight across all ventures'],
      [3, 'Admin',            'Administrative access to assigned venture'],
      [4, 'CXO',              'C-level executive with cross-departmental visibility'],
      [5, 'Manager',          'Team management and reporting access'],
      [6, 'Executive Staff',  'Senior staff with expanded task access'],
      [7, 'Staff',            'Standard employee access'],
      [8, 'Intern',           'Limited access for internship period'],
      [9, 'Client',           'External client portal access'],
    ];
    for (const [num, name, desc] of levels) {
      await conn.query(
        `INSERT IGNORE INTO access_levels (level_number, level_name, description) VALUES (?, ?, ?)`,
        [num, name, desc]
      );
      console.log(`  ✓ L${num} — ${name}`);
    }

    // ── Generate bcrypt hash ────────────────────────────────────────
    console.log('\n🔐 Generating bcrypt hash for Test@1234...');
    const hash = await bcrypt.hash('Test@1234', 12);
    console.log('  ✓ Hash generated');

    // ── Seed Users ──────────────────────────────────────────────────
    // Format: [employee_id, full_name, email, hash, access_level, venture_id (1-4 or null), department, designation]
    // venture_id: 1=Dropwing, 2=Fenixa Solutions, 3=PerSyniX, 4=Grovia, null=Global
    console.log('\n👥 Seeding users...');

    const users = [
      // ── Global Accounts (no venture) ────────────────────────────
      ['DG-SA-001', 'Super Admin',      'sa@dropwinggroups.com', hash, 1, null, 'Executive', 'Super Administrator'],
      ['DG-MD-001', 'Managing Director','md@dropwinggroups.com', hash, 2, null, 'Executive', 'Managing Director'],



      // ── L3 Admin (per venture) ───────────────────────────────────
      ['DW-AD-009', 'Admin Dropwing',   'ad@dropwing.in',   hash, 3, 1, 'Operations', 'Administrator'],
      ['FS-AD-010', 'Admin Fenixa Solutions',  'ad@fenixa.com', hash, 3, 2, 'Operations', 'Administrator'],
      ['PX-AD-011', 'Admin PerSyniX',    'ad@persynix.com',  hash, 3, 3, 'Operations', 'Administrator'],
      ['GV-AD-012', 'Admin Grovia',      'ad@grovia.in',     hash, 3, 4, 'Operations', 'Administrator'],

      // ── L4 CXO (per venture) ─────────────────────────────────────
      ['DW-CX-013', 'CXO Dropwing',   'cx@dropwing.in',   hash, 4, 1, 'Executive', 'Chief Technology Officer'],
      ['FS-CX-014', 'CXO Fenixa Solutions',  'cx@fenixa.com', hash, 4, 2, 'Executive', 'Chief Technology Officer'],
      ['PX-CX-015', 'CXO PerSyniX',    'cx@persynix.com',  hash, 4, 3, 'Executive', 'Chief Technology Officer'],
      ['GV-CX-016', 'CXO Grovia',      'cx@grovia.in',     hash, 4, 4, 'Executive', 'Chief Technology Officer'],

      // ── L5 Manager (per venture) ─────────────────────────────────
      ['DW-MG-017', 'Manager Dropwing',   'mg@dropwing.in',   hash, 5, 1, 'Product', 'Product Manager'],
      ['FS-MG-018', 'Manager Fenixa Solutions',  'mg@fenixa.com', hash, 5, 2, 'Product', 'Product Manager'],
      ['PX-MG-019', 'Manager PerSyniX',    'mg@persynix.com',  hash, 5, 3, 'Product', 'Product Manager'],
      ['GV-MG-020', 'Manager Grovia',      'mg@grovia.in',     hash, 5, 4, 'Product', 'Product Manager'],

      // ── L6 Executive Staff (per venture) ─────────────────────────
      ['DW-ES-021', 'Executive Staff Dropwing',   'es@dropwing.in',   hash, 6, 1, 'Operations', 'Executive Officer'],
      ['FS-ES-022', 'Executive Staff Fenixa Solutions',  'es@fenixa.com', hash, 6, 2, 'Operations', 'Executive Officer'],
      ['PX-ES-023', 'Executive Staff PerSyniX',    'es@persynix.com',  hash, 6, 3, 'Operations', 'Executive Officer'],
      ['GV-ES-024', 'Executive Staff Grovia',      'es@grovia.in',     hash, 6, 4, 'Operations', 'Executive Officer'],

      // ── L7 Staff (per venture) ───────────────────────────────────
      ['DW-ST-025', 'Staff Dropwing',   'st@dropwing.in',   hash, 7, 1, 'Design', 'Senior Designer'],
      ['FS-ST-026', 'Staff Fenixa Solutions',  'st@fenixa.com', hash, 7, 2, 'Design', 'Senior Designer'],
      ['PX-ST-027', 'Staff PerSyniX',    'st@persynix.com',  hash, 7, 3, 'Design', 'Senior Designer'],
      ['GV-ST-028', 'Staff Grovia',      'st@grovia.in',     hash, 7, 4, 'Design', 'Senior Designer'],

      // ── L8 Intern (per venture) ──────────────────────────────────
      ['DW-IN-029', 'Intern Dropwing',   'in@dropwing.in',   hash, 8, 1, 'Engineering', 'Software Intern'],
      ['FS-IN-030', 'Intern Fenixa Solutions',  'in@fenixa.com', hash, 8, 2, 'Engineering', 'Software Intern'],
      ['PX-IN-031', 'Intern PerSyniX',    'in@persynix.com',  hash, 8, 3, 'Engineering', 'Software Intern'],
      ['GV-IN-032', 'Intern Grovia',      'in@grovia.in',     hash, 8, 4, 'Engineering', 'Software Intern'],

      // ── L9 Client (per venture) ──────────────────────────────────
      ['DW-CL-033', 'Client Dropwing',   'cl@dropwing.in',   hash, 9, 1, 'External', 'Client'],
      ['FS-CL-034', 'Client Fenixa Solutions',  'cl@fenixa.com', hash, 9, 2, 'External', 'Client'],
      ['PX-CL-035', 'Client PerSyniX',    'cl@persynix.com',  hash, 9, 3, 'External', 'Client'],
      ['GV-CL-036', 'Client Grovia',      'cl@grovia.in',     hash, 9, 4, 'External', 'Client'],
    ];

    for (const [eid, name, email, pwd, level, vid, dept, desig] of users) {
      await conn.query(
        `INSERT INTO users
          (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           full_name    = VALUES(full_name),
           email        = VALUES(email),
           password_hash = VALUES(password_hash),
           access_level = VALUES(access_level),
           venture_id   = VALUES(venture_id),
           department   = VALUES(department),
           designation  = VALUES(designation)`,
        [eid, name, email, pwd, level, vid, dept, desig]
      );
      console.log(`  ✓ L${level} — ${name} <${email}>`);
    }

    // ── Seed default Learning Hub checklist items ───────────────────
    console.log('\n📋 Seeding default Learning Hub checklist items (global)...');
    const checklistItems = [
      ['Complete HR onboarding paperwork', 'Submit all required HR documents including NDA, offer letter, and emergency contacts.', 'Onboarding', 1, 3],
      ['Set up development environment', 'Install required tools, clone repos, and run the project locally.', 'Setup', 2, 5],
      ['Read the InternalX documentation', 'Familiarize yourself with the platform architecture and feature set.', 'Onboarding', 3, 3],
      ['Attend team introduction meeting', 'Meet your manager, team lead, and fellow team members.', 'Onboarding', 4, 2],
      ['Complete first assigned task', 'Pick up and complete your first task from the task board.', 'Milestones', 5, 14],
      ['Submit your first timesheet', 'Log your hours for the first working week and submit for approval.', 'Operations', 6, 7],
      ['Review company brand guidelines', 'Read the venture brand style guide and design principles.', 'Learning', 7, 5],
      ['Shadow a senior team member', 'Spend at least one day shadowing a senior employee on their workflow.', 'Learning', 8, 7],
    ];

    for (const [title, desc, category, sort_order, due_days] of checklistItems) {
      await conn.query(
        `INSERT IGNORE INTO learning_checklist_items (title, description, category, sort_order, due_days, venture_id) VALUES (?, ?, ?, ?, ?, NULL)`,
        [title, desc, category, sort_order, due_days]
      );
    }
    console.log(`  ✓ ${checklistItems.length} default checklist items`);

    // ── Done ────────────────────────────────────────────────────────
    console.log('\n✅ Database seeded successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋  INTERNALX TEST ACCOUNTS  (password: Test@1234)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Global:');
    console.log('    L1 Super Admin       → sa@dropwinggroups.com');
    console.log('    L2 Managing Director → md@dropwinggroups.com');
    console.log('');
    console.log('  Per-venture pattern:  <role>@<venture>.<tld>');
    console.log('    sa / md / ad / cx / mg / es / st / in / cl');
    console.log('    @dropwing.in  @fenixa.com  @persynix.com  @grovia.in');
    console.log('');
    console.log('  Examples:');
    console.log('    cx@dropwing.in   → CXO Dropwing (L4)');
    console.log('    in@fenixa.com → Intern Fenixa Solutions (L8)');
    console.log('    cl@grovia.in     → Client Grovia (L9)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

runSeed();
