/**
 * Minimal SQL migration runner.
 *
 *   npm run migrate
 *
 * Applies backend/migrations/NNNN_*.sql in order, each in a transaction,
 * recording the version in `schema_migrations`. Migrations must be idempotent
 * (IF NOT EXISTS ...) because fresh installs get the same changes from
 * deployment/postgres/init/01_schema.sql and then simply have them recorded.
 * 0001 is the init schema itself.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pgPool } = require('./config/database.pg');

const DIR = path.join(__dirname, '../migrations');

const migrate = async (pool = pgPool) => {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(20) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)'
  );
  const { rows: base } = await pool.query("SELECT to_regclass('public.users') AS t");
  if (!base[0].t) {
    throw new Error('Database has no baseline schema. Load deployment/postgres/init/*.sql first.');
  }
  const { rows: done } = await pool.query('SELECT version FROM schema_migrations');
  const applied = new Set(done.map((r) => r.version));
  const files = fs.readdirSync(DIR).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
  const ran = [];
  for (const file of files) {
    const version = file.slice(0, 4);
    if (applied.has(version)) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(fs.readFileSync(path.join(DIR, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
      await client.query('COMMIT');
      ran.push(file);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${err.message}`);
    } finally {
      client.release();
    }
  }
  return ran;
};

module.exports = { migrate };

if (require.main === module) {
  migrate()
    .then((ran) => {
      console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'Database is up to date.');
      return pgPool.end();
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
