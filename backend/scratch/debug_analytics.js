require('dotenv').config();
const { pool } = require('../src/config/database');

async function testAnalytics() {
  try {
    const accessLevel = 1; // Super Admin
    const userVentureId = null;

    console.log('Testing Monthly Tasks...');
    const [monthlyTasks] = await pool.query(`
      SELECT DATE_FORMAT(updated_at, '%b') as name, COUNT(*) as tasks, MONTH(updated_at) as m
      FROM tasks
      WHERE status = 'completed' AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(updated_at, '%b'), MONTH(updated_at)
      ORDER BY m ASC
    `);
    console.log('Monthly Tasks:', monthlyTasks.length);

    console.log('Testing Monthly Projects...');
    const [monthlyProjects] = await pool.query(`
      SELECT DATE_FORMAT(updated_at, '%b') as name, COUNT(*) as projects, MONTH(updated_at) as m
      FROM projects
      WHERE status = 'Completed' AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(updated_at, '%b'), MONTH(updated_at)
      ORDER BY m ASC
    `);
    console.log('Monthly Projects:', monthlyProjects.length);

    console.log('Testing Announcements...');
    const [announcements] = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5');
    console.log('Announcements:', announcements.length);

    console.log('SUCCESS');
  } catch (err) {
    console.error('FAILED:', err);
  } finally {
    process.exit();
  }
}

testAnalytics();
