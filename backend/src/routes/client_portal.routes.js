const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { reportLimiter } = require('../middleware/rateLimit.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { withScope, projectWhere, taskWhere, documentWhere } = require('../utils/scope');
const { listInvoices } = require('../controllers/invoice.controller');

/**
 * GET /api/client-portal/overview - L9 clients only.
 *
 * A client sees exactly what their project memberships entitle them to and
 * nothing internal: no budgets, no staff emails, no rates; deliverables are the
 * tasks assigned to them; documents are those staff flagged client_visible;
 * invoice amounts come from the single rate source (utils/rates.js) restricted
 * to timesheets on their projects.
 */
router.get('/overview', authenticate, withScope, reportLimiter, async (req, res) => {
  try {
    const { scope } = req;
    if (!scope.isClient) {
      return res.status(403).json({ success: false, message: 'Client portal is restricted to client accounts.' });
    }

    const pParams = [];
    const [projects] = await pool.query(`
      SELECT p.id, p.name AS title, p.description, p.status, p.venture_id,
        COALESCE(ROUND((
          (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed')::numeric /
          NULLIF((SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id), 0)
        ) * 100), 0)::int AS progress,
        p.start_date, p.end_date,
        u.full_name AS manager_name
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE ${projectWhere(scope, 'p', pParams)}
      ORDER BY p.created_at DESC
      LIMIT 20
    `, pParams);

    // The venture they are served by: their own, else the first project's.
    const ventureId = scope.ventureId || (projects[0] && projects[0].venture_id) || null;
    let venture = null;
    if (ventureId) {
      const [v] = await pool.query('SELECT id, name, slug, logo_url, primary_color, description FROM ventures WHERE id = $1', [ventureId]);
      venture = v[0] || null;
    }

    const tParams = [];
    const [deliverables] = await pool.query(`
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date,
        t.created_at, u.full_name AS assigned_by_name
      FROM tasks t
      JOIN users u ON t.assigned_by = u.id
      WHERE ${taskWhere(scope, 't', tParams)}
      ORDER BY t.due_date ASC
      LIMIT 30
    `, tParams);

    const invoices = (await listInvoices(scope)).slice(0, 12).map(i => ({
      ...i,
      month: new Date(i.month + '-01T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
    }));

    const dParams = [];
    const [documents] = await pool.query(`
      SELECT d.id, d.original_name AS file_name, d.size AS file_size, d.mime_type AS file_type, d.created_at,
        u.full_name AS uploaded_by, 'general' AS category
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE ${documentWhere(scope, 'd', dParams)}
      ORDER BY d.created_at DESC
      LIMIT 20
    `, dParams);

    res.json({ success: true, data: { venture, projects, deliverables, invoices, documents } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
