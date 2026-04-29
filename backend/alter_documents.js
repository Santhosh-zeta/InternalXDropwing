require('dotenv').config();
const { pool } = require('./src/config/database');

async function alterDocuments() {
  let conn;
  try {
    conn = await pool.getConnection();

    console.log('Creating documents table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100),
        size INT,
        path VARCHAR(255),
        venture_id INT,
        project_id INT,
        uploaded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log('Documents DB setup complete.');

  } catch (err) {
    console.error(err);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}
alterDocuments();
