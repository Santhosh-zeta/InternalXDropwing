const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { reportLimiter } = require('../middleware/rateLimit.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { withScope, internalOnly, taskWhere, projectWhere, ventureWhere } = require('../utils/scope');

// GET /api/platform-metrics — internal staff only; every number is scoped
// (global: everything, L3-5: own venture, L6-8: what they are on).
router.get('/', authenticate, withScope, internalOnly, reportLimiter, async (req, res) => {
  try {
    const { scope } = req;

    // 1. Budget distribution by venture (L<=4; budgets are hidden from lower levels)
    let budgetDistribution = [];
    if (scope.level <= 4) {
      const params = [];
      const [budgetRows] = await pool.query(`
        SELECT v.name as venture, v.primary_color as color, SUM(p.budget) as total_budget
        FROM projects p
        JOIN ventures v ON p.venture_id = v.id
        WHERE ${projectWhere(scope, 'p', params)}
        GROUP BY v.id
      `, params);
      budgetDistribution = budgetRows;
    }

    // 2. Task completion velocity (last 7 days)
    const velParams = [];
    const [velocityRows] = await pool.query(`
      SELECT DATE(t.updated_at) as date, COUNT(*)::int as completed_tasks
      FROM tasks t
      WHERE t.status = 'completed' AND t.updated_at >= CURRENT_DATE - INTERVAL '7 days'
        AND ${taskWhere(scope, 't', velParams)}
      GROUP BY DATE(t.updated_at) ORDER BY date ASC
    `, velParams);

    // 3. Active users per venture (global: all ventures, others: own venture)
    const userParams = [];
    const [userDistRows] = await pool.query(`
      SELECT v.name as name, v.primary_color as color, COUNT(u.id)::int as value
      FROM users u
      LEFT JOIN ventures v ON u.venture_id = v.id
      WHERE u.is_active = TRUE AND u.venture_id IS NOT NULL AND u.access_level <= 8
        AND ${ventureWhere(scope, 'u.venture_id', userParams)}
      GROUP BY v.id
    `, userParams);

    const velocityFormatted = velocityRows.map(row => ({
      name: new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }),
      completed: row.completed_tasks,
    }));

    // 4. Recent activity: the actions of people in the caller's venture. Global
    // users' (L1/L2) actions are only shown to other global users. L6-L8 get none.
    const auditParams = [];
    const [auditRows] = scope.level > 5 ? [[]] : await pool.query(`
      SELECT a.action_type as action, a.created_at, u.full_name as user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE ${scope.global ? 'TRUE' : ventureWhere(scope, 'u.venture_id', auditParams)}
      ORDER BY a.created_at DESC LIMIT 10
    `, auditParams);

    // 5. Monthly performance (last 6 months)
    const mtParams = [];
    const [monthlyTasks] = await pool.query(`
      SELECT TO_CHAR(t.updated_at, 'Mon') as name, COUNT(*)::int as tasks, EXTRACT(MONTH FROM t.updated_at)::int as m
      FROM tasks t
      WHERE t.status = 'completed' AND t.updated_at >= CURRENT_DATE - INTERVAL '6 months'
        AND ${taskWhere(scope, 't', mtParams)}
      GROUP BY TO_CHAR(t.updated_at, 'Mon'), EXTRACT(MONTH FROM t.updated_at)
      ORDER BY m ASC
    `, mtParams);

    const mpParams = [];
    const [monthlyProjects] = await pool.query(`
      SELECT TO_CHAR(p.updated_at, 'Mon') as name, COUNT(*)::int as projects, EXTRACT(MONTH FROM p.updated_at)::int as m
      FROM projects p
      WHERE p.status = 'completed' AND p.updated_at >= CURRENT_DATE - INTERVAL '6 months'
        AND ${projectWhere(scope, 'p', mpParams)}
      GROUP BY TO_CHAR(p.updated_at, 'Mon'), EXTRACT(MONTH FROM p.updated_at)
      ORDER BY m ASC
    `, mpParams);

    const allMonths = [...new Set([...monthlyTasks.map(t => t.name), ...monthlyProjects.map(p => p.name)])];
    const monthlyPerformance = allMonths.map(month => {
      const t = monthlyTasks.find(mt => mt.name === month);
      const p = monthlyProjects.find(mp => mp.name === month);
      return { name: month, tasks: t ? t.tasks : 0, projects: p ? p.projects : 0, m: t ? t.m : (p ? p.m : 0) };
    }).sort((a, b) => a.m - b.m);

    // 6. Announcements: company-wide ones plus the caller's venture's
    const annParams = [];
    const annWhere = scope.global
      ? 'TRUE'
      : (scope.ventureId == null ? 'venture_id IS NULL' : `(venture_id IS NULL OR venture_id = $${annParams.push(scope.ventureId)})`);
    const [announcements] = await pool.query(
      `SELECT * FROM announcements WHERE ${annWhere} ORDER BY created_at DESC LIMIT 5`, annParams);

    res.json({
      success: true,
      data: {
        budgetDistribution,
        taskVelocity: velocityFormatted,
        userDistribution: userDistRows,
        recentActivity: auditRows,
        monthlyPerformance,
        announcements,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
