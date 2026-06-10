const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, requireLevel } = require('../middleware/auth.middleware');
const { logAudit } = require('../services/audit.service');

// Ensure venture_roles table and venture_role_assignments table exist (idempotent)
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS venture_roles (
      id SERIAL PRIMARY KEY,
      venture_id INT NULL,
      role_name VARCHAR(100) NOT NULL,
      role_key VARCHAR(60) NOT NULL,
      description TEXT,
      color VARCHAR(7) DEFAULT '#6366f1',
      icon VARCHAR(10) DEFAULT '🔷',
      base_level INT NOT NULL DEFAULT 5,
      permissions JSON,
      is_active BOOLEAN DEFAULT TRUE,
      sort_order INT DEFAULT 100,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (role_key, venture_id),
      FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS venture_role_assignments (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      role_id INT NOT NULL,
      assigned_by INT NULL,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES venture_roles(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
}

// ── GET /api/role-management — List roles (filtered by venture for L4, all for L1/L2) ──
router.get('/', authenticate, async (req, res) => {
  try {
    await ensureTables();
    const { accessLevel, ventureId } = req.user;

    let query = `
      SELECT vr.*, v.name AS venture_name, v.slug AS venture_slug, v.primary_color AS venture_color,
             u.full_name AS created_by_name,
             COUNT(DISTINCT vra.user_id) AS assigned_users_count
      FROM venture_roles vr
      LEFT JOIN ventures v ON vr.venture_id = v.id
      LEFT JOIN users u ON vr.created_by = u.id
      LEFT JOIN venture_role_assignments vra ON vra.role_id = vr.id
      WHERE vr.is_active = TRUE
    `;
    const params = [];

    // L4 CXO — only see their venture's roles
    if (accessLevel === 4) {
      query += ` AND (vr.venture_id = ? OR vr.venture_id IS NULL)`;
      params.push(ventureId);
    }

    query += ` GROUP BY vr.id ORDER BY vr.venture_id ASC, vr.sort_order ASC, vr.role_name ASC`;

    const [rows] = await pool.query(query, params);
    const parsed = rows.map(r => ({
      ...r,
      permissions: (() => {
        if (!r.permissions) return {};
        if (typeof r.permissions === 'object') return r.permissions;
        try { return JSON.parse(r.permissions); } catch { return {}; }
      })()
    }));

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/role-management/ventures — List ventures (for dropdown) ──
router.get('/ventures', authenticate, async (req, res) => {
  try {
    const { accessLevel, ventureId } = req.user;
    let query = 'SELECT id, name, slug, primary_color FROM ventures WHERE is_active = TRUE';
    const params = [];
    if (accessLevel === 4) {
      query += ' AND id = ?';
      params.push(ventureId);
    }
    query += ' ORDER BY name ASC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/role-management/assign-team-members — List users eligible for role assignment ──
router.get('/assign-team-members', authenticate, async (req, res) => {
  try {
    const { accessLevel, ventureId } = req.user;
    let query = `
      SELECT u.id, u.full_name, u.email, u.access_level, u.department, u.designation,
             al.level_name, v.name AS venture_name, v.primary_color AS venture_color,
             string_agg(vr.id::text, ',') AS assigned_role_ids,
             string_agg(vr.role_name::text, '||') AS assigned_role_names,
             string_agg(vr.color::text, '||') AS assigned_role_colors
      FROM users u
      JOIN access_levels al ON u.access_level = al.level_number
      LEFT JOIN ventures v ON u.venture_id = v.id
      LEFT JOIN venture_role_assignments vra ON vra.user_id = u.id
      LEFT JOIN venture_roles vr ON vr.id = vra.role_id AND vr.is_active = TRUE
      WHERE u.is_active = TRUE
    `;
    const params = [];
    if (accessLevel === 4) {
      query += ' AND u.venture_id = ?';
      params.push(ventureId);
    }
    query += ' GROUP BY u.id ORDER BY u.access_level ASC, u.full_name ASC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/role-management/:id — Get a single role with its assigned users ──
router.get('/:id', authenticate, async (req, res) => {
  try {
    await ensureTables();
    const roleId = parseInt(req.params.id);
    const [rows] = await pool.query(`
      SELECT vr.*, v.name AS venture_name, v.slug AS venture_slug, v.primary_color AS venture_color,
             u.full_name AS created_by_name
      FROM venture_roles vr
      LEFT JOIN ventures v ON vr.venture_id = v.id
      LEFT JOIN users u ON vr.created_by = u.id
      WHERE vr.id = ?
    `, [roleId]);

    if (!rows.length) return res.status(404).json({ success: false, message: 'Role not found' });

    const role = {
      ...rows[0],
      permissions: (() => {
        const p = rows[0].permissions;
        if (!p) return {};
        if (typeof p === 'object') return p;
        try { return JSON.parse(p); } catch { return {}; }
      })()
    };

    // Get assigned users
    const [assignedUsers] = await pool.query(`
      SELECT u.id, u.full_name, u.email, u.access_level, al.level_name, v.name AS venture_name
      FROM venture_role_assignments vra
      JOIN users u ON vra.user_id = u.id
      JOIN access_levels al ON u.access_level = al.level_number
      LEFT JOIN ventures v ON u.venture_id = v.id
      WHERE vra.role_id = ?
    `, [roleId]);

    res.json({ success: true, data: { ...role, assignedUsers } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/role-management — Create a new custom role ──
router.post('/', authenticate, async (req, res) => {
  try {
    const { accessLevel, ventureId, id: userId } = req.user;
    if (accessLevel > 4) {
      return res.status(403).json({ success: false, message: 'Insufficient privileges to create roles' });
    }
    await ensureTables();

    const { role_name, role_key, description, color, icon, base_level, permissions, venture_id, sort_order } = req.body;

    if (!role_name || !role_key) {
      return res.status(400).json({ success: false, message: 'role_name and role_key are required' });
    }

    const cleanKey = role_key.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    let targetVenture = venture_id ?? null;
    if (accessLevel === 4) {
      targetVenture = ventureId;
    }

    const [result] = await pool.query(
      `INSERT INTO venture_roles (venture_id, role_name, role_key, description, color, icon, base_level, permissions, sort_order, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        targetVenture,
        role_name.trim(),
        cleanKey,
        description || null,
        color || '#6366f1',
        icon || '🔷',
        base_level || 5,
        JSON.stringify(permissions || {}),
        sort_order || 100,
        userId
      ]
    );

    await logAudit(userId, 'CREATE_CUSTOM_ROLE', 'venture_role', result.insertId, { role_name, role_key: cleanKey, venture_id: targetVenture });

    res.json({ success: true, message: 'Role created successfully', roleId: result.insertId });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'A role with this key already exists for this venture' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/role-management/:id/duplicate — Duplicate a role ──
router.post('/:id/duplicate', authenticate, async (req, res) => {
  try {
    const { accessLevel, ventureId, id: userId } = req.user;
    if (accessLevel > 4) {
      return res.status(403).json({ success: false, message: 'Insufficient privileges' });
    }
    await ensureTables();

    const roleId = parseInt(req.params.id);
    const [existing] = await pool.query('SELECT * FROM venture_roles WHERE id = ?', [roleId]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Role not found' });

    const role = existing[0];
    const newKey = role.role_key + '_copy_' + Date.now().toString().slice(-4);
    const newName = role.role_name + ' (Copy)';

    const [result] = await pool.query(
      `INSERT INTO venture_roles (venture_id, role_name, role_key, description, color, icon, base_level, permissions, sort_order, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [role.venture_id, newName, newKey, role.description, role.color, role.icon, role.base_level, role.permissions, role.sort_order + 1, userId]
    );

    await logAudit(userId, 'DUPLICATE_CUSTOM_ROLE', 'venture_role', result.insertId, { source_id: roleId, new_role_name: newName });

    res.json({ success: true, message: 'Role duplicated successfully', roleId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/role-management/assign — Assign a custom role to a user ──
router.post('/assign', authenticate, async (req, res) => {
  try {
    const { accessLevel, ventureId, id: userId } = req.user;
    if (accessLevel > 4) {
      return res.status(403).json({ success: false, message: 'Insufficient privileges' });
    }
    await ensureTables();

    const { user_id, role_id } = req.body;
    if (!user_id || !role_id) {
      return res.status(400).json({ success: false, message: 'user_id and role_id are required' });
    }

    // Verify role exists and user has access
    const [roleRows] = await pool.query('SELECT * FROM venture_roles WHERE id = ? AND is_active = TRUE', [role_id]);
    if (!roleRows.length) return res.status(404).json({ success: false, message: 'Role not found' });

    const role = roleRows[0];
    if (accessLevel === 4 && role.venture_id && role.venture_id !== ventureId) {
      return res.status(403).json({ success: false, message: 'Cannot assign roles outside your venture' });
    }

    await pool.query(
      `INSERT INTO venture_role_assignments (user_id, role_id, assigned_by) VALUES (?, ?, ?) ON CONFLICT (user_id, role_id) DO NOTHING`,
      [user_id, role_id, userId]
    );

    await logAudit(userId, 'ASSIGN_ROLE_TO_USER', 'venture_role_assignment', role_id, { user_id, role_id });

    res.json({ success: true, message: 'Role assigned successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE /api/role-management/assign — Remove a custom role from a user ──
router.delete('/assign', authenticate, async (req, res) => {
  try {
    const { accessLevel, id: userId } = req.user;
    if (accessLevel > 4) {
      return res.status(403).json({ success: false, message: 'Insufficient privileges' });
    }

    const { user_id, role_id } = req.body;
    if (!user_id || !role_id) {
      return res.status(400).json({ success: false, message: 'user_id and role_id are required' });
    }

    await pool.query('DELETE FROM venture_role_assignments WHERE user_id = ? AND role_id = ?', [user_id, role_id]);
    await logAudit(userId, 'REMOVE_ROLE_FROM_USER', 'venture_role_assignment', role_id, { user_id, role_id });

    res.json({ success: true, message: 'Role removed from user' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT /api/role-management/:id — Update a custom role ──
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { accessLevel, ventureId, id: userId } = req.user;
    if (accessLevel > 4) {
      return res.status(403).json({ success: false, message: 'Insufficient privileges' });
    }
    await ensureTables();

    const roleId = parseInt(req.params.id);
    const [existing] = await pool.query('SELECT * FROM venture_roles WHERE id = ?', [roleId]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Role not found' });

    const role = existing[0];
    if (accessLevel === 4 && role.venture_id !== ventureId) {
      return res.status(403).json({ success: false, message: 'Cannot edit roles outside your venture' });
    }

    const { role_name, role_key, description, color, icon, base_level, permissions, sort_order } = req.body;

    const updates = [];
    const params = [];

    if (role_name !== undefined) { updates.push('role_name = ?'); params.push(role_name.trim()); }
    if (role_key !== undefined) { updates.push('role_key = ?'); params.push(role_key.toLowerCase().replace(/[^a-z0-9_]/g, '_')); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (color !== undefined) { updates.push('color = ?'); params.push(color); }
    if (icon !== undefined) { updates.push('icon = ?'); params.push(icon); }
    if (base_level !== undefined) { updates.push('base_level = ?'); params.push(base_level); }
    if (permissions !== undefined) { updates.push('permissions = ?'); params.push(JSON.stringify(permissions)); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }

    if (!updates.length) return res.json({ success: true, message: 'No changes provided' });

    params.push(roleId);
    await pool.query(`UPDATE venture_roles SET ${updates.join(', ')} WHERE id = ?`, params);
    await logAudit(userId, 'UPDATE_CUSTOM_ROLE', 'venture_role', roleId, { roleId });

    res.json({ success: true, message: 'Role updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE /api/role-management/:id — Soft-delete (deactivate) a custom role ──
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { accessLevel, ventureId, id: userId } = req.user;
    if (accessLevel > 4) {
      return res.status(403).json({ success: false, message: 'Insufficient privileges' });
    }
    await ensureTables();

    const roleId = parseInt(req.params.id);
    const [existing] = await pool.query('SELECT * FROM venture_roles WHERE id = ?', [roleId]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Role not found' });

    const role = existing[0];
    if (accessLevel === 4 && role.venture_id !== ventureId) {
      return res.status(403).json({ success: false, message: 'Cannot delete roles outside your venture' });
    }

    await pool.query('UPDATE venture_roles SET is_active = 0 WHERE id = ?', [roleId]);
    await logAudit(userId, 'DELETE_CUSTOM_ROLE', 'venture_role', roleId, { roleId, role_name: role.role_name });

    res.json({ success: true, message: 'Role deactivated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
