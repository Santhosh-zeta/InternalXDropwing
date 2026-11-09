const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { reportLimiter } = require('../middleware/rateLimit.middleware');
const { authenticate, requireLevel } = require('../middleware/auth.middleware');
const { withScope, atLeast } = require('../utils/scope');

const safeParse = (text) => {
  try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
};

// GET /api/action-logs - global users only (L1/L2). Audit rows hold every
// venture's activity, so there is no per-venture view for anyone else.
router.get('/', authenticate, requireLevel(2), withScope, atLeast(2), reportLimiter, async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT a.*, u.full_name as user_name, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);

    res.json({ success: true, data: logs.map(l => ({ ...l, details: safeParse(l.details) })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
