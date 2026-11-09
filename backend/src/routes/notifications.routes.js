const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const { toId } = require('../utils/scope');
const { normalizePrefs } = require('../services/digest');

// GET /api/notifications — Fetch all notifications for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, title, message, link, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    const unreadCount = rows.filter(r => !r.is_read).length;
    res.json({ success: true, data: rows, unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/notifications/preferences — weekly digest / alert / email opt-outs
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT notification_preferences, access_level FROM users WHERE id = ?', [req.user.id]);
    if (!rows[0]) return res.status(401).json({ success: false, message: 'Account not found' });
    const level = rows[0].access_level;
    res.json({
      success: true,
      data: {
        ...normalizePrefs(rows[0].notification_preferences),
        // What applies to this account: clients get no digest, only levels 1-5 get alerts.
        digestAvailable: level < 9,
        alertsAvailable: level <= 5,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/notifications/preferences — body: any of { digest, alerts, email } as booleans (merged, other keys untouched)
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const changes = {};
    for (const key of ['digest', 'alerts', 'email']) {
      if (body[key] === undefined) continue;
      if (typeof body[key] !== 'boolean') return res.status(400).json({ success: false, message: `${key} must be true or false` });
      changes[key] = body[key];
    }
    if (Object.keys(changes).length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });
    const [rows] = await pool.query('SELECT notification_preferences FROM users WHERE id = ?', [req.user.id]);
    if (!rows[0]) return res.status(401).json({ success: false, message: 'Account not found' });
    let stored = rows[0].notification_preferences;
    if (typeof stored === 'string') { try { stored = JSON.parse(stored); } catch { stored = {}; } }
    const merged = { ...(stored && typeof stored === 'object' ? stored : {}), ...changes };
    await pool.query('UPDATE users SET notification_preferences = ?::jsonb WHERE id = ?', [JSON.stringify(merged), req.user.id]);
    res.json({ success: true, data: normalizePrefs(merged) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/notifications/:id/read — Mark one as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [toId(req.params.id), req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/notifications/read-all — Mark all as read
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/notifications/clear — Clear all read notifications
router.delete('/clear', authenticate, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM notifications WHERE user_id = ? AND is_read = TRUE',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
