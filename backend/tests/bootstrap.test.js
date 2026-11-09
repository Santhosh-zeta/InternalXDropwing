const bcrypt = require('bcryptjs');
const { bootstrapAdmin } = require('../src/services/bootstrap');
const { checkAdminPassword } = require('../src/utils/passwordPolicy');
const { validateConfig } = require('../src/config/env');
const { resetUsers, createUser, pgPool, close } = require('./helpers/db');

const STRONG_PW = 'Vq7!rT2#mZp9xL';
const log = () => ({ warn: jest.fn(), info: jest.fn() });

beforeEach(async () => {
  await resetUsers();
  delete process.env.BOOTSTRAP_ADMIN_EMAIL;
  delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
});
afterAll(close);

const userCount = async () => (await pgPool.query('SELECT count(*)::int AS n FROM users')).rows[0].n;

describe('bootstrapAdmin', () => {
  test('creates a verified L1 from env when none exists, with a hashed password', async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = 'Owner@DropwingGroups.com';
    process.env.BOOTSTRAP_ADMIN_PASSWORD = STRONG_PW;
    const l = log();
    expect(await bootstrapAdmin(l)).toBe('created');
    const { rows } = await pgPool.query('SELECT * FROM users');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: 'owner@dropwinggroups.com', access_level: 1, venture_id: null, is_verified: true, is_active: true });
    expect(rows[0].password_hash).not.toContain(STRONG_PW);
    expect(await bcrypt.compare(STRONG_PW, rows[0].password_hash)).toBe(true);
    expect(l.info).toHaveBeenCalledTimes(1);
  });

  test('does nothing once an L1 exists, even if env is set', async () => {
    await createUser({ level: 1 });
    process.env.BOOTSTRAP_ADMIN_EMAIL = 'other@dropwinggroups.com';
    process.env.BOOTSTRAP_ADMIN_PASSWORD = STRONG_PW;
    expect(await bootstrapAdmin(log())).toBe('exists');
    expect(await userCount()).toBe(1);
  });

  test('warns (does not throw) when env is missing and no L1 exists', async () => {
    const l = log();
    expect(await bootstrapAdmin(l)).toBe('skipped');
    expect(l.warn).toHaveBeenCalledWith(expect.stringContaining('BOOTSTRAP_ADMIN_EMAIL'));
    expect(await userCount()).toBe(0);
  });

  test.each(['short1!A', 'changeme12345', 'Password123456!', 'aaaaaaaaaaaaaaaa', 'alllowercaseletters', 'Test@1234Test@1234'])(
    'refuses weak or placeholder password %s',
    async (pw) => {
      process.env.BOOTSTRAP_ADMIN_EMAIL = 'owner@dropwinggroups.com';
      process.env.BOOTSTRAP_ADMIN_PASSWORD = pw;
      const l = log();
      expect(await bootstrapAdmin(l)).toBe('skipped');
      expect(l.warn).toHaveBeenCalledWith(expect.stringContaining('refused'));
      expect(await userCount()).toBe(0);
    }
  );

  test('refuses to silently promote an existing lower-level account', async () => {
    const existing = await createUser({ level: 7, ventureId: 1, email: 'staff@dropwing.in' });
    process.env.BOOTSTRAP_ADMIN_EMAIL = existing.email;
    process.env.BOOTSTRAP_ADMIN_PASSWORD = STRONG_PW;
    expect(await bootstrapAdmin(log())).toBe('skipped');
    const { rows } = await pgPool.query('SELECT access_level FROM users WHERE id = $1', [existing.id]);
    expect(rows[0].access_level).toBe(7);
  });
});

describe('seed data', () => {
  test('init SQL ships no user accounts', async () => {
    expect(await userCount()).toBe(0);
  });
});

describe('checkAdminPassword / validateConfig', () => {
  test('accepts a strong password', () => expect(checkAdminPassword(STRONG_PW)).toBeNull());
  test('rejects non-strings', () => expect(checkAdminPassword(undefined)).toMatch(/missing/));

  test('production refuses a missing or placeholder JWT_SECRET', () => {
    expect(validateConfig({ NODE_ENV: 'production' }).errors.join()).toMatch(/JWT_SECRET/);
    const env = { NODE_ENV: 'production', DB_HOST: 'h', DB_NAME: 'n', DB_USER: 'u', DB_PASSWORD: 'p' };
    expect(validateConfig({ ...env, JWT_SECRET: 'change_me_use_a_long_random_string_please_ok' }).errors.length).toBe(1);
    expect(validateConfig({ ...env, JWT_SECRET: 'short' }).errors.length).toBe(1);
    expect(validateConfig({ ...env, JWT_SECRET: 'k3J9xQ2mVb7LpT4zR8wYc1NdHs6GfA0eUiO5' }).errors).toEqual([]);
  });

  test('development only warns about a placeholder secret, but still requires one', () => {
    expect(validateConfig({ NODE_ENV: 'development', JWT_SECRET: 'change_me' }).errors).toEqual([]);
    expect(validateConfig({ NODE_ENV: 'development' }).errors.join()).toMatch(/JWT_SECRET/);
  });
});
