require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const sql = [
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type ENUM('task_assigned','task_updated','project_update','mention','deadline','system') DEFAULT 'system',
      title VARCHAR(255) NOT NULL,
      message TEXT,
      link VARCHAR(255),
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_notifications_user (user_id),
      INDEX idx_notifications_read (is_read)
    )`,
    // Seed a few demo notifications for user ID 1 (Super Admin)
    `INSERT IGNORE INTO notifications (id, user_id, type, title, message, is_read) VALUES
      (1, 1, 'system', 'Welcome to InternalX v2!', 'Reports, Access Control, and Notifications are now live.', 0),
      (2, 1, 'task_assigned', 'New Task Assigned', 'You have been assigned: Review Q2 design assets', 0),
      (3, 1, 'deadline', 'Deadline Approaching', 'Project SerphoSoft Website Redesign is due in 2 days', 0),
      (4, 1, 'project_update', 'Project Status Updated', 'PerSyniX AI Dashboard moved to In Progress', 1),
      (5, 1, 'mention', 'Mentioned in Chat', 'Super Admin was mentioned in #dropwing-general', 1)
    `,
  ];

  for (const stmt of sql) {
    await pool.query(stmt);
    console.log('OK:', stmt.trim().split('\n')[0].substring(0, 60));
  }

  console.log('\nMigration complete!');
  await pool.end();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
