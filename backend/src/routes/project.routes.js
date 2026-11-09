const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, requireLevel } = require('../middleware/auth.middleware');
const { logAudit } = require('../services/audit.service');
const {
  createProjectRules,
  updateProjectRules,
  projectIdRules,
} = require('../middleware/validate.middleware');

// GET /api/projects — List projects based on access level
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT p.*, v.name AS venture_name, v.primary_color AS venture_color, u.full_name AS created_by_name,
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') as completed_task_count
      FROM projects p
      LEFT JOIN ventures v ON p.venture_id = v.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.accessLevel > 2) {
      query += ` AND p.venture_id = ?`;
      params.push(req.user.ventureId);
    }

    query += ` ORDER BY p.updated_at DESC`;
    const [rows] = await pool.query(query, params);

    // Fetch members for all these projects
    if (rows.length > 0) {
      const projectIds = rows.map(r => r.id);
      const [members] = await pool.query(`
        SELECT pm.project_id, pm.user_id, u.full_name, u.email, u.avatar_url
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = ANY(?)
      `, [projectIds]);

      rows.forEach(r => {
        r.members = members.filter(m => m.project_id === r.id);
        if (req.user.accessLevel > 4) delete r.budget;
      });
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/projects/:id — Get single project details
router.get('/:id', authenticate, projectIdRules, async (req, res) => {
  try {
    const [projects] = await pool.query(`
      SELECT p.*, v.name AS venture_name, v.primary_color AS venture_color, u.full_name AS created_by_name
      FROM projects p
      LEFT JOIN ventures v ON p.venture_id = v.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (!projects.length) return res.status(404).json({ success: false, message: 'Project not found' });
    const project = projects[0];

    // Check venture access
    if (req.user.accessLevel > 2 && project.venture_id !== req.user.ventureId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [members] = await pool.query(`
      SELECT pm.user_id, u.full_name, u.email, pm.role
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `, [project.id]);

    const [milestones] = await pool.query(`
      SELECT id, title, description, due_date, status
      FROM project_milestones
      WHERE project_id = ?
      ORDER BY due_date ASC
    `, [project.id]);

    project.members = members;
    project.milestones = milestones;
    if (req.user.accessLevel > 4) delete project.budget;

    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/projects — Create a project
router.post('/', authenticate, requireLevel(4), createProjectRules, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      name, description, status, priority, category, budget, 
      venture_id, start_date, end_date, client_name, client_email,
      members = [], tags = [], milestones = []
    } = req.body;
    
    let vId = venture_id;
    if (req.user.accessLevel > 2) vId = req.user.ventureId;

    const [result] = await connection.query(`
      INSERT INTO projects (
        name, description, status, priority, category, budget, 
        venture_id, start_date, end_date, client_name, client_email, created_by, tags
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
    `, [
      name, description, status || 'planning', priority || 'medium', category || 'General',
      budget || 0, vId, start_date || null, end_date || null, 
      client_name || null, client_email || null, req.user.id, JSON.stringify(tags)
    ]);

    const projectId = result.insertId;

    // Insert milestones
    if (milestones.length > 0) {
      const milestoneValues = milestones.map(m => [projectId, m.title, m.description || null, m.due_date || null, m.status || 'pending']);
      await connection.query('INSERT INTO project_milestones (project_id, title, description, due_date, status) VALUES ?', [milestoneValues]);
    }

    // Insert members
    if (members.length > 0) {
      const memberValues = members.map(m => [projectId, m.user_id, m.role || 'Contributor']);
      await connection.query('INSERT INTO project_members (project_id, user_id, role) VALUES ?', [memberValues]);
    }

    await connection.commit();
    res.json({ success: true, message: 'Project created successfully', data: { id: projectId } });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// PUT /api/projects/:id — Update a project
router.put('/:id', authenticate, requireLevel(4), updateProjectRules, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const projectId = req.params.id;
    const { 
      name, description, status, priority, category, budget, 
      venture_id, start_date, end_date, client_name, client_email,
      members, tags, milestones
    } = req.body;

    const [existing] = await connection.query('SELECT venture_id FROM projects WHERE id = ?', [projectId]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Project not found' });

    if (req.user.accessLevel > 2 && existing[0].venture_id !== req.user.ventureId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (budget !== undefined && req.user.accessLevel <= 4) { updates.push('budget = ?'); params.push(budget); }
    if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date); }
    if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date); }
    if (client_name !== undefined) { updates.push('client_name = ?'); params.push(client_name); }
    if (client_email !== undefined) { updates.push('client_email = ?'); params.push(client_email); }
    if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }

    if (updates.length > 0) {
      params.push(projectId);
      await connection.query(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Update members if provided
    if (members !== undefined) {
      await connection.query('DELETE FROM project_members WHERE project_id = ?', [projectId]);
      if (members.length > 0) {
        const memberValues = members.map(m => [projectId, m.user_id, m.role || 'Contributor']);
        await connection.query('INSERT INTO project_members (project_id, user_id, role) VALUES ?', [memberValues]);
      }
    }

    // Update milestones if provided
    if (milestones !== undefined) {
      await connection.query('DELETE FROM project_milestones WHERE project_id = ?', [projectId]);
      if (milestones.length > 0) {
        const milestoneValues = milestones.map(m => [projectId, m.title, m.description || null, m.due_date || null, m.status || 'pending']);
        await connection.query('INSERT INTO project_milestones (project_id, title, description, due_date, status) VALUES ?', [milestoneValues]);
      }
    }

    await connection.commit();
    await logAudit(req.user.id, 'UPDATE_PROJECT', 'project', projectId, { targetId: projectId });

    res.json({ success: true, message: 'Project updated successfully' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// DELETE /api/projects/:id
router.delete('/:id', authenticate, requireLevel(3), projectIdRules, async (req, res) => {
  try {
    const projectId = req.params.id;
    const [existing] = await pool.query('SELECT venture_id FROM projects WHERE id = ?', [projectId]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Project not found' });

    if (req.user.accessLevel > 2 && existing[0].venture_id !== req.user.ventureId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await pool.query('DELETE FROM projects WHERE id = ?', [projectId]);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
