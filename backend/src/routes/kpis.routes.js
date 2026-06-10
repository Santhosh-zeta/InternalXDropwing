const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

// GET /api/kpis/hr — HR overview for L2 MD and L4 CXO
router.get('/hr', authenticate, async (req, res) => {
  try {
    const { accessLevel, ventureId } = req.user;
    if (accessLevel > 4) return res.status(403).json({ success: false, message: 'Access denied.' });
    const isGlobal = accessLevel <= 2;

    // Head count by venture
    let headcountQuery = `
      SELECT v.name AS venture, v.primary_color AS color, v.slug,
        COUNT(u.id) AS total,
        SUM(CASE WHEN u.access_level <= 4 THEN 1 ELSE 0 END) AS leadership,
        SUM(CASE WHEN u.access_level BETWEEN 5 AND 7 THEN 1 ELSE 0 END) AS staff,
        SUM(CASE WHEN u.access_level = 8 THEN 1 ELSE 0 END) AS interns
      FROM ventures v
      LEFT JOIN users u ON u.venture_id = v.id AND u.is_active = TRUE
    `;
    const headcountParams = [];
    if (!isGlobal) {
      headcountQuery += ` WHERE v.id = ?`;
      headcountParams.push(ventureId);
    }
    headcountQuery += ` GROUP BY v.id ORDER BY total DESC`;
    const [headcountRows] = await pool.query(headcountQuery, headcountParams);

    // Department breakdown (across all/own venture)
    let deptQuery = `
      SELECT u.department, COUNT(u.id) AS count,
        string_agg(DISTINCT v.name::text, ',') AS ventures
      FROM users u
      LEFT JOIN ventures v ON u.venture_id = v.id
      WHERE u.is_active = TRUE AND u.department IS NOT NULL AND u.department != ''
    `;
    const deptParams = [];
    if (!isGlobal) {
      deptQuery += ` AND u.venture_id = ?`;
      deptParams.push(ventureId);
    }
    deptQuery += ` GROUP BY u.department ORDER BY count DESC LIMIT 20`;
    const [deptRows] = await pool.query(deptQuery, deptParams);

    // Access level distribution
    let levelQuery = `
      SELECT al.level_name, al.level_number, COUNT(u.id) AS count
      FROM access_levels al
      LEFT JOIN users u ON u.access_level = al.level_number AND u.is_active = TRUE
    `;
    if (!isGlobal) {
      levelQuery += ` AND u.venture_id = ${pool.escape(ventureId)}`;
    }
    levelQuery += ` GROUP BY al.level_number ORDER BY al.level_number ASC`;
    const [levelRows] = await pool.query(levelQuery);

    // Task performance by employee (top performers)
    let perfQuery = `
      SELECT u.full_name, u.designation, u.department,
        v.name AS venture, v.primary_color AS color,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS completed_tasks,
        COUNT(t.id) AS total_tasks,
        ROUND(COUNT(CASE WHEN t.status = 'completed' THEN 1 END) / NULLIF(COUNT(t.id),0) * 100, 0) AS completion_rate
      FROM users u
      LEFT JOIN tasks t ON t.assigned_to = u.id AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      LEFT JOIN ventures v ON u.venture_id = v.id
      WHERE u.is_active = TRUE AND u.access_level >= 5
    `;
    const perfParams = [];
    if (!isGlobal) {
      perfQuery += ` AND u.venture_id = ?`;
      perfParams.push(ventureId);
    }
    perfQuery += ` GROUP BY u.id ORDER BY completed_tasks DESC LIMIT 15`;
    const [perfRows] = await pool.query(perfQuery, perfParams);

    // Timesheets summary — avg hours per week
    let tsQuery = `
      SELECT v.name AS venture, v.primary_color AS color,
        ROUND(AVG(t.hours_worked), 1) AS avg_hours,
        SUM(t.hours_worked) AS total_hours,
        COUNT(DISTINCT t.user_id) AS members_logged
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      JOIN ventures v ON u.venture_id = v.id
      WHERE t.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;
    const tsParams = [];
    if (!isGlobal) {
      tsQuery += ` AND u.venture_id = ?`;
      tsParams.push(ventureId);
    }
    tsQuery += ` GROUP BY v.id ORDER BY total_hours DESC`;
    const [tsRows] = await pool.query(tsQuery, tsParams);

    const totals = {
      total_employees: headcountRows.reduce((s, r) => s + parseInt(r.total || 0), 0),
      leadership: headcountRows.reduce((s, r) => s + parseInt(r.leadership || 0), 0),
      staff: headcountRows.reduce((s, r) => s + parseInt(r.staff || 0), 0),
      interns: headcountRows.reduce((s, r) => s + parseInt(r.interns || 0), 0),
    };

    res.json({
      success: true,
      data: {
        headcount: headcountRows,
        departments: deptRows,
        levels: levelRows,
        performance: perfRows,
        timesheets: tsRows,
        totals,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/kpis/department — Per-department KPIs for CXO (L4)
router.get('/department', authenticate, async (req, res) => {
  try {
    const { accessLevel, ventureId } = req.user;
    if (accessLevel > 4) return res.status(403).json({ success: false, message: 'Access denied.' });

    const isGlobal = accessLevel <= 2;

    let query = `
      SELECT
        u.department,
        v.name AS venture,
        v.primary_color AS color,
        COUNT(DISTINCT u.id) AS team_size,
        COUNT(DISTINCT p.id) AS active_projects,
        COUNT(DISTINCT t.id) AS total_tasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
        ROUND(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT t.id), 0) * 100, 0) AS kpi_score
      FROM users u
      LEFT JOIN ventures v ON u.venture_id = v.id
      LEFT JOIN projects p ON p.venture_id = u.venture_id AND p.status = 'active'
      LEFT JOIN tasks t ON t.assigned_to = u.id AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      WHERE u.is_active = TRUE AND u.department IS NOT NULL AND u.department != ''
    `;
    const params = [];
    if (!isGlobal) {
      query += ` AND u.venture_id = ?`;
      params.push(ventureId);
    }
    query += ` GROUP BY u.department, u.venture_id ORDER BY kpi_score DESC LIMIT 30`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
