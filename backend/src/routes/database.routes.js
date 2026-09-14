const express = require('express');
const router = express.Router();
const { authenticate, requireLevel } = require('../middleware/auth.middleware');
const { pool } = require('../config/database');
const { pgPool } = require('../config/database.pg');
const { logAudit } = require('../services/audit.service');
const { sqlConsoleLimiter } = require('../middleware/rateLimit.middleware');
const { assertReadOnlySelect, SqlRejected } = require('../utils/sqlGuard');

// Require Level 1 (Super Admin) for all database routes
router.use(authenticate, requireLevel(1));

/**
 * Hard ceiling on what the console will return, so a `SELECT * FROM audit_logs`
 * on a large instance cannot pull the whole table into memory and out through
 * the browser.
 */
const MAX_ROWS = parseInt(process.env.SQL_CONSOLE_MAX_ROWS, 10) || 1000;
const STATEMENT_TIMEOUT_MS = parseInt(process.env.SQL_CONSOLE_TIMEOUT_MS, 10) || 5000;

/**
 * Kill switch. The console is left ON by default because the admin UI depends
 * on it and it is now read-only, capped, timed and audited — but an operator
 * who would rather not have a SQL prompt reachable over the internet at all can
 * set SQL_CONSOLE_ENABLED=false and the route disappears without a redeploy.
 */
const consoleEnabled = () => String(process.env.SQL_CONSOLE_ENABLED ?? 'true').toLowerCase() !== 'false';

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

/**
 * POST /api/database/query — read-only SQL console.
 *
 * Every query, accepted or rejected, is written to audit_logs with the actor
 * and their IP before the response is sent. See utils/sqlGuard.js for what the
 * parser refuses and why the READ ONLY transaction below is not redundant with
 * it.
 *
 * Uses pgPool directly rather than the `?`-placeholder shim: the shim rewrites
 * `?`, `NOW()` and `IFNULL(` inside the SQL text it is given, which would
 * silently mangle an operator's query.
 */
router.post('/query', sqlConsoleLimiter, async (req, res) => {
  const { query } = req.body;
  const actorIp = req.ip || null;

  if (!consoleEnabled()) {
    return res.status(403).json({ success: false, message: 'The SQL console is disabled on this deployment.' });
  }

  if (!query) return res.status(400).json({ success: false, message: 'Query is required' });

  let safeQuery;
  try {
    safeQuery = assertReadOnlySelect(query);
  } catch (err) {
    if (err instanceof SqlRejected) {
      await logAudit(req.user.id, 'SQL_CONSOLE_REJECTED', 'database', null,
        { query: String(query).slice(0, 4000), reason: err.message }, actorIp);
      return res.status(400).json({ success: false, message: err.message });
    }
    throw err;
  }

  let client;
  try {
    client = await pgPool.connect();

    // READ ONLY is enforced by Postgres itself, not by us — if the parser above
    // ever misses something, the server still refuses to write.
    await client.query('BEGIN TRANSACTION READ ONLY');
    // SET LOCAL only lives for this transaction, so it cannot leak onto the
    // next request that borrows this pooled connection.
    await client.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`);

    // Wrapping in a derived table applies the row cap without the operator
    // having to remember a LIMIT, and without altering their column list.
    const result = await client.query(
      `SELECT * FROM (${safeQuery}) AS _capped LIMIT ${MAX_ROWS}`
    );

    await client.query('ROLLBACK');

    await logAudit(req.user.id, 'SQL_CONSOLE_QUERY', 'database', null,
      { query: safeQuery.slice(0, 4000), rows: result.rowCount }, actorIp);

    res.json({
      success: true,
      results: result.rows,
      fields: result.fields ? result.fields.map(f => f.name) : []
    });
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (rollbackErr) { /* connection already unusable */ }
    }
    await logAudit(req.user.id, 'SQL_CONSOLE_FAILED', 'database', null,
      { query: String(query).slice(0, 4000), error: err.message }, actorIp);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
