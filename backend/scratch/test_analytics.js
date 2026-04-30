require('dotenv').config();

async function test() {
  try {
    // We need a token. Let's assume we can bypass or we have one.
    // Actually, I'll just check the query in the backend by running it in a script.
    const { pool } = require('../src/config/database');
    
    console.log('Testing analytics queries...');
    
    // Test audit logs
    const [auditRows] = await pool.query(`
      SELECT a.action_type as action, a.created_at, u.full_name as user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC LIMIT 10
    `);
    console.log('Audit logs success:', auditRows.length);

    // Test monthly tasks
    const [monthlyTasks] = await pool.query(`
      SELECT DATE_FORMAT(updated_at, '%b') as name, COUNT(*) as tasks, MONTH(updated_at) as m
      FROM tasks
      WHERE status = 'completed' AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(updated_at, '%b'), MONTH(updated_at)
      ORDER BY m ASC
    `);
    console.log('Monthly tasks success:', monthlyTasks.length);

    // Test monthly projects
    const [monthlyProjects] = await pool.query(`
      SELECT DATE_FORMAT(updated_at, '%b') as name, COUNT(*) as projects, MONTH(updated_at) as m
      FROM projects
      WHERE status = 'Completed' AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(updated_at, '%b'), MONTH(updated_at)
      ORDER BY m ASC
    `);
    console.log('Monthly projects success:', monthlyProjects.length);

    // Test announcements
    const [announcements] = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5');
    console.log('Announcements success:', announcements.length);

    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

test();
