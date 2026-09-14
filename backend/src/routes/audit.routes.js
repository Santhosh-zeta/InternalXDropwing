const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { reportLimiter } = require('../middleware/rateLimit.middleware');
const { authenticate, requireLevel } = require('../middleware/auth.middleware');

// GET /api/audit (Level 1 only)
router.get('/', authenticate, reportLimiter, requireLevel(1), async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT a.*, u.full_name as user_name, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);

    // Parse details
    const parsedLogs = logs.map(l => ({
      ...l,
      details: l.details ? JSON.parse(l.details) : {}
    }));

    res.json({ success: true, data: parsedLogs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
