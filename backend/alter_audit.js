require('dotenv').config();
const { pool } = require('./src/config/database');

async function createAuditTable() {
  let conn;
  try {
    conn = await pool.getConnection();

    console.log('Creating audit_logs table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT,
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('Created audit_logs table successfully.');

  } catch (err) {
    console.error('Error creating audit_logs table:', err);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

createAuditTable();
