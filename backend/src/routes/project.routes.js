const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, requireLevel } = require('../middleware/auth.middleware');
const { logAudit } = require('../services/audit.service');
const { withScope, toId, projectWhere, getAccessibleProject } = require('../utils/scope');
const {
  createProjectRules,
  updateProjectRules,
  projectIdRules,
} = require('../middleware/validate.middleware');

const fail = (res, status, message) => res.status(status).json({ success: false, message });

/**
 * Members must exist, be active, and belong to the project's venture - or be a
 * global user or a client (clients are attached per project, not per venture).
 * Returns the de-duplicated list with rates resolved, or null after answering.
 * `existingRates` (user_id -> rate) is what a caller who may not set rates keeps.
 */
const resolveMembers = async (res, scope, ventureId, members, existingRates = new Map()) => {
  const byUser = new Map();
  for (const m of members) byUser.set(toId(m.user_id), m);
  const ids = [...byUser.keys()];
  if (ids.includes(null)) { fail(res, 400, 'Invalid member id'); return null; }
  if (ids.length === 0) return [];
  const [users] = await pool.query(
    'SELECT id, access_level, venture_id FROM users WHERE id = ANY($1::int[]) AND is_active = TRUE',
    [ids]
  );
  if (users.length !== ids.length) { fail(res, 400, 'Unknown or inactive member'); return null; }
  if (!users.every(u => u.access_level <= 2 || u.access_level === 9 || u.venture_id === ventureId)) {
    fail(res, 403, 'Members must belong to the project\'s venture'); return null;
  }
  return ids.map((id) => {
    const m = byUser.get(id);
    let rate = existingRates.get(id) ?? null;
    if (scope.canSetRates && m.rate !== undefined) rate = m.rate === null || m.rate === '' ? null : Number(m.rate);
    if (rate !== null && !(rate >= 0 && rate < 100000)) rate = existingRates.get(id) ?? null;
    return [id, String(m.role || 'Contributor').slice(0, 50), rate];
  });
};

/** Venture for a new project: own venture, or (global only) an existing venture from the body. */
const resolveVenture = async (scope, bodyVentureId) => {
  if (!scope.global) return scope.ventureId;
  const id = toId(bodyVentureId);
  if (!id) return null;
  const [v] = await pool.query('SELECT id FROM ventures WHERE id = $1', [id]);
  return v.length ? id : null;
};

/** Clients never see staff emails; only L<=3 see per-project rates. */
const shapeMember = (scope) => ({ rate, email, ...m }) => ({
  ...m,
  ...(scope.isClient ? {} : { email }),
  ...(scope.canSeeRates ? { rate } : {}),
});

