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
      WHERE status = 'completed' AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
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

    res.json({
      success: true,
      data: {
        budgetDistribution,
        taskVelocity: velocityFormatted,
        userDistribution: userDistRows.map(row => ({ name: row.name, value: row.value, color: row.color }))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
