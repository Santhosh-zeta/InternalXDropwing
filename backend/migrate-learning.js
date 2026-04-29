require('dotenv').config({ path: './src/../.env' });
const mysql = require('mysql2/promise');

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'internalx_db',
    waitForConnections: true,
  });

  const conn = await pool.getConnection();
  console.log('✅ Connected to database');

  try {
    // 1. Checklist items
    await conn.query(`
      CREATE TABLE IF NOT EXISTS learning_checklist_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'General',
        sort_order INT DEFAULT 0,
        due_days INT DEFAULT NULL COMMENT 'Days after joining to complete',
        venture_id INT DEFAULT NULL COMMENT 'NULL = applies to all ventures',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ learning_checklist_items table ready');

    // 2. Intern progress
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
    console.log('✅ learning_intern_progress table ready');

    // 3. Resources
    await conn.query(`
      CREATE TABLE IF NOT EXISTS learning_resources (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500) NOT NULL,
        category VARCHAR(100) DEFAULT 'General',
        resource_type ENUM('link','doc','video','pdf') DEFAULT 'link',
        added_by INT,
        venture_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ learning_resources table ready');

    // 4. Manager feedback
    await conn.query(`
      CREATE TABLE IF NOT EXISTS learning_feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        manager_id INT NOT NULL,
        intern_id INT NOT NULL,
        note TEXT NOT NULL,
        rating TINYINT DEFAULT NULL COMMENT '1-5 stars',
        week_label VARCHAR(50) DEFAULT NULL,
        venture_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (intern_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ learning_feedback table ready');

    // ── Seed default checklist items ─────────────────────────────────────────
    const [existing] = await conn.query('SELECT COUNT(*) AS cnt FROM learning_checklist_items WHERE venture_id IS NULL');
    if (existing[0].cnt === 0) {
      const defaultItems = [
        // Onboarding
        ['Complete HR paperwork & ID card collection', 'Submit all required documents to the HR team.', 'Onboarding', 1, 1],
        ['Set up work email & communication tools', 'Configure Outlook, Slack, and internal channels.', 'Onboarding', 2, 1],
        ['Read company handbook & policies', 'Review the employee handbook and acknowledge policies.', 'Onboarding', 3, 3],
        ['Meet your assigned buddy / mentor', 'Schedule a 30-min intro call with your assigned buddy.', 'Onboarding', 4, 2],
        ['Complete security & compliance training', 'Finish the mandatory information security module.', 'Onboarding', 5, 7],
        // Technical
        ['Set up local development environment', 'Install required tools, clone repos, and run locally.', 'Technical', 1, 3],
        ['Review codebase architecture doc', 'Read through the technical architecture documentation.', 'Technical', 2, 5],
        ['Submit first pull request (even a small fix)', 'Make a code contribution and go through code review.', 'Technical', 3, 14],
        ['Attend a sprint planning / standup', 'Participate in at least one agile ceremony.', 'Technical', 4, 7],
        // Professional
        ['Complete LinkedIn profile update', 'Add current internship and connect with team members.', 'Professional', 1, 7],
        ['Attend all-hands or venture meeting', 'Join the weekly / monthly company-wide meeting.', 'Professional', 2, 14],
        ['Schedule 1-on-1 with direct manager', 'Book a 30-min weekly check-in with your manager.', 'Professional', 3, 5],
        // Learning
        ['Complete platform walkthrough (InternalX)', 'Explore all modules accessible at your access level.', 'Learning', 1, 2],
        ['Read assigned resources in the Resource Library', 'Go through the curated reading list in the Learning Hub.', 'Learning', 2, 10],
        ['Submit first weekly status report', 'Write a brief update on your week and share with manager.', 'Learning', 3, 7],
      ];

      for (const [title, description, category, sort_order, due_days] of defaultItems) {
        await conn.query(
          'INSERT INTO learning_checklist_items (title, description, category, sort_order, due_days, venture_id) VALUES (?,?,?,?,?,NULL)',
          [title, description, category, sort_order, due_days]
        );
      }
      console.log('✅ Seeded 15 default checklist items');
    } else {
      console.log('ℹ️  Default checklist items already exist, skipping seed');
    }

    // ── Seed default resources ────────────────────────────────────────────────
    const [existingRes] = await conn.query('SELECT COUNT(*) AS cnt FROM learning_resources WHERE venture_id IS NULL');
    if (existingRes[0].cnt === 0) {
      const defaultResources = [
        ['Getting Started with Git', 'Essential Git commands for version control', 'https://git-scm.com/book/en/v2', 'Technical', 'link'],
        ['Conventional Commits Guide', 'How to write structured commit messages', 'https://www.conventionalcommits.org', 'Technical', 'doc'],
        ['InternalX API Documentation', 'Full API reference for InternalX backend', 'http://localhost:5000/api/health', 'Technical', 'doc'],
        ['Agile & Scrum Basics', 'Introduction to Agile methodology and Scrum framework', 'https://www.atlassian.com/agile/scrum', 'Process', 'link'],
        ['Code Review Best Practices', 'How to give and receive effective code reviews', 'https://google.github.io/eng-practices/review/', 'Technical', 'doc'],
        ['Company Brand Guidelines', 'Visual identity, colors, and usage guidelines', 'https://dropwinggroups.com', 'General', 'link'],
        ['Information Security 101', 'Basics of data protection and workplace security', 'https://www.sans.org/security-awareness-training/resources/', 'Compliance', 'link'],
        ['Effective Communication at Work', 'Tips for professional email, Slack, and meeting etiquette', 'https://hbr.org/topic/subject/communication', 'Professional', 'link'],
      ];

      for (const [title, description, url, category, resource_type] of defaultResources) {
        await conn.query(
          'INSERT INTO learning_resources (title, description, url, category, resource_type, added_by, venture_id) VALUES (?,?,?,?,?,NULL,NULL)',
          [title, description, url, category, resource_type]
        );
      }
      console.log('✅ Seeded 8 default resources');
    } else {
      console.log('ℹ️  Default resources already exist, skipping seed');
    }

    console.log('\n🎓 Learning Hub migration complete!\n');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    conn.release();
    await pool.end();
  }
}

migrate();
