const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, requireLevel } = require('../middleware/auth.middleware');
const { logAudit } = require('../services/audit.service');
const bcrypt = require('bcryptjs');
const { issueInvite } = require('../services/invite.service');
const crypto = require('crypto');
const { canManageUser } = require('../utils/canManageUser');
const { withScope, taskWhere } = require('../utils/scope');
const { avatarUpload, handleUploadErrors, verifyUploadContent } = require('../middleware/upload.middleware');
const { uploadLimiter } = require('../middleware/rateLimit.middleware');
const { revokeAllSessionsForUser, createSession } = require('../services/session.service');
const jwt = require('jsonwebtoken');
const {
  createUserRules,
  updateUserRules,
  userIdRules,
  updateProfileRules,
  changePasswordRules,
} = require('../middleware/validate.middleware');

// GET /api/users — List users based on access level
router.get('/', authenticate, async (req, res) => {
  try {
    // ?pending=true: self-registered accounts waiting for approval (L1/L2 only; they have no venture yet).
    const wantPending = req.query.pending === 'true';
    if (wantPending && req.user.accessLevel > 2) return res.json({ success: true, data: [] });
    let query = `
      SELECT u.id, u.employee_id, u.full_name, u.email, u.phone, u.access_level, u.department,
             u.designation, u.is_active, u.pending_approval, u.last_login, u.created_at,
             al.level_name, v.name AS venture_name, u.venture_id, u.avatar_url
      FROM users u
      JOIN access_levels al ON u.access_level = al.level_number
      LEFT JOIN ventures v ON u.venture_id = v.id
      WHERE ${wantPending ? 'u.pending_approval = TRUE' : 'u.pending_approval = FALSE'}
    `;
    const params = [];

    // Clients never see the staff directory.
    if (req.user.accessLevel >= 9) return res.json({ success: true, data: [] });

    // Levels 1-2 see everyone. Everyone else sees their own venture plus the global
    // leadership (L1/L2, the same people they may DM); never another venture's people.
    // Venture staff (L6-L8) also never see clients (L9): only L3-L5 manage those.
    if (req.user.accessLevel > 2) {
      query += ` AND (u.venture_id = ? OR u.access_level <= 2)`;
      params.push(req.user.ventureId);
      if (req.user.accessLevel > 5) query += ` AND u.access_level < 9`;
    }

    if (req.query.search) {
      query += ` AND (u.full_name ILIKE ? OR u.email ILIKE ?)`;
      const like = `%${String(req.query.search).slice(0, 100).replace(/[\\%_]/g, '\\$&')}%`;
      params.push(like, like);
    }

    query += ` ORDER BY u.access_level ASC, u.full_name ASC`;
    const limit = parseInt(req.query.limit, 10);
    if (Number.isInteger(limit) && limit > 0) {
      query += ` LIMIT ${Math.min(limit, 500)}`;
    }

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/team-members/ventures — ventures for pickers (signed-in users only)
router.get('/ventures', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, slug, logo_url, primary_color, description FROM ventures WHERE is_active = TRUE ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/team-members/access-levels — level names for pickers (signed-in users only)
router.get('/access-levels', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT level_number, level_name, description FROM access_levels ORDER BY level_number ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users/me — Get current user full profile (with preferences)
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, full_name, email, phone, avatar_url, notification_preferences FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    
    // Parse JSON safely
    const user = rows[0];
    if (typeof user.notification_preferences === 'string') {
      try {
        user.notification_preferences = JSON.parse(user.notification_preferences);
      } catch (e) {
        user.notification_preferences = {};
      }
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/users/me/profile — Update own profile
router.put('/me/profile', authenticate, updateProfileRules, async (req, res) => {
  try {
    const { full_name, phone, notification_preferences } = req.body;
    
    const updates = [];
    const params = [];
    if (full_name !== undefined) { updates.push('full_name = ?'); params.push(full_name); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (notification_preferences !== undefined) { 
      updates.push('notification_preferences = ?'); 
      params.push(JSON.stringify(notification_preferences)); 
    }

    if (updates.length > 0) {
      params.push(req.user.id);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/users/me/password — Change password
router.put('/me/password', authenticate, changePasswordRules, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    const isValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isValid) return res.status(401).json({ success: false, message: 'Incorrect current password' });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);

    /**
     * Changing a password is the usual reaction to "somebody else is in my
     * account", so every other session for this user is revoked. The caller's
     * own session is re-created immediately afterwards from the same token, so
     * the client that made the request is not signed out and no response shape
     * changes — only the attacker's copy of the token stops working.
     */
    try {
      await revokeAllSessionsForUser(req.user.id);
      if (req.authToken) {
        const { exp } = jwt.decode(req.authToken) || {};
        if (exp) await createSession(req.user.id, req.authToken, new Date(exp * 1000), req);
      }
    } catch (revokeErr) {
      console.error('Failed to rotate sessions after password change:', revokeErr.message);
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/users/me/avatar — Upload avatar
router.post('/me/avatar', authenticate, uploadLimiter, avatarUpload.single('avatar'), handleUploadErrors, verifyUploadContent, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    
    const avatarUrl = '/uploads/avatars/' + req.file.filename;
    await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.id]);

    res.json({ success: true, data: { avatar_url: avatarUrl } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users/:id — Get user details and activity
router.get('/:id', authenticate, withScope, userIdRules, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const scope = req.scope;
    const isSelf = scope.userId === userId;
    // L1-L2 see everyone; others only themselves and their own venture. Clients: only themselves.
    if (!scope.global && !isSelf) {
      if (scope.isClient) {
        return res.status(403).json({ success: false, message: 'Not allowed' });
      }
      const [targetUser] = await pool.query('SELECT venture_id, access_level FROM users WHERE id = ?', [userId]);
      if (!targetUser.length) return res.status(404).json({ success: false, message: 'User not found' });
      const t = targetUser[0];
      const visible = t.access_level <= 2 || (t.venture_id !== null && t.venture_id === scope.ventureId);
      if (!visible || (scope.level > 5 && t.access_level >= 9)) {
        return res.status(403).json({ success: false, message: 'Cannot view users outside your venture' });
      }
    }

    const [userRows] = await pool.query(`
      SELECT u.id, u.employee_id, u.full_name, u.email, u.phone, u.access_level, u.department,
             u.designation, u.is_active, u.last_login, u.created_at,
             al.level_name, al.description as level_description, v.name AS venture_name, u.venture_id, u.avatar_url
      FROM users u
      JOIN access_levels al ON u.access_level = al.level_number
      LEFT JOIN ventures v ON u.venture_id = v.id
      WHERE u.id = ?
    `, [userId]);

    if (!userRows.length) return res.status(404).json({ success: false, message: 'User not found' });
    const user = userRows[0];

    // Recent task activity is only shown to the person themselves and to managers (L1-L5).
    if (!isSelf && scope.level > 5) {
      return res.json({ success: true, data: { user, activity: [] } });
    }

    // Recent activity (tasks assigned TO or BY this user), limited to the tasks
    // the *viewer* may see: an L3 looking at the Managing Director's profile
    // must not read task titles from other ventures.
    const params = [userId];
    const visible = taskWhere(scope, 'tasks', params);
    const [activityRows] = await pool.query(`
      SELECT id, title, status, priority, created_at, updated_at
      FROM tasks
      WHERE (EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = tasks.id AND ta.user_id = $1) OR assigned_by = $1)
        AND ${visible}
      ORDER BY updated_at DESC
      LIMIT 10
    `, params);

    res.json({ success: true, data: { user, activity: activityRows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Every mutation below runs in a transaction that locks the target row (and,
 * for an L1 target, all active L1 rows), then asks canManageUser() for the
 * verdict, so "last Super Admin" can't be raced past by two concurrent requests.
 */
const toBool = (v) => v === true || v === 'true' || v === 1 || v === '1';

const deniedAudit = (req, action, targetId, verdict, patch) =>
  logAudit(req.user.id, 'USER_MANAGE_DENIED', 'user', targetId || 0,
    { action, reason: verdict.message, requested: patch }, req.ip);

const sendDb = (res, err) => {
  if (err.code === '23505') return res.status(409).json({ success: false, message: 'Email already registered' });
  if (err.code === '23503') return res.status(400).json({ success: false, message: 'Unknown venture' });
  console.error(err);
  return res.status(500).json({ success: false, message: 'Server error' });
};

const USER_MUTATION_LOCK = 7001;

/**
 * The actor's level and venture come from the database, not the JWT: the token
 * may predate a demotion, and privilege checks must use current facts.
 */
const freshActor = async (q, reqUser) => {
  const [rows] = await q.query('SELECT id, access_level, venture_id FROM users WHERE id = ? AND is_active = TRUE', [reqUser.id]);
  if (!rows.length) return null;
  return { id: rows[0].id, accessLevel: rows[0].access_level, ventureId: rows[0].venture_id };
};

const lockTarget = async (conn, userId) => {
  // One lock for all user mutations (they are rare): serialises the
  // "count the L1s, then change one" sequence and rules out deadlocks.
  await conn.query('SELECT pg_advisory_xact_lock(?)', [USER_MUTATION_LOCK]);
  const [rows] = await conn.query(
    'SELECT id, access_level, venture_id, is_active, pending_approval FROM users WHERE id = ? FOR UPDATE', [userId]);
  const target = rows[0] || null;
  const ctx = {};
  if (target && target.access_level === 1) {
    const [l1] = await conn.query('SELECT id FROM users WHERE access_level = 1 AND is_active = TRUE FOR UPDATE');
    ctx.activeL1Count = l1.length;
  }
  return { target, ctx };
};

// PUT /api/team-members/:id — Update a user
router.put('/:id', authenticate, requireLevel(3), updateUserRules, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { access_level, venture_id, is_active, full_name, department, designation, phone } = req.body;
  const patch = {
    action: 'update',
    access_level,
    venture_id,
    is_active: is_active === undefined || is_active === null ? undefined : toBool(is_active),
  };
  // Global levels have no venture: make "promote to MD" a one-field change.
  if (patch.access_level !== undefined && patch.access_level !== null && Number(patch.access_level) <= 2 && patch.venture_id === undefined) {
    patch.venture_id = null;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { target, ctx } = await lockTarget(conn, userId);
    const actor = await freshActor(conn, req.user);
    const verdict = actor ? canManageUser(actor, target, patch, ctx) : { ok: false, status: 401, message: 'Authentication required' };
    if (!verdict.ok) {
      await conn.rollback();
      await deniedAudit(req, 'update', userId, verdict, patch);
      return res.status(verdict.status).json({ success: false, message: verdict.message });
    }

    // Approving a pending self-registration: the account must end up with a venture
    // (levels 3-9) before it can sign in, so it is never active with no scope.
    const approving = target.pending_approval && patch.is_active === true;
    if (approving) {
      const level = patch.access_level !== undefined && patch.access_level !== null ? Number(patch.access_level) : target.access_level;
      const venture = patch.venture_id !== undefined ? patch.venture_id : target.venture_id;
      if (level >= 3 && !venture) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Assign a venture before approving this account' });
      }
    }

    const updates = [];
    const params = [];
    const changes = {};
    const set = (col, val) => { updates.push(`${col} = ?`); params.push(val); changes[col] = val; };
    if (approving) set('pending_approval', false);
    if (patch.access_level !== undefined && patch.access_level !== null) set('access_level', Number(patch.access_level));
    if (patch.venture_id !== undefined) set('venture_id', patch.venture_id === null || Number(patch.venture_id) === 0 ? null : Number(patch.venture_id));
    if (patch.is_active !== undefined) set('is_active', patch.is_active);
    if (full_name !== undefined) set('full_name', full_name);
    if (department !== undefined) set('department', department);
    if (designation !== undefined) set('designation', designation);
    if (phone !== undefined) set('phone', phone);

    if (updates.length === 0) {
      await conn.rollback();
      return res.json({ success: true, message: 'No changes provided' });
    }

    params.push(userId);
    await conn.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    await conn.commit();

    /**
     * Level, venture and active flag are baked into the JWT, so any change to
     * them must reach the tokens the user already holds: drop every session so
     * they re-authenticate and pick up their new scope (or lose access).
     */
    if ('access_level' in changes || 'venture_id' in changes || changes.is_active === false) {
      try {
        await revokeAllSessionsForUser(userId);
      } catch (revokeErr) {
        console.error('Failed to revoke sessions for updated user:', revokeErr.message);
      }
    }

    await logAudit(req.user.id, 'UPDATE_USER', 'user', userId, {
      targetId: userId,
      before: { access_level: target.access_level, venture_id: target.venture_id, is_active: target.is_active },
      changes,
    }, req.ip);

    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    try { await conn.rollback(); } catch (_) { /* already finished */ }
    sendDb(res, err);
  } finally {
    conn.release();
  }
});

// DELETE /api/team-members/:id — Delete a user
router.delete('/:id', authenticate, requireLevel(3), userIdRules, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const patch = { action: 'delete' };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { target, ctx } = await lockTarget(conn, userId);
    const actor = await freshActor(conn, req.user);
    const verdict = actor ? canManageUser(actor, target, patch, ctx) : { ok: false, status: 401, message: 'Authentication required' };
    if (!verdict.ok) {
      await conn.rollback();
      await deniedAudit(req, 'delete', userId, verdict, patch);
      return res.status(verdict.status).json({ success: false, message: verdict.message });
    }

    await conn.query('DELETE FROM users WHERE id = ?', [userId]);
    await conn.commit();

    // sessions.user_id cascades on delete, but the in-process session cache
    // does not know that — revoke explicitly so the tokens stop working now.
    try {
      await revokeAllSessionsForUser(userId);
    } catch (revokeErr) {
      console.error('Failed to revoke sessions for deleted user:', revokeErr.message);
    }

    await logAudit(req.user.id, 'DELETE_USER', 'user', userId,
      { targetId: userId, access_level: target.access_level, venture_id: target.venture_id }, req.ip);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    try { await conn.rollback(); } catch (_) { /* already finished */ }
    if (err.code === '23503') {
      return res.status(409).json({ success: false, message: 'This user has related records. Deactivate the account instead of deleting it.' });
    }
    sendDb(res, err);
  } finally {
    conn.release();
  }
});

// POST /api/team-members — Invite a new user.
// No password is chosen or shown: the user gets a 72 h set-password link by email.
// Without SMTP the one-time link is returned here for the admin to pass on.
router.post('/', authenticate, requireLevel(3), createUserRules, async (req, res) => {
  try {
    const { full_name, department, designation } = req.body;
    const email = String(req.body.email || '').toLowerCase().trim();
    const access_level = Number(req.body.access_level);
    let venture_id = req.body.venture_id ? Number(req.body.venture_id) : null;

    const actor = await freshActor(pool, req.user);
    if (!actor) return res.status(401).json({ success: false, message: 'Authentication required' });
    // An L3 admin always creates into their own venture, whatever was sent.
    if (actor.accessLevel === 3) venture_id = actor.ventureId ?? null;
    if (access_level <= 2) venture_id = null;
    const verdict = canManageUser(actor, null, { action: 'create', access_level, venture_id });
    if (!verdict.ok) {
      await deniedAudit(req, 'create', 0, verdict, { access_level, venture_id, email });
      return res.status(verdict.status).json({ success: false, message: verdict.message });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Nobody knows this password: it only exists so the NOT NULL column is filled
    // until the invitee sets their own.
    const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    const employeeId = 'EMP-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const [result] = await pool.query(
      `INSERT INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [employeeId, full_name, email, hash, access_level, venture_id, department || null, designation || null]
    );

    const [[inviter]] = await pool.query('SELECT full_name FROM users WHERE id = ?', [req.user.id]);
    const invite = await issueInvite({ id: result.insertId, email, full_name }, inviter && inviter.full_name);

    await logAudit(req.user.id, 'CREATE_USER', 'user', result.insertId,
      { full_name, email, access_level, venture_id, invited: true, emailed: invite.emailed }, req.ip);

    res.status(201).json({
      success: true,
      message: invite.emailed ? 'Invitation sent' : 'User created. Email is not configured: share the invite link with them yourself.',
      userId: result.insertId,
      invite: { emailed: invite.emailed, expiresAt: invite.expiresAt, ...(invite.link ? { link: invite.link } : {}) },
    });
  } catch (err) {
    sendDb(res, err);
  }
});

// POST /api/team-members/:id/invite — issue a fresh invite link (lost email / expired link).
// Only for accounts that never signed in: this must not become a way to take over a live account.
router.post('/:id/invite', authenticate, requireLevel(3), userIdRules, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const actor = await freshActor(pool, req.user);
    const [rows] = await pool.query(
      'SELECT id, full_name, email, access_level, venture_id, is_active, last_login, pending_approval FROM users WHERE id = ?', [userId]);
    const target = rows[0] || null;
    const verdict = actor ? canManageUser(actor, target, { action: 'update' }) : { ok: false, status: 401, message: 'Authentication required' };
    if (!verdict.ok) {
      await deniedAudit(req, 'invite', userId, verdict, {});
      return res.status(verdict.status).json({ success: false, message: verdict.message });
    }
    if (target.last_login || target.pending_approval || !target.is_active) {
      return res.status(409).json({ success: false, message: 'Only active accounts that have not signed in yet can be re-invited' });
    }
    const [[inviter]] = await pool.query('SELECT full_name FROM users WHERE id = ?', [req.user.id]);
    const invite = await issueInvite(target, inviter && inviter.full_name);
    await logAudit(req.user.id, 'REINVITE_USER', 'user', userId, { emailed: invite.emailed }, req.ip);
    res.json({
      success: true,
      message: invite.emailed ? 'Invitation sent' : 'Email is not configured: share the invite link with them yourself.',
      invite: { emailed: invite.emailed, expiresAt: invite.expiresAt, ...(invite.link ? { link: invite.link } : {}) },
    });
  } catch (err) {
    sendDb(res, err);
  }
});

module.exports = router;
