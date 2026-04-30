const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

// GET /api/budget/summary — L2 MD sees all ventures, L4 CXO sees their venture
router.get('/summary', authenticate, async (req, res) => {
  try {
    const { accessLevel, ventureId } = req.user;
    if (accessLevel > 4) {
      return res.status(403).json({ success: false, message: 'Access denied. Finance access requires L4 or higher.' });
    }

    const isGlobal = accessLevel <= 2;

    // --- Budget by Venture (from projects) ---
    let budgetQuery = `
      SELECT v.id, v.name AS venture, v.primary_color AS color, v.slug,
        COALESCE(SUM(p.budget), 0) AS allocated_budget,
        COUNT(p.id) AS project_count
      FROM ventures v
      LEFT JOIN projects p ON p.venture_id = v.id
    `;
    const budgetParams = [];
    if (!isGlobal) {
      budgetQuery += ` WHERE v.id = ?`;
      budgetParams.push(ventureId);
    }
    budgetQuery += ` GROUP BY v.id, v.name, v.primary_color, v.slug ORDER BY allocated_budget DESC`;
    const [budgetRows] = await pool.query(budgetQuery, budgetParams);

    // --- Expense simulation from timesheets ---
    let expenseQuery = `
      SELECT v.id AS venture_id, v.name AS venture, v.primary_color AS color,
        COALESCE(SUM(t.hours_worked * 50), 0) AS total_expenses
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      JOIN ventures v ON u.venture_id = v.id
    `;
    const expenseParams = [];
    if (!isGlobal) {
      expenseQuery += ` WHERE u.venture_id = ?`;
      expenseParams.push(ventureId);
    }
    expenseQuery += ` GROUP BY v.id, v.name, v.primary_color`;
    const [expenseRows] = await pool.query(expenseQuery, expenseParams);

    // Merge expenses into budget rows
    const expenseMap = {};
    expenseRows.forEach(e => { expenseMap[e.venture_id] = e.total_expenses; });
    const merged = budgetRows.map(b => ({
      ...b,
      total_expenses: expenseMap[b.id] || 0,
      remaining: (b.allocated_budget || 0) - (expenseMap[b.id] || 0),
      utilization: b.allocated_budget > 0
        ? Math.min(100, Math.round(((expenseMap[b.id] || 0) / b.allocated_budget) * 100))
        : 0,
    }));

    const totals = {
      total_budget: merged.reduce((s, r) => s + parseFloat(r.allocated_budget || 0), 0),
      total_expenses: merged.reduce((s, r) => s + parseFloat(r.total_expenses || 0), 0),
      ventures: merged.length,
      projects: merged.reduce((s, r) => s + parseInt(r.project_count || 0), 0),
    };
    totals.remaining = totals.total_budget - totals.total_expenses;
    totals.utilization = totals.total_budget > 0
      ? Math.min(100, Math.round((totals.total_expenses / totals.total_budget) * 100))
      : 0;

    res.json({ success: true, data: { ventures: merged, totals } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/budget/expenses — Expense line items from timesheets
router.get('/expenses', authenticate, async (req, res) => {
  try {
    const { accessLevel, ventureId } = req.user;
    if (accessLevel > 4) return res.status(403).json({ success: false, message: 'Access denied.' });

    const isGlobal = accessLevel <= 2;
    const { venture_id, limit = 50 } = req.query;

    let query = `
      SELECT
        t.id, t.date, t.hours_worked,
        t.hours_worked * 50 AS amount,
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
      JOIN ventures v ON u.venture_id = v.id
      LEFT JOIN projects p ON t.project_id = p.id
    `;
    const params = [];
    const conditions = [];

    if (!isGlobal) {
      conditions.push(`u.venture_id = ?`);
      params.push(ventureId);
    } else if (venture_id) {
      conditions.push(`u.venture_id = ?`);
      params.push(venture_id);
    }

    if (conditions.length) query += ` WHERE ` + conditions.join(' AND ');
    query += ` ORDER BY t.date DESC LIMIT ?`;
    params.push(parseInt(limit) || 50);

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Budget Expenses Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/budget/monthly — Monthly spend trend (last 6 months)
router.get('/monthly', authenticate, async (req, res) => {
  try {
    const { accessLevel, ventureId } = req.user;
    if (accessLevel > 4) return res.status(403).json({ success: false, message: 'Access denied.' });

    const isGlobal = accessLevel <= 2;
    let query = `
      SELECT
        DATE_FORMAT(t.date, '%b %Y') AS month,
        DATE_FORMAT(t.date, '%Y-%m') AS month_key,
        COALESCE(SUM(t.hours_worked * 50), 0) AS expenses,
        COALESCE(SUM(t.hours_worked), 0) AS hours
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      WHERE t.date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    `;
    const params = [];
    if (!isGlobal) {
      query += ` AND u.venture_id = ?`;
      params.push(ventureId);
    }
    query += ` GROUP BY month_key, month ORDER BY month_key ASC`;

    const [rows] = await pool.query(query, params);

    // Ensure we always have 6 months of data (fill gaps with 0)
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const found = rows.find(r => r.month_key === key);
      months.push({ 
        month: label, 
        expenses: found ? parseFloat(found.expenses) : 0, 
        hours: found ? parseFloat(found.hours) : 0 
      });
    }
    res.json({ success: true, data: months });
  } catch (err) {
    console.error('Budget Monthly Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
