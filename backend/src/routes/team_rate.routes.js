const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const { withScope, atLeast, toId } = require('../utils/scope');
const { logAudit } = require('../services/audit.service');
const { num } = require('../utils/rates');

/**
 * Hourly rates: the single money input for every cost / budget / invoice figure
 * (utils/rates.js). L1 manages anyone; L2 anyone strictly below L2 (never their own or L1's rate); L3 only people of lower seniority in
 * their own venture. Nobody else can read or write them.
 */
// Per-route (not router.use): this router shares the /api/team-members mount with user.routes.js.
const guard = [authenticate, withScope, atLeast(3)];

const fail = (res, status, message) => res.status(status).json({ success: false, message });

/** Target user row if the caller may manage its rate, else null. */
const manageable = async (scope, rawId, { write = false } = {}) => {
  const id = toId(rawId);
  if (!id) return null;
  const [rows] = await pool.query('SELECT id, full_name, access_level, venture_id, hourly_rate FROM users WHERE id = $1', [id]);
  const u = rows[0];
  if (!u) return null;
  // Writing: only L1 may set rates for L1/L2 (including themselves); an L2 sets rates strictly below.
  if (scope.global) return (write && scope.level > 1 && u.access_level <= scope.level) ? null : u;
  return u.venture_id === scope.ventureId && u.access_level > scope.level ? u : null;
};

// GET /api/team-members/:id/rate
router.get('/:id/rate', guard, async (req, res) => {
  try {
    const u = await manageable(req.scope, req.params.id);
    if (!u) return fail(res, 404, 'User not found');
    res.json({ success: true, data: { user_id: u.id, hourly_rate: u.hourly_rate == null ? null : num(u.hourly_rate) } });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Server error');
  }
});

// PUT /api/team-members/:id/rate { hourly_rate: number | null }
router.put('/:id/rate', guard, async (req, res) => {
  try {
    const u = await manageable(req.scope, req.params.id, { write: true });
    if (!u) return fail(res, 404, 'User not found');

    const raw = req.body.hourly_rate;
    let rate = null;
    if (raw !== null && raw !== undefined && raw !== '') {
      rate = (typeof raw === 'number' || typeof raw === 'string') ? Number(raw) : NaN;
      if (!Number.isFinite(rate) || rate < 0 || rate >= 100000) return fail(res, 400, 'hourly_rate must be a number between 0 and 99999.99, or null to clear');
      rate = Math.round(rate * 100) / 100;
    } else if (raw === undefined) {
      return fail(res, 400, 'hourly_rate is required (use null to clear)');
    }

    await pool.query('UPDATE users SET hourly_rate = ? WHERE id = ?', [rate, u.id]);
    await logAudit(req.scope.userId, 'SET_HOURLY_RATE', 'user', u.id, { from: u.hourly_rate == null ? null : num(u.hourly_rate), to: rate });
    res.json({ success: true, data: { user_id: u.id, hourly_rate: rate } });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Server error');
  }
});

module.exports = router;
