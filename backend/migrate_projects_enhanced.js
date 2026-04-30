require('dotenv').config();
const { pool } = require('./src/config/database');

async function migrate() {
  const connection = await pool.getConnection();
  try {
    console.log('Starting migration: Enhance Projects...');

    // 1. Add new columns to projects
    await connection.query(`
      ALTER TABLE projects 
      ADD COLUMN priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' AFTER status,
      ADD COLUMN category VARCHAR(100) DEFAULT 'General' AFTER priority,
      ADD COLUMN client_name VARCHAR(255) AFTER category,
      ADD COLUMN client_email VARCHAR(255) AFTER client_name
    `);
    console.log('  ✓ projects table updated');

    // 2. Create project_members table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        user_id INT NOT NULL,
        role VARCHAR(100) DEFAULT 'Contributor',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY idx_project_user (project_id, user_id)
      )
    `);
    console.log('  ✓ project_members table created');

    console.log('Migration completed successfully.');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('  ! Columns already exist, skipping...');
    } else {
      console.error('Migration failed:', err);
    }
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrate();
