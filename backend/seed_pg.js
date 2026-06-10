require('dotenv').config();
const { pgPool } = require('./src/config/database.pg');
const bcrypt = require('bcryptjs');

async function runSeed() {
  console.log('🌱 Starting PostgreSQL database seed...');

  let client;
  try {
    client = await pgPool.connect();
    console.log('✅ Connected to PostgreSQL');

    // ── Seed Ventures ───────────────────────────────────────────────
    console.log('\n🏢 Seeding ventures...');
    const ventures = [
      ['Dropwing Design Studio', 'dropwing',   '#8B5CF6', 'Creative design studio specializing in brand identity and UI/UX'],
      ['Fenixa Solutions',       'fenixa',      '#06B6D4', 'Software development and SaaS solutions'],
      ['PerSyniX',               'persynix',    '#F59E0B', 'AI & ML solutions platform'],
      ['Grovia',                 'grovia',      '#10B981', 'Marketing and growth solutions'],
    ];
    for (const [name, slug, color, desc] of ventures) {
      await client.query(
        `INSERT INTO ventures (name, slug, primary_color, description) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO NOTHING`,
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
      await client.query(
        `INSERT INTO access_levels (level_number, level_name, description) 
         VALUES ($1, $2, $3)
         ON CONFLICT (level_number) DO NOTHING`,
        [num, name, desc]
      );
      console.log(`  ✓ L${num} — ${name}`);
    }

    // ── Generate bcrypt hash ────────────────────────────────────────
    console.log('\n🔐 Generating bcrypt hash for Test@1234...');
    const hash = await bcrypt.hash('Test@1234', 12);
    console.log('  ✓ Hash generated');

    // ── Seed Users ──────────────────────────────────────────────────
    console.log('\n👥 Seeding users...');

    // Fetch venture IDs based on slug
    const res = await client.query('SELECT id, slug FROM ventures');
    const ventureMap = {};
    res.rows.forEach(r => ventureMap[r.slug] = r.id);

    const users = [
      // Global
      ['DG-SA-001', 'Super Admin',      'sa@dropwinggroups.com', hash, 1, null, 'Executive', 'Super Administrator'],
      ['DG-MD-001', 'Managing Director','md@dropwinggroups.com', hash, 2, null, 'Executive', 'Managing Director'],
      // Dropwing
      ['DW-AD-009', 'Admin Dropwing',   'ad@dropwing.in',   hash, 3, ventureMap['dropwing'], 'Operations', 'Administrator'],
      ['DW-CX-013', 'CXO Dropwing',   'cx@dropwing.in',   hash, 4, ventureMap['dropwing'], 'Executive', 'Chief Technology Officer'],
      ['DW-MG-017', 'Manager Dropwing',   'mg@dropwing.in',   hash, 5, ventureMap['dropwing'], 'Product', 'Product Manager'],
      ['DW-ES-021', 'Executive Staff Dropwing',   'es@dropwing.in',   hash, 6, ventureMap['dropwing'], 'Operations', 'Executive Officer'],
      ['DW-ST-025', 'Staff Dropwing',   'st@dropwing.in',   hash, 7, ventureMap['dropwing'], 'Design', 'Senior Designer'],
      ['DW-IN-029', 'Intern Dropwing',   'in@dropwing.in',   hash, 8, ventureMap['dropwing'], 'Engineering', 'Software Intern'],
      ['DW-CL-033', 'Client Dropwing',   'cl@dropwing.in',   hash, 9, ventureMap['dropwing'], 'External', 'Client'],
      // Fenixa
      ['FS-AD-010', 'Admin Fenixa Solutions',  'ad@fenixa.com', hash, 3, ventureMap['fenixa'], 'Operations', 'Administrator'],
      ['FS-CX-014', 'CXO Fenixa Solutions',  'cx@fenixa.com', hash, 4, ventureMap['fenixa'], 'Executive', 'Chief Technology Officer'],
      ['FS-MG-018', 'Manager Fenixa Solutions',  'mg@fenixa.com', hash, 5, ventureMap['fenixa'], 'Product', 'Product Manager'],
      ['FS-ES-022', 'Executive Staff Fenixa Solutions',  'es@fenixa.com', hash, 6, ventureMap['fenixa'], 'Operations', 'Executive Officer'],
      ['FS-ST-026', 'Staff Fenixa Solutions',  'st@fenixa.com', hash, 7, ventureMap['fenixa'], 'Design', 'Senior Designer'],
      ['FS-IN-030', 'Intern Fenixa Solutions',  'in@fenixa.com', hash, 8, ventureMap['fenixa'], 'Engineering', 'Software Intern'],
      ['FS-CL-034', 'Client Fenixa Solutions',  'cl@fenixa.com', hash, 9, ventureMap['fenixa'], 'External', 'Client'],
      // PerSyniX
      ['PX-AD-011', 'Admin PerSyniX',    'ad@persynix.com',  hash, 3, ventureMap['persynix'], 'Operations', 'Administrator'],
      ['PX-CX-015', 'CXO PerSyniX',    'cx@persynix.com',  hash, 4, ventureMap['persynix'], 'Executive', 'Chief Technology Officer'],
      ['PX-MG-019', 'Manager PerSyniX',    'mg@persynix.com',  hash, 5, ventureMap['persynix'], 'Product', 'Product Manager'],
      ['PX-ES-023', 'Executive Staff PerSyniX',    'es@persynix.com',  hash, 6, ventureMap['persynix'], 'Operations', 'Executive Officer'],
      ['PX-ST-027', 'Staff PerSyniX',    'st@persynix.com',  hash, 7, ventureMap['persynix'], 'Design', 'Senior Designer'],
      ['PX-IN-031', 'Intern PerSyniX',    'in@persynix.com',  hash, 8, ventureMap['persynix'], 'Engineering', 'Software Intern'],
      ['PX-CL-035', 'Client PerSyniX',    'cl@persynix.com',  hash, 9, ventureMap['persynix'], 'External', 'Client'],
      // Grovia
      ['GV-AD-012', 'Admin Grovia',      'ad@grovia.in',     hash, 3, ventureMap['grovia'], 'Operations', 'Administrator'],
      ['GV-CX-016', 'CXO Grovia',      'cx@grovia.in',     hash, 4, ventureMap['grovia'], 'Executive', 'Chief Technology Officer'],
      ['GV-MG-020', 'Manager Grovia',      'mg@grovia.in',     hash, 5, ventureMap['grovia'], 'Product', 'Product Manager'],
      ['GV-ES-024', 'Executive Staff Grovia',      'es@grovia.in',     hash, 6, ventureMap['grovia'], 'Operations', 'Executive Officer'],
      ['GV-ST-028', 'Staff Grovia',      'st@grovia.in',     hash, 7, ventureMap['grovia'], 'Design', 'Senior Designer'],
      ['GV-IN-032', 'Intern Grovia',      'in@grovia.in',     hash, 8, ventureMap['grovia'], 'Engineering', 'Software Intern'],
      ['GV-CL-036', 'Client Grovia',      'cl@grovia.in',     hash, 9, ventureMap['grovia'], 'External', 'Client'],
    ];

    for (const [eid, name, email, pwd, level, vid, dept, desig] of users) {
      await client.query(
        `INSERT INTO users
          (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         ON CONFLICT (email) DO UPDATE SET
           full_name    = EXCLUDED.full_name,
           password_hash = EXCLUDED.password_hash,
           access_level = EXCLUDED.access_level,
           venture_id   = EXCLUDED.venture_id,
           department   = EXCLUDED.department,
           designation  = EXCLUDED.designation,
           is_verified  = EXCLUDED.is_verified`,
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
      // Postgres doesn't have INSERT IGNORE. Use ON CONFLICT if we had a unique constraint, 
      // but learning_checklist_items doesn't have a unique constraint. 
      // We'll check if it exists first.
      const exists = await client.query('SELECT id FROM learning_checklist_items WHERE title = $1', [title]);
      if (exists.rows.length === 0) {
        await client.query(
          `INSERT INTO learning_checklist_items (title, description, category, sort_order, due_days, venture_id) VALUES ($1, $2, $3, $4, $5, NULL)`,
          [title, desc, category, sort_order, due_days]
        );
      }
    }
    console.log(`  ✓ ${checklistItems.length} default checklist items`);

    console.log('\n✅ PostgreSQL Database seeded successfully!\n');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
  } finally {
    if (client) client.release();
    process.exit(0);
  }
}

runSeed();
