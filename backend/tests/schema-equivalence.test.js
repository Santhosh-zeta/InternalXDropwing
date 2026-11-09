/**
 * The two ways to get a database must end identical:
 *   A) deployment/postgres/init/*.sql (Docker first start, and what the other tests use)
 *   B) an empty database + every file in backend/migrations (npm run migrate / AUTO_MIGRATE)
 * Each is built in its own scratch schema of the test database and compared.
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { parseDbConfig } = require('./helpers/dbConfig');
const { migrate, migrationStatus, listMigrations } = require('../src/migrate');

const quiet = { info: () => {}, warn: () => {}, error: () => {} };
const INIT_DIR = path.join(__dirname, '../../deployment/postgres/init');
const schemaPool = (schema) => new Pool({ ...parseDbConfig(), max: 2, options: `-c search_path=${schema}` });

let admin;
let fromInit;
let fromMigrations;

const describeSchema = async (pool, schema) => {
  const q = async (sql) => (await pool.query(sql, [schema])).rows;
  const columns = await q(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default,
           character_maximum_length, numeric_precision, numeric_scale
    FROM information_schema.columns WHERE table_schema = $1 AND table_name <> 'schema_migrations'
    ORDER BY table_name, column_name`);
  const indexes = (await q("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = $1 AND tablename <> 'schema_migrations' ORDER BY indexname"))
    .map((r) => ({ ...r, indexdef: r.indexdef.split(`${schema}.`).join('') }));
  const constraints = await q(`
    SELECT table_name, constraint_name, constraint_type
    FROM information_schema.table_constraints WHERE table_schema = $1 AND table_name <> 'schema_migrations' AND constraint_type <> 'CHECK'
    ORDER BY table_name, constraint_name`);
  const triggers = await q(`
    SELECT event_object_table, trigger_name FROM information_schema.triggers
    WHERE trigger_schema = $1 ORDER BY trigger_name`);
  const enums = await q(`
    SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = $1 GROUP BY t.typname ORDER BY t.typname`);
  const reference = {
    ventures: (await pool.query('SELECT id, name, slug FROM ventures ORDER BY id')).rows,
    levels: (await pool.query('SELECT level_number, level_name FROM access_levels ORDER BY level_number')).rows,
  };
  return { columns, indexes, constraints, triggers, enums, reference };
};

beforeAll(async () => {
  admin = new Pool({ ...parseDbConfig(), max: 1 });
  for (const s of ['eq_init', 'eq_mig', 'eq_run']) await admin.query(`DROP SCHEMA IF EXISTS ${s} CASCADE; CREATE SCHEMA ${s}`);

  const a = schemaPool('eq_init');
  for (const f of fs.readdirSync(INIT_DIR).filter((n) => n.endsWith('.sql')).sort()) {
    await a.query(fs.readFileSync(path.join(INIT_DIR, f), 'utf8'));
  }
  fromInit = await describeSchema(a, 'eq_init');
  await a.end();

  const b = schemaPool('eq_mig');
  await migrate({ pool: b, log: quiet });
  fromMigrations = await describeSchema(b, 'eq_mig');
  global.__migPool = b;
});

afterAll(async () => {
  await global.__migPool.end();
  for (const s of ['eq_init', 'eq_mig', 'eq_run']) await admin.query(`DROP SCHEMA IF EXISTS ${s} CASCADE`);
  await admin.end();
});

describe('init SQL vs migrations', () => {
  test('columns are identical (name, type, nullability, default)', () => {
    expect(fromInit.columns.length).toBeGreaterThan(100);
    expect(fromMigrations.columns).toEqual(fromInit.columns);
  });
  test('indexes, constraints, triggers and enums are identical', () => {
    expect(fromMigrations.indexes).toEqual(fromInit.indexes);
    expect(fromMigrations.constraints).toEqual(fromInit.constraints);
    expect(fromMigrations.triggers).toEqual(fromInit.triggers);
    expect(fromMigrations.enums).toEqual(fromInit.enums);
  });
  test('reference rows (ventures, access levels) are identical', () => {
    expect(fromMigrations.reference).toEqual(fromInit.reference);
    expect(fromMigrations.reference.levels).toHaveLength(9);
  });
});

describe('runner', () => {
  test('is idempotent and tracks name + checksum', async () => {
    expect(await migrate({ pool: global.__migPool, log: quiet })).toEqual([]);
    const { rows } = await global.__migPool.query('SELECT version, name, checksum FROM schema_migrations ORDER BY version');
    expect(rows).toHaveLength(listMigrations().length);
    expect(rows[0].checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(await migrationStatus({ pool: global.__migPool })).toEqual({ ok: true, pending: [] });
  });

  test('refuses an applied migration whose file changed', async () => {
    const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'ix-mig-'));
    fs.writeFileSync(path.join(dir, '0001_a.sql'), 'SELECT 1;');
    const pool = schemaPool('eq_run');
    await migrate({ pool, dir, log: quiet });
    fs.writeFileSync(path.join(dir, '0001_a.sql'), 'SELECT 2;');
    await expect(migrate({ pool, dir, log: quiet })).rejects.toThrow(/modified after it was applied/);
    await pool.query("DELETE FROM schema_migrations WHERE version = '0001'");
    await pool.end();
  });

  test('a failing file rolls back completely and is not recorded', async () => {
    const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'ix-mig-'));
    fs.writeFileSync(path.join(dir, '0099_bad.sql'), 'CREATE TABLE eq_half (id int); SELECT * FROM does_not_exist;');
    const pool = schemaPool('eq_run');
    await expect(migrate({ pool, dir, log: quiet })).rejects.toThrow(/0099_bad.sql failed and was rolled back/);
    expect((await pool.query("SELECT to_regclass('eq_half') AS t")).rows[0].t).toBeNull();
    expect((await pool.query("SELECT 1 FROM schema_migrations WHERE version = '0099'")).rowCount).toBe(0);
    await pool.end();
  });
});
