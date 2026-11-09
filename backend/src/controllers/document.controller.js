const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { logAudit } = require('../services/audit.service');
const { UPLOAD_ROOT } = require('../middleware/upload.middleware');
const {
  toId, documentWhere, getAccessibleProject, getAccessibleDocument,
} = require('../utils/scope');

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const discard = (file) => { if (file) fs.unlink(file.path, () => {}); };

/**
 * Upload. The venture is derived: from the project (which must be visible to
 * the caller) or from the caller's own venture. Only global users may name a
 * venture, and only for a project-less document. Clients cannot upload.
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    const { scope } = req;
    if (!req.file) return fail(res, 400, 'No file provided');
    if (scope.isClient) { discard(req.file); return fail(res, 403, 'Clients cannot upload documents'); }

    const { projectId, clientVisible } = req.body;
    let ventureId = scope.global ? toId(req.body.ventureId) : scope.ventureId;
    let project = null;

    if (projectId) {
      project = await getAccessibleProject(scope, projectId);
      if (!project) { discard(req.file); return fail(res, 404, 'Project not found'); }
      ventureId = project.venture_id;
    }
    if (ventureId != null && !scope.global && ventureId !== scope.ventureId) {
      discard(req.file);
      return fail(res, 403, 'Not allowed to upload to this venture');
    }
    // Only venture admins and global users decide what clients can see.
    const visible = !!project && (scope.global || scope.isVentureAdmin) && ['true', '1', true].includes(clientVisible);

    const { originalname, filename, mimetype, size } = req.file;
    const [result] = await pool.query(
      `INSERT INTO documents (file_name, original_name, mime_type, size, path, venture_id, project_id, uploaded_by, client_visible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [filename, originalname, mimetype, size, filename, ventureId || null, project ? project.id : null, scope.userId, visible]
    );
    const [inserted] = await pool.query('SELECT * FROM documents WHERE id = ?', [result.insertId]);

    res.status(201).json({ success: true, data: inserted[0] });
  } catch (err) {
    discard(req.file);
    next(err);
  }
};

/** List. ventureId / projectId are only narrowing filters on top of the scope predicate. */
exports.getDocuments = async (req, res, next) => {
  try {
    const { scope } = req;
    const params = [];
    let query = `
      SELECT d.*, u.full_name as uploaded_by_name, v.name as venture_name, p.name as project_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      LEFT JOIN ventures v ON d.venture_id = v.id
      LEFT JOIN projects p ON d.project_id = p.id
      WHERE ${documentWhere(scope, 'd', params)}
    `;
    const { ventureId, projectId } = req.query;
    if (ventureId && ventureId !== 'all') {
      const v = toId(ventureId);
      if (!v) return fail(res, 400, 'Invalid ventureId');
      params.push(v);
      query += ` AND d.venture_id = $${params.length}`;
    }
    if (projectId) {
      const pid = toId(projectId);
      if (!pid) return fail(res, 400, 'Invalid projectId');
      params.push(pid);
      query += ` AND d.project_id = $${params.length}`;
    }
    query += ' ORDER BY d.created_at DESC';

    const [documents] = await pool.query(query, params);
    res.json({ success: true, data: documents });
  } catch (err) {
    next(err);
  }
};

/** Staff delete their own uploads; venture admins and global users any visible document. */
exports.deleteDocument = async (req, res, next) => {
  try {
    const { scope } = req;
    const doc = await getAccessibleDocument(scope, { id: req.params.id });
    if (!doc) return fail(res, 404, 'Document not found');
    if (scope.isClient || (!scope.global && !scope.isVentureAdmin && doc.uploaded_by !== scope.userId)) {
      return fail(res, 403, 'Not authorized to delete this document');
    }
    // Stored names are generated; basename keeps a legacy/odd row inside the upload dir.
    const filePath = path.join(UPLOAD_ROOT, path.basename(doc.path || ''));
    if (doc.path && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await pool.query('DELETE FROM documents WHERE id = ?', [doc.id]);
    await logAudit(req.user.id, 'DELETE_DOCUMENT', 'document', doc.id, { documentId: doc.id, path: doc.path });
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/** Share / unshare a project document with the project's clients. */
exports.setClientVisible = async (req, res, next) => {
  try {
    const { scope } = req;
    if (!scope.global && !scope.isVentureAdmin) return fail(res, 403, 'Not authorized');
    const doc = await getAccessibleDocument(scope, { id: req.params.id });
    if (!doc) return fail(res, 404, 'Document not found');
    if (!doc.project_id) return fail(res, 400, 'Only project documents can be shared with clients');
    const visible = req.body.clientVisible === true || req.body.clientVisible === 'true';
    await pool.query('UPDATE documents SET client_visible = ? WHERE id = ?', [visible, doc.id]);
    res.json({ success: true, data: { id: doc.id, client_visible: visible } });
  } catch (err) {
    next(err);
  }
};
