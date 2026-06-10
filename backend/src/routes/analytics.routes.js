const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

// GET /api/analytics
router.get('/', authenticate, async (req, res) => {
  try {
    const accessLevel = req.user.accessLevel;
    const userVentureId = req.user.ventureId;
    
    // 1. Budget/Revenue Distribution by Venture (Only for L1-L4)
    let budgetDistribution = [];
    if (accessLevel <= 4) {
      let budgetQuery = `
        SELECT v.name as venture, v.primary_color as color, SUM(p.budget) as total_budget
        FROM projects p
        JOIN ventures v ON p.venture_id = v.id
      `;
      const budgetParams = [];
      if (accessLevel > 2) {
        budgetQuery += ` WHERE p.venture_id = ?`;
        budgetParams.push(userVentureId);
      }
      budgetQuery += ` GROUP BY v.id`;
      
      const [budgetRows] = await pool.query(budgetQuery, budgetParams);
      budgetDistribution = budgetRows;
    }

    // 2. Task Completion Velocity (Last 7 Days)
    let velocityQuery = `
      SELECT DATE(updated_at) as date, COUNT(*) as completed_tasks
      FROM tasks
      WHERE status = 'completed' AND updated_at >= CURRENT_DATE - INTERVAL '7 days'
    `;
    const velocityParams = [];
    if (accessLevel > 2) {
      if (accessLevel <= 5) {
        velocityQuery += ` AND venture_id = ?`;
        velocityParams.push(userVentureId);
      } else {
        velocityQuery += ` AND (assigned_to = ? OR assigned_by = ?)`;
        velocityParams.push(req.user.id, req.user.id);
      }
    }
    velocityQuery += ` GROUP BY DATE(updated_at) ORDER BY date ASC`;
    const [velocityRows] = await pool.query(velocityQuery, velocityParams);

    // 3. Active User Distribution (Only L1-L2 sees all, others see their venture)
    let userDistQuery = `
      SELECT v.name as name, v.primary_color as color, COUNT(u.id) as value
      FROM users u
      LEFT JOIN ventures v ON u.venture_id = v.id
      WHERE u.is_active = TRUE AND u.venture_id IS NOT NULL
    `;
    const userDistParams = [];
    if (accessLevel > 2) {
      userDistQuery += ` AND u.venture_id = ?`;
      userDistParams.push(userVentureId);
    }
    userDistQuery += ` GROUP BY v.id`;
    const [userDistRows] = await pool.query(userDistQuery, userDistParams);

    // Format dates for velocity
    const velocityFormatted = velocityRows.map(row => {
      const d = new Date(row.date);
      const formattedDate = d.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        name: formattedDate,
        completed: row.completed_tasks
      }
    });

    // 4. Recent Activity (Audit Logs)
    let auditQuery = `
      SELECT a.action_type as action, a.created_at, u.full_name as user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
    `;
    const auditParams = [];
    if (accessLevel > 2) {
      auditQuery += ` WHERE u.venture_id = ? OR u.venture_id IS NULL`;
      auditParams.push(userVentureId);
    }
    auditQuery += ` ORDER BY a.created_at DESC LIMIT 10`;
    const [auditRows] = await pool.query(auditQuery, auditParams);

    // 5. Monthly Performance (Last 6 Months)
    const [monthlyTasks] = await pool.query(`
      SELECT TO_CHAR(updated_at, 'Mon') as name, COUNT(*) as tasks, EXTRACT(MONTH FROM updated_at) as m
      FROM tasks
      WHERE status = 'completed' AND updated_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(updated_at, 'Mon'), EXTRACT(MONTH FROM updated_at)
      ORDER BY m ASC
    `);

    const [monthlyProjects] = await pool.query(`
      SELECT TO_CHAR(updated_at, 'Mon') as name, COUNT(*) as projects, EXTRACT(MONTH FROM updated_at) as m
      FROM projects
      WHERE status = 'completed' AND updated_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(updated_at, 'Mon'), EXTRACT(MONTH FROM updated_at)
      ORDER BY m ASC
    `);

    // Merge monthly data robustly
    const allMonths = [...new Set([...monthlyTasks.map(t => t.name), ...monthlyProjects.map(p => p.name)])];
    const monthlyPerformance = allMonths.map(month => {
      const t = monthlyTasks.find(mt => mt.name === month);
      const p = monthlyProjects.find(mp => mp.name === month);
      return {
        name: month,
        tasks: t ? t.tasks : 0,
        projects: p ? p.projects : 0,
        m: t ? t.m : (p ? p.m : 0)
      };
    }).sort((a, b) => a.m - b.m);

    // 6. Announcements
    const [announcements] = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5');

    res.json({
      success: true,
      data: {
        budgetDistribution,
        taskVelocity: velocityFormatted,
        userDistribution: userDistRows.map(row => ({ name: row.name, value: row.value, color: row.color })),
        recentActivity: auditRows,
        monthlyPerformance,
        announcements
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
