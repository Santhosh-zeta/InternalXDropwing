/**
 * Plug-and-play guards: the configuration self-check (report shape, L1/L2 only, no secret values),
 * the scheduler default, and "every env var the code reads is documented in .env.example".
 */
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { setup, buildApp } = require('./helpers/app');
const { runSelfCheck, logSelfCheck } = require('../src/config/selfcheck');
const { schedulerEnabled } = require('../src/services/scheduler');

jest.mock('../src/services/email.service', () => ({
  transporter: { verify: jest.fn().mockResolvedValue(true) },
  sendEmail: async () => ({ success: true }),
}));

let t;
const A = {};
beforeAll(async () => {
  await require('../src/migrate').migrate({ log: { info: () => {} } }); // the test DB is built from init SQL
  t = await setup();
  for (const k of ['l1', 'l2', 'dd.l3', 'dd.l5', 'dd.client']) A[k] = await t.as(k);
});
afterAll(() => t.close());

const byId = (report) => Object.fromEntries(report.checks.map((c) => [c.id, c]));
const SECRET = 'sk-ant-VERY-SECRET-VALUE-1234567890';

describe('runSelfCheck', () => {
  const env = {
    NODE_ENV: 'production',
    JWT_SECRET: 'x'.repeat(48),
    FRONTEND_URL: 'https://internalx.example.com',
    TRUST_PROXY: '1',
    ANTHROPIC_API_KEY: SECRET,
    SMTP_HOST: 'smtp.example.com',
    SMTP_USER: 'u',
    SMTP_PASS: 'p-secret-pass',
    ENABLE_SCHEDULER: 'true',
  };

  test('reports per-setting status with a fix hint and never leaks values', async () => {
    const r = await runSelfCheck({ env });
    const c = byId(r);
    expect(c.jwt_secret.status).toBe('ok');
    expect(c.database.status).toBe('ok');
    expect(c.migrations.status).toBe('ok');
    expect(c.bootstrap_admin.status).toBe('ok'); // demo data has an L1
    expect(c.smtp.status).toBe('ok');
    expect(c.ai.status).toBe('ok');
    expect(c.uploads.status).toBe('ok');
    expect(c.google.status).toBe('warn');
    expect(c.google.fix).toMatch(/GOOGLE_CLIENT_ID/);
    const text = JSON.stringify(r);
    for (const v of [SECRET, env.SMTP_PASS, env.JWT_SECRET]) expect(text).not.toContain(v);
    expect(r.summary.ok + r.summary.warn + r.summary.missing).toBe(r.checks.length);
  });

  test('flags what is missing in production', async () => {
    const r = await runSelfCheck({ env: { NODE_ENV: 'production', JWT_SECRET: 'change_me' }, verify: false });
    const c = byId(r);
    expect(c.jwt_secret.status).toBe('missing');
    expect(c.smtp.status).toBe('missing');
    expect(c.frontend_url.status).toBe('missing');
    expect(c.trust_proxy.status).toBe('warn');
    expect(c.ai.status).toBe('warn');
    expect(c.ai.fix).toMatch(/ANTHROPIC_API_KEY/);
    for (const x of r.checks.filter((k) => k.status !== 'ok')) expect(x.fix.length).toBeGreaterThan(0);
  });

  test('SMTP that fails verify() is reported as missing, not thrown', async () => {
    const { verifySmtp } = require('../src/config/selfcheck');
    await verifySmtp({ verify: async () => { throw Object.assign(new Error('x'), { code: 'ECONNREFUSED' }); } }, { force: true });
    const r = await runSelfCheck({ env, transporter: { verify: async () => { throw Object.assign(new Error('boom'), { code: 'EAUTH' }); } } });
    expect(byId(r).smtp.status).toBe('missing');
    expect(byId(r).smtp.detail).toMatch(/EAUTH|ECONNREFUSED/);
    await verifySmtp({ verify: async () => true }, { force: true });
  });

  test('logSelfCheck prints one block', () => {
    const lines = [];
    logSelfCheck({ summary: { ok: 1, warn: 1, missing: 0 }, checks: [{ label: 'A', status: 'ok', detail: 'fine' }, { label: 'B', status: 'warn', detail: 'meh', fix: 'do x' }] }, { info: (m) => lines.push(m) });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/\[WARN {3}\] B: meh -> do x/);
  });
});

describe('GET /api/admin/system-status', () => {
  const mounted = () => {
    const { app } = buildApp();
    app.use('/api/admin', require('../src/routes/admin.routes'));
    return app;
  };
  const get = (key) => request(mounted()).get('/api/admin/system-status?verify=false').set('Authorization', `Bearer ${A[key].token}`);

  test('L1 and L2 get the report', async () => {
    for (const k of ['l1', 'l2']) {
      const res = await get(k);
      expect(res.status).toBe(200);
      expect(res.body.data.checks.length).toBeGreaterThan(8);
    }
  });

  test('everyone else is refused', async () => {
    for (const k of ['dd.l3', 'dd.l5', 'dd.client']) expect((await get(k)).status).toBe(403);
    expect((await request(mounted()).get('/api/admin/system-status')).status).toBe(401);
  });
});

describe('scheduler default', () => {
  test('on in production, off elsewhere, ENABLE_SCHEDULER wins', () => {
    expect(schedulerEnabled({ NODE_ENV: 'production' })).toBe(true);
    expect(schedulerEnabled({ NODE_ENV: 'production', ENABLE_SCHEDULER: 'false' })).toBe(false);
    expect(schedulerEnabled({ NODE_ENV: 'development' })).toBe(false);
    expect(schedulerEnabled({ NODE_ENV: 'development', ENABLE_SCHEDULER: 'true' })).toBe(true);
    expect(schedulerEnabled({})).toBe(false);
  });
});

describe('.env.example documents every variable the backend reads', () => {
  const root = path.join(__dirname, '..');
  const files = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) files.push(p);
  });
  walk(path.join(root, 'src'));
  walk(path.join(root, 'scripts'));

  const used = new Set();
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const re of [/process\.env\.([A-Z][A-Z0-9_]*)/g, /\benv\.([A-Z][A-Z0-9_]*)/g, /\b(?:int|hourEnv)\(\s*'([A-Z][A-Z0-9_]*)'/g]) {
      for (const m of src.matchAll(re)) used.add(m[1]);
    }
  }
  const documented = new Set(
    [...fs.readFileSync(path.join(root, '.env.example'), 'utf8').matchAll(/^#?\s*([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1])
  );

  test('found the variables the code reads', () => {
    expect(used.has('JWT_SECRET')).toBe(true);
    expect(used.has('DIGEST_HOUR')).toBe(true);
    expect(used.has('ASSISTANT_DAILY_TOKEN_CAP')).toBe(true);
  });

  test('every one appears in backend/.env.example', () => {
    const missing = [...used].filter((v) => !documented.has(v)).sort();
    expect(missing).toEqual([]);
  });
});
