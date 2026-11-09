const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const { withScope, internalOnly, toId } = require('../utils/scope');
const {
  createChecklistItemRules,
  progressRules,
  createResourceRules,
  createFeedbackRules,
  learningIdRules,
} = require('../middleware/validate.middleware');

/**
 * Learning hub. Internal staff only (clients get 403). Content is per venture:
 * a venture sees its own items plus company-wide ones (venture_id NULL); global
 * users (L1/L2) see everything. Managers (L<=5) write, only inside their own
 * venture; company-wide items are written and deleted by global users only.
 */
router.use(authenticate, withScope, internalOnly);

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const isManager = (scope) => scope.level <= 5;

/** Rows a caller may read: own venture + company-wide (or everything for global users). */
const readable = (scope, col, params) => {
  if (scope.global) return 'TRUE';
  if (scope.ventureId == null) return `${col} IS NULL`;
  params.push(scope.ventureId);
  return `(${col} = $${params.length} OR ${col} IS NULL)`;
};

/** Rows a manager may modify: own venture only (global users: any). */
const writable = (scope, col, params) => {
  if (scope.global) return 'TRUE';
  if (scope.ventureId == null) return 'FALSE';
  params.push(scope.ventureId);
  return `${col} = $${params.length}`;
};

/** Venture an authored row is stored under: own, or (global users) an existing one from the body, else company-wide. */
const authoredVenture = async (scope, bodyVentureId) => {
  if (!scope.global) return scope.ventureId;
  const id = toId(bodyVentureId);
  if (!id) return null;
  const [v] = await pool.query('SELECT id FROM ventures WHERE id = $1', [id]);
  return v.length ? id : null;
};

// ─── CHECKLIST ────────────────────────────────────────────────────────────────

// GET /api/learning/checklist — managers see items with completion stats, others their own progress
router.get('/checklist', async (req, res) => {
  try {
    const { scope } = req;
    const params = [];
    if (isManager(scope)) {
      const internVenture = scope.global ? 'TRUE' : (scope.ventureId == null ? 'FALSE' : `u.venture_id = $${params.push(scope.ventureId)}`);
      const where = readable(scope, 'lci.venture_id', params);
      const [items] = await pool.query(`
        SELECT lci.*,
          (SELECT COUNT(*)::int FROM learning_intern_progress lip JOIN users u ON u.id = lip.user_id
            WHERE lip.checklist_item_id = lci.id AND lip.completed = TRUE AND ${internVenture}) AS completions,
          (SELECT COUNT(*)::int FROM users u
            WHERE u.access_level = 8 AND u.is_active = TRUE AND ${internVenture}) AS total_interns
        FROM learning_checklist_items lci
        WHERE ${where}
        ORDER BY lci.category, lci.sort_order
      `, params);
      return res.json({ success: true, data: items });
    }
    params.push(scope.userId);
    const where = readable(scope, 'lci.venture_id', params);
    const [items] = await pool.query(`
      SELECT lci.*, COALESCE(lip.completed, false) AS completed, lip.completed_at
      FROM learning_checklist_items lci
      LEFT JOIN learning_intern_progress lip ON lip.checklist_item_id = lci.id AND lip.user_id = $1
      WHERE ${where}
      ORDER BY lci.category, lci.sort_order
    `, params);
    res.json({ success: true, data: items });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Server error');
  }
});

// POST /api/learning/checklist — manager creates a checklist item
router.post('/checklist', createChecklistItemRules, async (req, res) => {
  try {
    const { scope } = req;
    if (!isManager(scope)) return fail(res, 403, 'Managers only.');

    const { title, description, category, sort_order = 0, due_days = null } = req.body;
    if (!title) return fail(res, 400, 'Title is required.');
    const ventureId = await authoredVenture(scope, req.body.venture_id);
    if (!scope.global && ventureId == null) return fail(res, 403, 'Your account has no venture');

    const [result] = await pool.query(
      `INSERT INTO learning_checklist_items (title, description, category, sort_order, due_days, venture_id) VALUES (?,?,?,?,?,?) RETURNING id`,
      [title, description || null, category || 'General', sort_order, due_days, ventureId]
    );
    res.json({ success: true, data: { id: result.insertId, title, description, category, sort_order, due_days, venture_id: ventureId } });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Server error');
  }
});

// DELETE /api/learning/checklist/:id
router.delete('/checklist/:id', learningIdRules, async (req, res) => {
  try {
    const { scope } = req;
    if (!isManager(scope)) return fail(res, 403, 'Managers only.');
    const params = [toId(req.params.id)];
    const [r] = await pool.query(
      `DELETE FROM learning_checklist_items WHERE id = $1 AND ${writable(scope, 'venture_id', params)}`, params);
    if (!r.affectedRows) return fail(res, 404, 'Item not found');
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Server error');
  }
});

// ─── PROGRESS ─────────────────────────────────────────────────────────────────

