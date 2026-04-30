require('dotenv').config();
const { pool } = require('../src/config/database');

async function migrate() {
  try {
    console.log('Checking for tags column...');
    const [cols] = await pool.query('SHOW COLUMNS FROM projects LIKE "tags"');
    if (cols.length === 0) {
      console.log('Adding tags column...');
      await pool.query('ALTER TABLE projects ADD COLUMN tags JSON');
    }

    console.log('Creating project_milestones table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_milestones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date DATE,
        status ENUM('pending', 'completed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
