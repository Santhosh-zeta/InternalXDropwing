require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const tables = [
    {
      name: 'learning_checklist_items',
      sql: `CREATE TABLE IF NOT EXISTS learning_checklist_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'General',
        sort_order INT DEFAULT 0,
        due_days INT NULL,
        venture_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL
      )`,
    },
    {
      name: 'learning_intern_progress',
      sql: `CREATE TABLE IF NOT EXISTS learning_intern_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        checklist_item_id INT NOT NULL,
        completed TINYINT(1) DEFAULT 0,
        completed_at TIMESTAMP NULL,
        UNIQUE KEY uq_user_item (user_id, checklist_item_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (checklist_item_id) REFERENCES learning_checklist_items(id) ON DELETE CASCADE
      )`,
    },
    {
      name: 'learning_resources',
      sql: `CREATE TABLE IF NOT EXISTS learning_resources (
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
      )`,
    },
    {
      name: 'learning_feedback',
      sql: `CREATE TABLE IF NOT EXISTS learning_feedback (
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
      )`,
    },
  ];

  for (const t of tables) {
    try {
      await conn.query(t.sql);
      console.log('✅ Table ready:', t.name);
    } catch (e) {
      console.error('❌ Failed:', t.name, '-', e.message);
    }
  }

  await conn.end();
  console.log('\n✅ Migration complete.');
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
