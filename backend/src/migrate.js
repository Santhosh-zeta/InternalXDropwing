/**
 * SQL migration runner.
 *
 *   npm run migrate            apply pending migrations and exit
 *
 * The server also calls migrate() at boot (set AUTO_MIGRATE=false to opt out).
 *
 * Rules:
 *  - backend/migrations/NNNN_name.sql, applied in numeric order, each file in
 *    its own transaction (so a failure leaves the database at the previous
 *    migration, never half-way through a file).
 *  - Every file must be idempotent (IF NOT EXISTS, DROP ... IF EXISTS, ...), so
 *    it is safe on a database that already has the change.
 *  - Do not use statements that cannot run in a transaction
 *    (CREATE INDEX CONCURRENTLY, ALTER TYPE ... ADD VALUE in the same file as its use).
 *  - Applied files are tracked in schema_migrations with a SHA-256 checksum.
 *    Editing a file after it was applied is refused: add a new migration instead.
 *  - A session-level advisory lock serialises concurrent runners (two replicas
 *    booting at once, or a deploy script racing the server).
 */
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pgPool } = require('./config/database.pg');

const DIR = path.join(__dirname, '../migrations');
const LOCK_KEY = 727_3001; // arbitrary app-wide constant for pg_advisory_lock
const FILE_RE = /^(\d{4})_[a-z0-9_]+\.sql$/;

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');

/** Migration files on disk, sorted: [{ version, name, sql, checksum }] */
const listMigrations = (dir = DIR) => {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const bad = files.filter((f) => !FILE_RE.test(f));
  if (bad.length) throw new Error(`Migration file names must look like 0001_name.sql: ${bad.join(', ')}`);
  const seen = new Set();
  return files.map((name) => {
    const version = name.slice(0, 4);
    if (seen.has(version)) throw new Error(`Two migrations share version ${version}`);
    seen.add(version);
    const sql = fs.readFileSync(path.join(dir, name), 'utf8');
    return { version, name, sql, checksum: sha(sql) };
  });
};

const ensureTable = async (db) => {
  await db.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       version VARCHAR(20) PRIMARY KEY,
       applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`
  );
  // Older databases only have (version, applied_at).
  await db.query('ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS name VARCHAR(255)');
  await db.query('ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum CHAR(64)');
};

/**
 * Apply every pending migration. Returns the names applied (empty = up to date).
 * Throws on the first failure; nothing after it is attempted.
 */
const migrate = async ({ pool = pgPool, dir = DIR, log = console } = {}) => {
  const migrations = listMigrations(dir);
  const lock = await pool.connect();
  try {
    await lock.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    await ensureTable(lock);
    const { rows } = await lock.query('SELECT version, name, checksum FROM schema_migrations');
    const applied = new Map(rows.map((r) => [r.version, r]));

    const ran = [];
    for (const m of migrations) {
      const prior = applied.get(m.version);
      if (prior) {
        if (prior.checksum && prior.checksum !== m.checksum) {
          throw new Error(
            `Migration ${m.name} was modified after it was applied (checksum mismatch). ` +
            'Never edit an applied migration; add a new one.'
          );
        }
        if (!prior.checksum) {
          // Recorded by an older runner without checksums: adopt it as-is.
          await lock.query('UPDATE schema_migrations SET name = $2, checksum = $3 WHERE version = $1', [m.version, m.name, m.checksum]);
        }
        continue;
      }
      const started = Date.now();
      try {
        await lock.query('BEGIN');
        await lock.query(m.sql);
        await lock.query('INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)', [m.version, m.name, m.checksum]);
        await lock.query('COMMIT');
      } catch (err) {
        await lock.query('ROLLBACK').catch(() => {});
        throw new Error(`Migration ${m.name} failed and was rolled back: ${err.message}`);
      }
      ran.push(m.name);
      log.info(`[migrate] applied ${m.name} (${Date.now() - started} ms)`);
    }
    if (!ran.length) log.info(`[migrate] database is up to date (${migrations.length} migrations)`);
    return ran;
  } finally {
    await lock.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {});
    lock.release();
  }
};

/** { ok, pending: [names] }: used by /api/ready. Read-only. */
const migrationStatus = async ({ pool = pgPool, dir = DIR } = {}) => {
  const { rows: t } = await pool.query("SELECT to_regclass('schema_migrations') AS t");
  const done = t[0].t ? new Set((await pool.query('SELECT version FROM schema_migrations')).rows.map((r) => r.version)) : new Set();
  const pending = listMigrations(dir).filter((m) => !done.has(m.version)).map((m) => m.name);
  return { ok: pending.length === 0, pending };
};

module.exports = { migrate, migrationStatus, listMigrations };

if (require.main === module) {
  migrate()
    .then(() => pgPool.end())
    .catch((err) => {
      console.error(`[migrate] ${err.message}`);
      process.exit(1);
    });
}
