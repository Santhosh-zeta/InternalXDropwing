require('dotenv').config();
const { pool } = require('./src/config/database');

async function migrate() {
  try {
    console.log('Creating task_assignees table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_assignees (
        task_id INT NOT NULL,
        user_id INT NOT NULL,
        PRIMARY KEY (task_id, user_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    console.log('Migrating existing task assignments...');
    const result = await pool.query(`
      INSERT IGNORE INTO task_assignees (task_id, user_id)
      SELECT id, assigned_to FROM tasks WHERE assigned_to IS NOT NULL;
    `);

    console.log(`Migration completed. Result:`, result);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
