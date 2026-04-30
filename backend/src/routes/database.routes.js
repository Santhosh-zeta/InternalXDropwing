const express = require('express');
const router = express.Router();
const { authenticate, requireLevel } = require('../middleware/auth.middleware');
const { pool } = require('../config/database');

// Require Level 1 (Super Admin) for all database routes
router.use(authenticate, requireLevel(1));

// List all tables
router.get('/tables', async (req, res) => {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    res.json({ success: true, tables: tableNames });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get table schema and recent rows
router.get('/table/:name', async (req, res) => {
  try {
    const tableName = req.params.name;
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    if (!tableNames.includes(tableName)) {
      return res.status(400).json({ success: false, message: 'Invalid table name' });
    }

    const [columns] = await pool.query(`SHOW COLUMNS FROM ??`, [tableName]);
    const [rows] = await pool.query(`SELECT * FROM ?? LIMIT 100`, [tableName]);
    const [countRes] = await pool.query(`SELECT COUNT(*) as total FROM ??`, [tableName]);

    res.json({
      success: true,
      columns,
      rows,
      totalCount: countRes[0].total
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Execute raw query
router.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, message: 'Query is required' });

    // Protect against accidentally dropping core tables if needed, or rely on Super Admin trust
    // but running raw queries is inherently risky. We trust Level 1.
    
    const [results, fields] = await pool.query(query);
    res.json({ 
      success: true, 
      results,
      fields: fields ? fields.map(f => f.name) : []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
