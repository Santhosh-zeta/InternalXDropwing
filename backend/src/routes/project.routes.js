const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, requireLevel } = require('../middleware/auth.middleware');
const { logAudit } = require('../services/audit.service');

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

    // Access control
    if (req.user.accessLevel > 2) {
      // Non global users can only see projects in their venture (or null venture meaning cross-venture, if we allow)
      query += ` AND p.venture_id = ?`;
      params.push(req.user.ventureId);
    }

    query += ` ORDER BY p.updated_at DESC`;

    const [rows] = await pool.query(query, params);

    // Filter out budget for users level > 4
    const processedRows = rows.map(r => {
      if (req.user.accessLevel > 4) {
        delete r.budget;
      }
      return r;
    });

    res.json({ success: true, data: processedRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/projects — Create a project
router.post('/', authenticate, requireLevel(4), async (req, res) => {
  try {
    const { name, description, status, budget, venture_id, start_date, end_date } = req.body;
    
    // Check venture permission
    let vId = venture_id;
    if (req.user.accessLevel > 2) {
      vId = req.user.ventureId; // force to their venture
    }

    const [result] = await pool.query(`
      INSERT INTO projects (name, description, status, budget, venture_id, start_date, end_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, description, status || 'planning', budget || 0, vId, start_date || null, end_date || null, req.user.id]);

    res.json({ success: true, message: 'Project created successfully', data: { id: result.insertId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/projects/:id — Update a project
router.put('/:id', authenticate, requireLevel(4), async (req, res) => {
  try {
    const projectId = req.params.id;
    const { name, description, status, budget, venture_id, start_date, end_date } = req.body;

    // Check existing
    const [existing] = await pool.query('SELECT venture_id FROM projects WHERE id = ?', [projectId]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Project not found' });

    if (req.user.accessLevel > 2 && existing[0].venture_id !== req.user.ventureId) {
      return res.status(403).json({ success: false, message: 'Cannot edit projects outside your venture' });
    }

    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (budget !== undefined && req.user.accessLevel <= 4) { updates.push('budget = ?'); params.push(budget); }
    if (venture_id !== undefined && req.user.accessLevel <= 2) { updates.push('venture_id = ?'); params.push(venture_id); }
    if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date); }
    if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date); }

    if (updates.length === 0) return res.json({ success: true, message: 'No changes provided' });

    params.push(projectId);
    await pool.query(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, params);
    
    await logAudit(req.user.id, 'UPDATE_PROJECT', 'project', projectId, { targetId: projectId, changedFields: updates });

    res.json({ success: true, message: 'Project updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', authenticate, requireLevel(3), async (req, res) => {
  try {
    const projectId = req.params.id;
    const [existing] = await pool.query('SELECT venture_id FROM projects WHERE id = ?', [projectId]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Project not found' });

    if (req.user.accessLevel > 2 && existing[0].venture_id !== req.user.ventureId) {
      return res.status(403).json({ success: false, message: 'Cannot delete projects outside your venture' });
    }

    await pool.query('DELETE FROM projects WHERE id = ?', [projectId]);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
