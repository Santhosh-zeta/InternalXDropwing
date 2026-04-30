require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'internalx'
};

async function migrate() {
  const connection = await mysql.createConnection(dbConfig);
  console.log('Connected to MySQL.');

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        type VARCHAR(50) DEFAULT 'general',
        venture_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "announcements" created.');

    const [rows] = await connection.query('SELECT count(*) as count FROM announcements');
    if (rows[0].count === 0) {
      await connection.query('INSERT INTO announcements (title, content, type) VALUES (?, ?, ?)', [
        'Q3 Townhall Meeting Scheduled',
        'Please join us next Friday at 2 PM for the quarterly townhall. Calendar invites have been sent out.',
        'update'
      ]);
      await connection.query('INSERT INTO announcements (title, content, type) VALUES (?, ?, ?)', [
        'Submit Timesheets',
        'Don\'t forget to submit your weekly timesheets by Friday 5 PM.',
        'reminder'
      ]);
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
