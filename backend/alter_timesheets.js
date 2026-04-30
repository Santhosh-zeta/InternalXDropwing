require('dotenv').config();
const { pool } = require('./src/config/database');

async function alterTimesheets() {
  let conn;
  try {
    conn = await pool.getConnection();

    console.log('Creating timesheets table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS timesheets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        task_id INT,
        project_id INT,
        venture_id INT,
        hours_worked DECIMAL(5, 2) NOT NULL,
        date DATE NOT NULL,
        notes TEXT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        approved_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Let's seed some dummy timesheets
    console.log('Seeding dummy timesheets...');
    
    // Get some users (L6 to L9)
    const [users] = await conn.query('SELECT id, access_level, venture_id FROM users WHERE access_level >= 6 LIMIT 5');
    
    for (const u of users) {
      // Get a project for this venture
      const [projects] = await conn.query('SELECT id FROM projects WHERE venture_id = ? OR venture_id IS NULL LIMIT 1', [u.venture_id]);
      const projectId = projects.length ? projects[0].id : null;
      
      // Get a task
      const [tasks] = await conn.query('SELECT id FROM tasks WHERE project_id = ? OR project_id IS NULL LIMIT 1', [projectId]);
      const taskId = tasks.length ? tasks[0].id : null;

      // Check if user already has timesheets to avoid duplicates
      const [existing] = await conn.query('SELECT id FROM timesheets WHERE user_id = ? LIMIT 1', [u.id]);
      if (existing.length === 0) {
        await conn.query(`
          INSERT INTO timesheets (user_id, task_id, project_id, venture_id, hours_worked, date, notes, status)
          VALUES (?, ?, ?, ?, ?, CURDATE() - INTERVAL 1 DAY, 'Worked on initial setup', 'pending')
        `, [u.id, taskId, projectId, u.venture_id, 4.5]);
        
        await conn.query(`
          INSERT INTO timesheets (user_id, task_id, project_id, venture_id, hours_worked, date, notes, status)
          VALUES (?, ?, ?, ?, ?, CURDATE() - INTERVAL 2 DAY, 'Reviewing requirements', 'approved')
        `, [u.id, taskId, projectId, u.venture_id, 3.0]);
      }
    }

    console.log('Timesheets DB setup complete.');

  } catch (err) {
    console.error(err);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}
alterTimesheets();
