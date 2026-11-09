const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { logAudit } = require('../services/audit.service');

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const { ventureId, projectId } = req.body;
    const { originalname, filename, mimetype, size } = req.file;

    const query = `
      INSERT INTO documents (file_name, original_name, mime_type, size, path, venture_id, project_id, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
    `;

    const values = [
      filename,
      originalname,
      mimetype,
      size,
      filename, // path or filename
      ventureId || null,
      projectId || null,
      req.user.id
    ];

    const [result] = await pool.query(query, values);

    // Fetch the inserted record to return it
    const [inserted] = await pool.query('SELECT * FROM documents WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      data: inserted[0]
    });
  } catch (err) {
    next(err);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const { ventureId, projectId } = req.query;

    let query = `
      SELECT d.*, u.full_name as uploaded_by_name, v.name as venture_name, p.name as project_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      LEFT JOIN ventures v ON d.venture_id = v.id
      LEFT JOIN projects p ON d.project_id = p.id
      WHERE 1=1
    `;
    const values = [];

    if (ventureId && ventureId !== 'all') {
      query += ` AND d.venture_id = ?`;
      values.push(ventureId);
    }
    if (projectId) {
      query += ` AND d.project_id = ?`;
      values.push(projectId);
    }

    // Role-based filtering: L6+ (Executive Staff and below) can only see documents 
    // from their own venture or global documents.
    if (req.user.accessLevel >= 6) {
      if (req.user.ventureId) {
        // If they already filtered by a specific ventureId, check if it's theirs
        if (ventureId && parseInt(ventureId) !== req.user.ventureId) {
           return res.status(403).json({ success: false, message: 'You can only view documents from your own venture' });
        }
        // If no ventureId filter was applied yet, restrict to their venture or global
        if (!ventureId) {
          query += ` AND (d.venture_id = ? OR d.venture_id IS NULL)`;
          values.push(req.user.ventureId);
        }
      } else {
        // User with L6+ but no venture assigned? Restrict to global only just in case
        if (!ventureId) {
          query += ` AND d.venture_id IS NULL`;
        }
      }
    }

    query += ` ORDER BY d.created_at DESC`;

    const [documents] = await pool.query(query, values);

    res.json({
      success: true,
      data: documents
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if doc exists
    const [docs] = await pool.query('SELECT * FROM documents WHERE id = ?', [id]);
    if (!docs.length) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const doc = docs[0];

    // Authorization check
    if (req.user.accessLevel >= 6 && doc.uploaded_by !== req.user.id) {
       return res.status(403).json({ success: false, message: 'Not authorized to delete this document' });
    }

    // Delete file
    const filePath = path.join(__dirname, '../../uploads', doc.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from DB
    await pool.query('DELETE FROM documents WHERE id = ?', [id]);
    await logAudit(req.user.id, 'DELETE_DOCUMENT', 'document', id, { documentId: id, path: doc.path });

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
};
