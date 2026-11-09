const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { reportLimiter } = require('../middleware/rateLimit.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { withScope, atLeast, toId, ventureWhere } = require('../utils/scope');
const { rateJoin, rateExpr, costExpr, sumColumns, money, num } = require('../utils/rates');

/**
 * Finance. Requires L<=4. Global users see every venture, L3/L4 only their own.
 * "Expenses" are labour cost of timesheets, priced by the single rate source
 * (utils/rates.js: project rate -> user hourly rate). Rows with no rate add no
 * cost and are counted in `unrated_hours`; nothing is estimated.
 */
router.use(authenticate, withScope, atLeast(4), reportLimiter);

// GET /api/budget/summary
router.get('/summary', async (req, res) => {
  try {
    const { scope } = req;

    const budgetParams = [];
    const [budgetRows] = await pool.query(`
      SELECT v.id, v.name AS venture, v.primary_color AS color, v.slug,
        COALESCE(SUM(p.budget), 0) AS allocated_budget,
        COUNT(p.id)::int AS project_count
      FROM ventures v
      LEFT JOIN projects p ON p.venture_id = v.id
      WHERE ${ventureWhere(scope, 'v.id', budgetParams)}
      GROUP BY v.id, v.name, v.primary_color, v.slug
      ORDER BY allocated_budget DESC
    `, budgetParams);

    const expParams = [];
    const [expenseRows] = await pool.query(`
      SELECT t.venture_id, ${sumColumns('t', 'u', 'pmr')}
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      ${rateJoin('t', 'pmr')}
      WHERE t.venture_id IS NOT NULL AND ${ventureWhere(scope, 't.venture_id', expParams)}
      GROUP BY t.venture_id
    `, expParams);
    const spend = new Map(expenseRows.map(e => [e.venture_id, money(e)]));

    const ventures = budgetRows.map(b => {
      const s = spend.get(b.id) || { hours: 0, cost: 0, unrated_hours: 0, rate_missing: false };
      const allocated = num(b.allocated_budget);
      return {
        id: b.id, venture: b.venture, color: b.color, slug: b.slug,
        allocated_budget: allocated,
        project_count: b.project_count,
        total_expenses: s.cost,
        hours: s.hours,
        unrated_hours: s.unrated_hours,
        rate_missing: s.rate_missing,
        remaining: Math.round((allocated - s.cost) * 100) / 100,
        utilization: allocated > 0 ? Math.min(100, Math.round((s.cost / allocated) * 100)) : 0,
      };
    });

    const totals = {
      total_budget: ventures.reduce((a, r) => a + r.allocated_budget, 0),
      total_expenses: ventures.reduce((a, r) => a + r.total_expenses, 0),
      hours: ventures.reduce((a, r) => a + r.hours, 0),
      unrated_hours: ventures.reduce((a, r) => a + r.unrated_hours, 0),
      ventures: ventures.length,
      projects: ventures.reduce((a, r) => a + r.project_count, 0),
    };
    totals.rate_missing = totals.unrated_hours > 0;
    totals.remaining = totals.total_budget - totals.total_expenses;
    totals.utilization = totals.total_budget > 0
      ? Math.min(100, Math.round((totals.total_expenses / totals.total_budget) * 100))
      : 0;

    res.json({ success: true, data: { ventures, totals } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/budget/expenses — timesheet lines priced from the rate source
router.get('/expenses', async (req, res) => {
  try {
    const { scope } = req;
    const params = [];
    const conditions = [ventureWhere(scope, 't.venture_id', params)];
    // Global users may narrow to one venture; for everyone else it is just a no-op filter.
    if (scope.global && req.query.venture_id) {
      const v = toId(req.query.venture_id);
      if (!v) return res.status(400).json({ success: false, message: 'Invalid venture_id' });
      params.push(v);
      conditions.push(`t.venture_id = $${params.length}`);
    }
    params.push(Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 500));

    const [rows] = await pool.query(`
      SELECT
        t.id, t.date, t.hours_worked,
        ${costExpr('t', 'u', 'pmr')} AS amount,
        ${rateExpr('u', 'pmr')} IS NULL AS rate_missing,
        t.notes AS description,
        t.status,
        u.full_name AS employee,
        u.designation,
        u.department,
        v.name AS venture,
        v.primary_color AS color,
        p.name AS project_title
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      ${rateJoin('t', 'pmr')}
      JOIN ventures v ON t.venture_id = v.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.date DESC LIMIT $${params.length}
    `, params);
    res.json({ success: true, data: rows.map(r => ({ ...r, amount: r.amount == null ? null : num(r.amount) })) });
  } catch (err) {
    console.error('Budget Expenses Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/budget/monthly — monthly labour cost trend (last 6 months)
router.get('/monthly', async (req, res) => {
  try {
    const { scope } = req;
    const params = [];
    const [rows] = await pool.query(`
      SELECT
        TO_CHAR(t.date, 'YYYY-MM') AS month_key,
        ${sumColumns('t', 'u', 'pmr')}
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      ${rateJoin('t', 'pmr')}
      WHERE t.date >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
        AND ${ventureWhere(scope, 't.venture_id', params)}
      GROUP BY month_key ORDER BY month_key ASC
    `, params);

    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const found = rows.find(r => r.month_key === key);
      const m = found ? money(found) : { hours: 0, cost: 0, unrated_hours: 0 };
      months.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        expenses: m.cost,
        hours: m.hours,
        unrated_hours: m.unrated_hours,
      });
    }
    res.json({ success: true, data: months });
  } catch (err) {
    console.error('Budget Monthly Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
