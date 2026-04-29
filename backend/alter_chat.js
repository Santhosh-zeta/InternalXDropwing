require('dotenv').config();
const { pool } = require('./src/config/database');

async function alterChat() {
  let conn;
  try {
    conn = await pool.getConnection();

    console.log('Creating messages table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NULL,
        venture_id INT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE CASCADE
      )
    `);
    console.log('Messages table created successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}
alterChat();