// PATCH /api/learning/progress/:checklistItemId — intern marks an item complete/incomplete
router.patch('/progress/:checklistItemId', progressRules, async (req, res) => {
  try {
    const { scope } = req;
    if (scope.level !== 8) return fail(res, 403, 'Interns only.');

    const completed = req.body.completed === true || req.body.completed === 'true';
    const itemId = toId(req.params.checklistItemId);
    const params = [itemId];
    const [items] = await pool.query(
      `SELECT id FROM learning_checklist_items lci WHERE lci.id = $1 AND ${readable(scope, 'lci.venture_id', params)}`, params);
    if (!items.length) return fail(res, 404, 'Item not found');

    await pool.query(
      `INSERT INTO learning_intern_progress (user_id, checklist_item_id, completed, completed_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, checklist_item_id) DO UPDATE SET completed = EXCLUDED.completed, completed_at = EXCLUDED.completed_at`,
      [scope.userId, itemId, completed, completed ? new Date() : null]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Server error');
  }
});

// GET /api/learning/progress — managers: intern progress summaries (own venture; global: all)
router.get('/progress', async (req, res) => {
  try {
    const { scope } = req;
    if (!isManager(scope)) return fail(res, 403, 'Managers only.');

    const params = [];
    const where = scope.global ? 'TRUE' : (scope.ventureId == null ? 'FALSE' : `u.venture_id = $${params.push(scope.ventureId)}`);
    const [rows] = await pool.query(`
      SELECT
        u.id, u.full_name, u.email, u.department, u.designation,
        COUNT(lci.id)::int AS total_items,
        SUM(CASE WHEN lip.completed THEN 1 ELSE 0 END)::int AS completed_items,
        MAX(lip.completed_at) AS last_activity
      FROM users u
      JOIN learning_checklist_items lci ON (lci.venture_id = u.venture_id OR lci.venture_id IS NULL)
      LEFT JOIN learning_intern_progress lip ON lip.user_id = u.id AND lip.checklist_item_id = lci.id
      WHERE ${where} AND u.access_level = 8 AND u.is_active = TRUE
      GROUP BY u.id
      ORDER BY completed_items DESC
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Server error');
  }
});

// ─── RESOURCES ────────────────────────────────────────────────────────────────

router.get('/resources', async (req, res) => {
  try {
    const params = [];
    const [rows] = await pool.query(`
      SELECT lr.*, u.full_name AS added_by_name
      FROM learning_resources lr
      LEFT JOIN users u ON u.id = lr.added_by
      WHERE ${readable(req.scope, 'lr.venture_id', params)}
      ORDER BY lr.category, lr.created_at DESC
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Server error');
  }
});

router.post('/resources', createResourceRules, async (req, res) => {
  try {
    const { scope } = req;
    if (!isManager(scope)) return fail(res, 403, 'Managers only.');

    const { title, description, url, category, resource_type = 'link' } = req.body;
    if (!title || !url) return fail(res, 400, 'Title and URL are required.');
    const ventureId = await authoredVenture(scope, req.body.venture_id);
    if (!scope.global && ventureId == null) return fail(res, 403, 'Your account has no venture');

    const [result] = await pool.query(
      `INSERT INTO learning_resources (title, description, url, category, resource_type, added_by, venture_id) VALUES (?,?,?,?,?,?,?) RETURNING id`,
      [title, description || null, url, category || 'General', resource_type, scope.userId, ventureId]
    );
    res.json({ success: true, data: { id: result.insertId, title, description, url, category, resource_type, venture_id: ventureId } });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Server error');
  }
});

router.delete('/resources/:id', learningIdRules, async (req, res) => {
  try {
    const { scope } = req;
    if (!isManager(scope)) return fail(res, 403, 'Managers only.');
    const params = [toId(req.params.id)];
    const [r] = await pool.query(
      `DELETE FROM learning_resources WHERE id = $1 AND ${writable(scope, 'venture_id', params)}`, params);
    if (!r.affectedRows) return fail(res, 404, 'Resource not found');
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Server error');
  }
});

// ─── FEEDBACK ─────────────────────────────────────────────────────────────────

// GET /api/learning/feedback — interns see their own, managers their venture's (global: all)
router.get('/feedback', async (req, res) => {
  try {
    const { scope } = req;
    const params = [];
    const where = isManager(scope)
      ? (scope.global ? 'TRUE' : (scope.ventureId == null ? 'FALSE' : `lf.venture_id = $${params.push(scope.ventureId)}`))
      : `lf.intern_id = $${params.push(scope.userId)}`;
    const [rows] = await pool.query(`
      SELECT lf.*, u.full_name AS intern_name, m.full_name AS manager_name
      FROM learning_feedback lf
      JOIN users u ON u.id = lf.intern_id
      JOIN users m ON m.id = lf.manager_id
      WHERE ${where}
      ORDER BY lf.created_at DESC
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Server error');
  }
});

// POST /api/learning/feedback — the intern must be an active L8 of the manager's own venture
router.post('/feedback', createFeedbackRules, async (req, res) => {
  try {
    const { scope } = req;
    if (!isManager(scope)) return fail(res, 403, 'Managers only.');

    const { note, rating = null, week_label = null } = req.body;
    const internId = toId(req.body.intern_id);
    if (!internId || !note) return fail(res, 400, 'Intern and note are required.');

    const [interns] = await pool.query(
      'SELECT id, venture_id FROM users WHERE id = $1 AND access_level = 8 AND is_active = TRUE', [internId]);
    const intern = interns[0];
    if (!intern || (!scope.global && intern.venture_id !== scope.ventureId)) return fail(res, 404, 'Intern not found');

    const [result] = await pool.query(
      `INSERT INTO learning_feedback (manager_id, intern_id, note, rating, week_label, venture_id) VALUES (?,?,?,?,?,?) RETURNING id`,
      [scope.userId, internId, note, rating, week_label, intern.venture_id]
    );
    res.json({ success: true, data: { id: result.insertId, manager_id: scope.userId, intern_id: internId, note, rating, week_label } });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Server error');
  }
});

router.delete('/feedback/:id', learningIdRules, async (req, res) => {
  try {
    const { scope } = req;
    if (!isManager(scope)) return fail(res, 403, 'Managers only.');
    const params = [toId(req.params.id), scope.userId];
    const [r] = await pool.query(
      `DELETE FROM learning_feedback WHERE id = $1 AND (manager_id = $2 OR ${scope.global ? 'TRUE' : 'FALSE'})`, params);
    if (!r.affectedRows) return fail(res, 404, 'Feedback not found');
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    fail(res, 500, 'Server error');
  }
});

module.exports = router;
