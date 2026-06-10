const express = require('express');
const router = express.Router();
const { authenticate, requireLevel } = require('../middleware/auth.middleware');
const { pool } = require('../config/database');

// Require Level 1 (Super Admin) for all database routes
router.use(authenticate, requireLevel(1));

// List all tables
router.get('/tables', async (req, res) => {
  try {
    const [tables] = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const tableNames = tables.map(t => t.table_name || Object.values(t)[0]);
    res.json({ success: true, tables: tableNames });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get table schema and recent rows
router.get('/table/:name', async (req, res) => {
  try {
    const tableName = req.params.name;
    const [tables] = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const tableNames = tables.map(t => t.table_name || Object.values(t)[0]);
    if (!tableNames.includes(tableName)) {
      return res.status(400).json({ success: false, message: 'Invalid table name' });
    }

    const [columns] = await pool.query(`SELECT column_name as Field, data_type as Type FROM information_schema.columns WHERE table_name = $1`, [tableName]);
    const [rows] = await pool.query(`SELECT * FROM "${tableName}" LIMIT 100`);
    const [countRes] = await pool.query(`SELECT COUNT(*) as total FROM "${tableName}"`);

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
