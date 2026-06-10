const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

// GET /api/client-portal/overview — L9 clients only
router.get('/overview', authenticate, async (req, res) => {
  try {
    const { accessLevel, ventureId, id: userId } = req.user;
    if (accessLevel !== 9) {
      return res.status(403).json({ success: false, message: 'Client portal is restricted to client accounts.' });
    }

    // Venture info
    let venture = null;
    if (ventureId) {
      const [vRows] = await pool.query(`SELECT * FROM ventures WHERE id = ?`, [ventureId]);
      venture = vRows[0] || null;
    }

    // Active projects for this client's venture
    let projects = [];
    if (ventureId) {
      const [pRows] = await pool.query(`
        SELECT p.id, p.title, p.description, p.status, p.progress,
          p.start_date, p.end_date, p.budget,
          u.full_name AS manager_name
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.venture_id = ?
        ORDER BY p.created_at DESC
        LIMIT 20
      `, [ventureId]);
      projects = pRows;
    }

    // Tasks assigned to this client (deliverables)
    const [taskRows] = await pool.query(`
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date,
        t.created_at, u.full_name AS assigned_by_name
      FROM tasks t
      JOIN users u ON t.assigned_by = u.id
      WHERE t.assigned_to = ?
      ORDER BY t.due_date ASC
      LIMIT 30
    `, [userId]);

    // Invoices for their venture
    let invoices = [];
    if (ventureId) {
      // Use timesheets-based invoice simulation
      const [invRows] = await pool.query(`
        SELECT
          CONCAT('INV-', TO_CHAR(MIN(t.date), 'YYYYMM'), '-', u.venture_id) AS invoice_number,
          TO_CHAR(MIN(t.date), 'Mon YYYY') AS month,
          SUM(t.hours_worked) AS total_hours,
          SUM(t.hours_worked * 50) AS total_amount,
          'pending' AS status,
          MIN(t.date) AS issue_date
        FROM timesheets t
        JOIN users u ON t.user_id = u.id
        WHERE u.venture_id = ? AND t.status = 'approved'
        GROUP BY TO_CHAR(t.date, 'YYYY-MM'), u.venture_id
        ORDER BY MIN(t.date) DESC
        LIMIT 12
      `, [ventureId]);
      invoices = invRows;
    }

    // Documents shared with this venture
    let documents = [];
    if (ventureId) {
      const [docRows] = await pool.query(`
        SELECT d.id, d.file_name, d.file_size, d.file_type, d.created_at,
          u.full_name AS uploaded_by, d.category
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        WHERE d.venture_id = ?
        ORDER BY d.created_at DESC
        LIMIT 20
      `, [ventureId]);
      documents = docRows;
    }

    res.json({
      success: true,
      data: {
        venture,
        projects,
        deliverables: taskRows,
        invoices,
        documents,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
