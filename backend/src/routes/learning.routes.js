const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

// ─── CHECKLIST ────────────────────────────────────────────────────────────────

// GET /api/learning/checklist — Get checklist items (interns see own progress, managers see all)
router.get('/checklist', authenticate, async (req, res) => {
  try {
    const { id: userId, accessLevel, ventureId } = req.user;
    const isManager = accessLevel <= 5;

    if (isManager) {
      // Managers see all checklist items with completion stats
      const [items] = await pool.query(`
        SELECT
          lci.*,
          COUNT(lip.id) AS completions,
          COUNT(DISTINCT u.id) AS total_interns
        FROM learning_checklist_items lci
        LEFT JOIN learning_intern_progress lip ON lip.checklist_item_id = lci.id AND lip.completed = true
        LEFT JOIN users u ON u.venture_id = ? AND u.access_level = 8
        WHERE lci.venture_id = ? OR lci.venture_id IS NULL
        GROUP BY lci.id
        ORDER BY lci.category, lci.sort_order
      `, [ventureId, ventureId]);
      return res.json({ success: true, data: items });
    } else {
      // Interns see items with their own progress
      const [items] = await pool.query(`
        SELECT
          lci.*,
          COALESCE(lip.completed, false) AS completed,
          lip.completed_at
        FROM learning_checklist_items lci
        LEFT JOIN learning_intern_progress lip ON lip.checklist_item_id = lci.id AND lip.user_id = ?
        WHERE lci.venture_id = ? OR lci.venture_id IS NULL
        ORDER BY lci.category, lci.sort_order
      `, [userId, ventureId]);
      return res.json({ success: true, data: items });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/learning/checklist — Manager creates a checklist item
router.post('/checklist', authenticate, async (req, res) => {
  try {
    const { accessLevel, ventureId } = req.user;
    if (accessLevel > 5) return res.status(403).json({ success: false, message: 'Managers only.' });

    const { title, description, category, sort_order = 0, due_days = null } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required.' });

    const [result] = await pool.query(
      `INSERT INTO learning_checklist_items (title, description, category, sort_order, due_days, venture_id) VALUES (?,?,?,?,?,?) RETURNING id`,
      [title, description || null, category || 'General', sort_order, due_days, ventureId]
    );
    res.json({ success: true, data: { id: result.insertId, title, description, category, sort_order, due_days, venture_id: ventureId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/learning/checklist/:id — Manager deletes a checklist item
router.delete('/checklist/:id', authenticate, async (req, res) => {
  try {
    const { accessLevel } = req.user;
    if (accessLevel > 5) return res.status(403).json({ success: false, message: 'Managers only.' });
    await pool.query('DELETE FROM learning_checklist_items WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── PROGRESS ─────────────────────────────────────────────────────────────────

// PATCH /api/learning/progress/:checklistItemId — Intern marks item complete/incomplete
router.patch('/progress/:checklistItemId', authenticate, async (req, res) => {
  try {
    const { id: userId, accessLevel } = req.user;
    if (accessLevel !== 8) return res.status(403).json({ success: false, message: 'Interns only.' });

    const { completed } = req.body;
    const checklistItemId = req.params.checklistItemId;

    const [existing] = await pool.query(
      'SELECT id FROM learning_intern_progress WHERE user_id = ? AND checklist_item_id = ?',
      [userId, checklistItemId]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE learning_intern_progress SET completed = ?, completed_at = ? WHERE user_id = ? AND checklist_item_id = ?',
        [completed ? true : false, completed ? new Date() : null, userId, checklistItemId]
      );
    } else {
      await pool.query(
        'INSERT INTO learning_intern_progress (user_id, checklist_item_id, completed, completed_at) VALUES (?,?,?,?)',
        [userId, checklistItemId, completed ? true : false, completed ? new Date() : null]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/learning/progress — Manager gets all intern progress summaries
router.get('/progress', authenticate, async (req, res) => {
  try {
    const { accessLevel, ventureId } = req.user;
    if (accessLevel > 5) return res.status(403).json({ success: false, message: 'Managers only.' });

    const [rows] = await pool.query(`
      SELECT
        u.id, u.full_name, u.email, u.department, u.designation,
        COUNT(lci.id) AS total_items,
        SUM(CASE WHEN lip.completed THEN 1 ELSE 0 END) AS completed_items,
        MAX(lip.completed_at) AS last_activity
      FROM users u
      CROSS JOIN learning_checklist_items lci ON (lci.venture_id = u.venture_id OR lci.venture_id IS NULL)
      LEFT JOIN learning_intern_progress lip ON lip.user_id = u.id AND lip.checklist_item_id = lci.id
      WHERE u.venture_id = ? AND u.access_level = 8
      GROUP BY u.id
      ORDER BY completed_items DESC
    `, [ventureId]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── RESOURCES ────────────────────────────────────────────────────────────────

// GET /api/learning/resources — Get resource library
router.get('/resources', authenticate, async (req, res) => {
  try {
    const { ventureId } = req.user;
    const [rows] = await pool.query(`
      SELECT lr.*, u.full_name AS added_by_name
      FROM learning_resources lr
      LEFT JOIN users u ON u.id = lr.added_by
      WHERE lr.venture_id = ? OR lr.venture_id IS NULL
      ORDER BY lr.category, lr.created_at DESC
    `, [ventureId]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/learning/resources — Manager adds a resource
router.post('/resources', authenticate, async (req, res) => {
  try {
    const { accessLevel, id: userId, ventureId } = req.user;
    if (accessLevel > 5) return res.status(403).json({ success: false, message: 'Managers only.' });

    const { title, description, url, category, resource_type = 'link' } = req.body;
    if (!title || !url) return res.status(400).json({ success: false, message: 'Title and URL are required.' });

    const [result] = await pool.query(
      `INSERT INTO learning_resources (title, description, url, category, resource_type, added_by, venture_id) VALUES (?,?,?,?,?,?,?) RETURNING id`,
      [title, description || null, url, category || 'General', resource_type, userId, ventureId]
    );
    res.json({ success: true, data: { id: result.insertId, title, description, url, category, resource_type, venture_id: ventureId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/learning/resources/:id — Manager deletes a resource
router.delete('/resources/:id', authenticate, async (req, res) => {
  try {
    const { accessLevel } = req.user;
    if (accessLevel > 5) return res.status(403).json({ success: false, message: 'Managers only.' });
    await pool.query('DELETE FROM learning_resources WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── FEEDBACK ─────────────────────────────────────────────────────────────────

// GET /api/learning/feedback — Get feedback (intern sees own, manager sees all)
router.get('/feedback', authenticate, async (req, res) => {
  try {
    const { id: userId, accessLevel, ventureId } = req.user;
    const isManager = accessLevel <= 5;

    let query, params;
    if (isManager) {
      query = `
        SELECT lf.*, u.full_name AS intern_name, m.full_name AS manager_name
        FROM learning_feedback lf
        JOIN users u ON u.id = lf.intern_id
        JOIN users m ON m.id = lf.manager_id
        WHERE lf.venture_id = ?
        ORDER BY lf.created_at DESC
      `;
      params = [ventureId];
    } else {
      query = `
        SELECT lf.*, u.full_name AS intern_name, m.full_name AS manager_name
        FROM learning_feedback lf
        JOIN users u ON u.id = lf.intern_id
        JOIN users m ON m.id = lf.manager_id
        WHERE lf.intern_id = ?
        ORDER BY lf.created_at DESC
      `;
      params = [userId];
    }
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/learning/feedback — Manager adds feedback for an intern
router.post('/feedback', authenticate, async (req, res) => {
  try {
    const { id: managerId, accessLevel, ventureId } = req.user;
    if (accessLevel > 5) return res.status(403).json({ success: false, message: 'Managers only.' });

    const { intern_id, note, rating = null, week_label = null } = req.body;
    if (!intern_id || !note) return res.status(400).json({ success: false, message: 'Intern and note are required.' });

    const [result] = await pool.query(
      `INSERT INTO learning_feedback (manager_id, intern_id, note, rating, week_label, venture_id) VALUES (?,?,?,?,?,?) RETURNING id`,
      [managerId, intern_id, note, rating, week_label, ventureId]
    );
    res.json({ success: true, data: { id: result.insertId, manager_id: managerId, intern_id, note, rating, week_label } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/learning/feedback/:id — Manager deletes feedback
router.delete('/feedback/:id', authenticate, async (req, res) => {
  try {
    const { accessLevel, id: managerId } = req.user;
    if (accessLevel > 5) return res.status(403).json({ success: false, message: 'Managers only.' });
    await pool.query('DELETE FROM learning_feedback WHERE id = ? AND manager_id = ?', [req.params.id, managerId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
