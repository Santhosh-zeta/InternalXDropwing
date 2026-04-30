require('dotenv').config();
const { pool } = require('../src/config/database');

async function check() {
  try {
    const [rows] = await pool.query('SHOW TABLES LIKE "notifications"');
    if (rows.length === 0) {
      console.log('Notifications table NOT FOUND. Creating it...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          link VARCHAR(255),
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('Table created.');
    } else {
      console.log('Notifications table exists.');
      const [cols] = await pool.query('DESCRIBE notifications');
      console.log(cols);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
