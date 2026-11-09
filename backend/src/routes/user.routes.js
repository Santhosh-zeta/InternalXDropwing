const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, requireLevel } = require('../middleware/auth.middleware');
const { logAudit } = require('../services/audit.service');
const bcrypt = require('bcryptjs');
const { avatarUpload, handleUploadErrors } = require('../middleware/upload.middleware');
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
    let query = `
      SELECT u.id, u.employee_id, u.full_name, u.email, u.phone, u.access_level, u.department,
             u.designation, u.is_active, u.last_login, u.created_at,
             al.level_name, v.name AS venture_name, u.venture_id, u.avatar_url
      FROM users u
      JOIN access_levels al ON u.access_level = al.level_number
      LEFT JOIN ventures v ON u.venture_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.accessLevel > 3) {
      query += ` AND u.venture_id = ?`;
      params.push(req.user.ventureId);
    }

    query += ` ORDER BY u.access_level ASC, u.full_name ASC`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users/ventures — Public list of ventures
router.get('/ventures', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ventures WHERE is_active = TRUE');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/users/access-levels — Public list of levels
router.get('/access-levels', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM access_levels ORDER BY level_number ASC');
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
router.post('/me/avatar', authenticate, uploadLimiter, avatarUpload.single('avatar'), handleUploadErrors, async (req, res) => {
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
router.get('/:id', authenticate, userIdRules, async (req, res) => {
  try {
    const userId = req.params.id;
    // Check permission - can view if L1-L3 or same venture or self
    if (req.user.accessLevel > 3 && req.user.id !== parseInt(userId)) {
      const [targetUser] = await pool.query('SELECT venture_id FROM users WHERE id = ?', [userId]);
      if (!targetUser.length) return res.status(404).json({ success: false, message: 'User not found' });
      if (targetUser[0].venture_id !== req.user.ventureId) {
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

    // Get recent activity (tasks assigned TO or BY this user)
    const [activityRows] = await pool.query(`
      SELECT id, title, status, priority, created_at, updated_at
      FROM tasks
      WHERE EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = tasks.id AND ta.user_id = ?) OR assigned_by = ?
      ORDER BY updated_at DESC
      LIMIT 10
    `, [userId, userId]);

    res.json({ success: true, data: { user, activity: activityRows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/users/:id — Update a user
router.put('/:id', authenticate, requireLevel(4), updateUserRules, async (req, res) => {
  try {
    const userId = req.params.id;
    const { access_level, venture_id, is_active, full_name, department, designation, phone } = req.body;
    
    // Only L1/L2 can modify everyone. Others can only modify lower levels
    if (req.user.accessLevel > 2) {
      // Need to check target user level
      const [targetUser] = await pool.query('SELECT access_level, venture_id FROM users WHERE id = ?', [userId]);
      if (!targetUser.length) return res.status(404).json({ success: false, message: 'User not found' });
      if (targetUser[0].access_level <= req.user.accessLevel) {
         return res.status(403).json({ success: false, message: 'Cannot modify users at or above your level' });
      }
      if (req.user.accessLevel > 3 && targetUser[0].venture_id !== req.user.ventureId) {
         return res.status(403).json({ success: false, message: 'Cannot modify users outside your venture' });
      }
    }

    const updates = [];
    const params = [];
    if (access_level !== undefined) { updates.push('access_level = ?'); params.push(access_level); }
    if (venture_id !== undefined) { 
      updates.push('venture_id = ?'); 
      params.push(venture_id === 0 ? null : venture_id); 
    }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
    if (full_name !== undefined) { updates.push('full_name = ?'); params.push(full_name); }
    if (department !== undefined) { updates.push('department = ?'); params.push(department); }
    if (designation !== undefined) { updates.push('designation = ?'); params.push(designation); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }

    if (updates.length === 0) return res.json({ success: true, message: 'No changes provided' });

    params.push(userId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    /**
     * Deactivating a user or demoting them has to reach the tokens they are
     * already holding — the access level is baked into the JWT, so without this
     * a demoted admin keeps their old level until the token expires and a
     * deactivated account keeps working entirely.
     */
    if (is_active === false || access_level !== undefined) {
      try {
        await revokeAllSessionsForUser(userId);
      } catch (revokeErr) {
        console.error('Failed to revoke sessions for updated user:', revokeErr.message);
      }
    }

    await logAudit(req.user.id, 'UPDATE_USER', 'user', userId, { targetId: userId, changedFields: updates });

    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/users/:id — Delete a user (or deactivate)
router.delete('/:id', authenticate, requireLevel(3), userIdRules, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Only L1/L2 can modify everyone. Others can only modify lower levels
    if (req.user.accessLevel > 2) {
      const [targetUser] = await pool.query('SELECT access_level FROM users WHERE id = ?', [userId]);
      if (!targetUser.length) return res.status(404).json({ success: false, message: 'User not found' });
      if (targetUser[0].access_level <= req.user.accessLevel) {
         return res.status(403).json({ success: false, message: 'Cannot delete users at or above your level' });
      }
    }

    // sessions.user_id cascades on delete, but the in-process session cache
    // does not know that — revoke explicitly so the tokens stop working now.
    try {
      await revokeAllSessionsForUser(userId);
    } catch (revokeErr) {
      console.error('Failed to revoke sessions for deleted user:', revokeErr.message);
    }

    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    await logAudit(req.user.id, 'DELETE_USER', 'user', userId, { targetId: userId });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/users — Create a new user (Admin and above)
router.post('/', authenticate, requireLevel(3), createUserRules, async (req, res) => {
  try {
    const { full_name, email, password, access_level, venture_id, department, designation } = req.body;
    
    if (!full_name || !email || !password || !access_level) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    // Check if user exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    const employeeId = 'EMP' + Date.now().toString().slice(-6);

    const [result] = await pool.query(
      `INSERT INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [employeeId, full_name, email, hash, access_level, venture_id || null, department || null, designation || null]
    );

    await logAudit(req.user.id, 'CREATE_USER', 'user', result.insertId, { full_name, email });

    res.json({ success: true, message: 'User created successfully', userId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