// GET /api/projects — projects the caller may see (utils/scope.js projectWhere)
router.get('/', authenticate, withScope, async (req, res) => {
  try {
    const { scope } = req;
    const params = [];
    const [rows] = await pool.query(`
      SELECT p.*, v.name AS venture_name, v.primary_color AS venture_color, u.full_name AS created_by_name,
             (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id) as task_count,
             (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') as completed_task_count
      FROM projects p
      LEFT JOIN ventures v ON p.venture_id = v.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE ${projectWhere(scope, 'p', params)}
      ORDER BY p.updated_at DESC
    `, params);

    if (rows.length > 0) {
      const [members] = await pool.query(`
        SELECT pm.project_id, pm.user_id, u.full_name, u.email, u.avatar_url, pm.role, pm.rate
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = ANY($1::int[])
      `, [rows.map(r => r.id)]);

      rows.forEach(r => {
        r.members = members
          .filter(m => m.project_id === r.id)
          .map(shapeMember(scope));
        if (scope.level > 4) delete r.budget;
      });
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/projects/:id
router.get('/:id', authenticate, withScope, projectIdRules, async (req, res) => {
  try {
    const { scope } = req;
    const project = await getAccessibleProject(scope, req.params.id);
    if (!project) return fail(res, 404, 'Project not found');

    const [venture] = await pool.query('SELECT name, primary_color FROM ventures WHERE id = $1', [project.venture_id]);
    const [creator] = await pool.query('SELECT full_name FROM users WHERE id = $1', [project.created_by]);
    project.venture_name = venture[0] ? venture[0].name : null;
    project.venture_color = venture[0] ? venture[0].primary_color : null;
    project.created_by_name = creator[0] ? creator[0].full_name : null;

    const [members] = await pool.query(`
      SELECT pm.user_id, u.full_name, u.email, pm.role, pm.rate
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
    `, [project.id]);

    const [milestones] = await pool.query(`
      SELECT id, title, description, due_date, status
      FROM project_milestones
      WHERE project_id = $1
      ORDER BY due_date ASC
    `, [project.id]);

    project.members = members.map(shapeMember(scope));
    project.milestones = milestones;
    if (scope.level > 4) delete project.budget;

    res.json({ success: true, data: project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/projects — L<=4; venture is the caller's own (global users choose one)
router.post('/', authenticate, withScope, requireLevel(4), createProjectRules, async (req, res) => {
  try {
    const { scope } = req;
    const {
      name, description, status, priority, category, budget,
      start_date, end_date, client_name, client_email,
      members = [], tags = [], milestones = []
    } = req.body;

    const vId = await resolveVenture(scope, req.body.venture_id);
    if (!vId) return fail(res, 400, scope.global ? 'A valid venture_id is required' : 'Your account has no venture');
    const memberRows = await resolveMembers(res, scope, vId, members);
    if (!memberRows) return;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(`
        INSERT INTO projects (
          name, description, status, priority, category, budget,
          venture_id, start_date, end_date, client_name, client_email, created_by, tags
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
      `, [
        name, description, status || 'planning', priority || 'medium', category || 'General',
        budget || 0, vId, start_date || null, end_date || null,
        client_name || null, client_email || null, scope.userId, JSON.stringify(tags)
      ]);
      const projectId = result.insertId;

      if (milestones.length > 0) {
        const milestoneValues = milestones.map(m => [projectId, m.title, m.description || null, m.due_date || null, m.status || 'pending']);
        await connection.query('INSERT INTO project_milestones (project_id, title, description, due_date, status) VALUES ?', [milestoneValues]);
      }
      if (memberRows.length > 0) {
        await connection.query('INSERT INTO project_members (project_id, user_id, role, rate) VALUES ?',
          [memberRows.map(([uid, role, rate]) => [projectId, uid, role, rate])]);
      }
      await connection.commit();
      await logAudit(scope.userId, 'CREATE_PROJECT', 'project', projectId, { name, venture_id: vId });
      res.json({ success: true, message: 'Project created successfully', data: { id: projectId } });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/projects/:id — L<=4 on projects in their scope. The venture never changes.
router.put('/:id', authenticate, withScope, requireLevel(4), updateProjectRules, async (req, res) => {
  try {
    const { scope } = req;
    const existing = await getAccessibleProject(scope, req.params.id);
    if (!existing) return fail(res, 404, 'Project not found');
    const projectId = existing.id;

    const {
      name, description, status, priority, category, budget,
      start_date, end_date, client_name, client_email,
      members, tags, milestones
    } = req.body;

    let memberRows = null;
    if (members !== undefined) {
      const [old] = await pool.query('SELECT user_id, rate FROM project_members WHERE project_id = $1', [projectId]);
      memberRows = await resolveMembers(res, scope, existing.venture_id, members,
        new Map(old.map(r => [r.user_id, r.rate === null ? null : Number(r.rate)])));
      if (!memberRows) return;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const updates = [];
      const params = [];
      if (name !== undefined) { updates.push('name = ?'); params.push(name); }
      if (description !== undefined) { updates.push('description = ?'); params.push(description); }
      if (status !== undefined) { updates.push('status = ?'); params.push(status); }
      if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
      if (category !== undefined) { updates.push('category = ?'); params.push(category); }
      if (budget !== undefined) { updates.push('budget = ?'); params.push(budget); }
      if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date); }
      if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date); }
      if (client_name !== undefined) { updates.push('client_name = ?'); params.push(client_name); }
      if (client_email !== undefined) { updates.push('client_email = ?'); params.push(client_email); }
      if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }

      if (updates.length > 0) {
        params.push(projectId);
        await connection.query(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      if (memberRows !== null) {
        await connection.query('DELETE FROM project_members WHERE project_id = ?', [projectId]);
        if (memberRows.length > 0) {
          await connection.query('INSERT INTO project_members (project_id, user_id, role, rate) VALUES ?',
            [memberRows.map(([uid, role, rate]) => [projectId, uid, role, rate])]);
        }
      }

      if (milestones !== undefined) {
        await connection.query('DELETE FROM project_milestones WHERE project_id = ?', [projectId]);
        if (milestones.length > 0) {
          const milestoneValues = milestones.map(m => [projectId, m.title, m.description || null, m.due_date || null, m.status || 'pending']);
          await connection.query('INSERT INTO project_milestones (project_id, title, description, due_date, status) VALUES ?', [milestoneValues]);
        }
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
    await logAudit(scope.userId, 'UPDATE_PROJECT', 'project', projectId, { targetId: projectId });

    res.json({ success: true, message: 'Project updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/projects/:id — L<=3 within scope
router.delete('/:id', authenticate, withScope, requireLevel(3), projectIdRules, async (req, res) => {
  try {
    const existing = await getAccessibleProject(req.scope, req.params.id);
    if (!existing) return fail(res, 404, 'Project not found');
    await pool.query('DELETE FROM projects WHERE id = ?', [existing.id]);
    await logAudit(req.scope.userId, 'DELETE_PROJECT', 'project', existing.id, { name: existing.name });
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
