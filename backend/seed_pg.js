require('dotenv').config();
const { pgPool } = require('./src/config/database.pg');

async function runSeed() {
  console.log('🌱 Seeding reference data (ventures, access levels, learning checklist). No user accounts are created; see README: bootstrap admin / npm run create-admin.');

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
