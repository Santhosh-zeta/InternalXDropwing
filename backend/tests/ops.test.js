const request = require('supertest');
const pino = require('pino');
const { app } = require('../src/server');
const { corsOrigins, trustProxySetting, cookieSecure, validateConfig } = require('../src/config/env');
const { REDACT_PATHS } = require('../src/utils/logger');
const { pgPool } = require('./helpers/db');

afterAll(() => pgPool.end());

describe('health and readiness', () => {
  test('/api/health is liveness only', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('/api/ready checks the database and migrations', async () => {
    // the test database is built from init SQL, so migrations are pending until applied once
    await require('../src/migrate').migrate({ log: { info: () => {} } });
    const res = await request(app).get('/api/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready', database: 'connected', migrations: 'up_to_date' });
  });

  test('/api/ready is 503 with a pending migration', async () => {
    await pgPool.query("DELETE FROM schema_migrations WHERE version = '0006'");
    const res = await request(app).get('/api/ready');
    expect(res.status).toBe(503);
    expect(res.body.pending).toEqual(['0006_users_pending_approval.sql']);
    await require('../src/migrate').migrate({ log: { info: () => {} } });
  });
});

describe('request ids and CORS', () => {
  test('a request id is minted and echoed; a sane inbound one is reused; a hostile one is replaced', async () => {
    const minted = await request(app).get('/api/health');
    expect(minted.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    const reused = await request(app).get('/api/health').set('X-Request-Id', 'proxy-req-12345');
    expect(reused.headers['x-request-id']).toBe('proxy-req-12345');
    const hostile = await request(app).get('/api/health').set('X-Request-Id', '<script>alert(1)</script>');
    expect(hostile.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('CORS only answers for the configured origin', async () => {
    const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    const other = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('security headers are present', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toMatch(/default-src 'self'/);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('env helpers', () => {
  test('corsOrigins: list, FRONTEND_URL fallback, trailing slashes', () => {
    expect(corsOrigins({ CORS_ORIGINS: 'https://a.example/, https://b.example' })).toEqual(['https://a.example', 'https://b.example']);
    expect(corsOrigins({ FRONTEND_URL: 'https://app.example' })).toEqual(['https://app.example']);
    expect(corsOrigins({})).toEqual(['http://localhost:3000']);
  });

  test('trustProxySetting', () => {
    expect(trustProxySetting({})).toBe(false);
    expect(trustProxySetting({ TRUST_PROXY: '0' })).toBe(false);
    expect(trustProxySetting({ TRUST_PROXY: '1' })).toBe(1);
    expect(trustProxySetting({ TRUST_PROXY: 'true' })).toBe(true);
    expect(trustProxySetting({ TRUST_PROXY: 'loopback, 10.0.0.0/8' })).toBe('loopback, 10.0.0.0/8');
  });

  test('cookieSecure: on in production unless explicitly disabled', () => {
    expect(cookieSecure({ NODE_ENV: 'production' })).toBe(true);
    expect(cookieSecure({ NODE_ENV: 'production', COOKIE_SECURE: 'false' })).toBe(false);
    expect(cookieSecure({ NODE_ENV: 'development' })).toBe(false);
    expect(cookieSecure({ NODE_ENV: 'development', COOKIE_SECURE: 'true' })).toBe(true);
  });

  test('production requires FRONTEND_URL', () => {
    const base = { NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(48) + 'Q9', DB_HOST: 'h', DB_NAME: 'n', DB_USER: 'u', DB_PASSWORD: 'p' };
    expect(validateConfig(base).errors.join()).toMatch(/FRONTEND_URL/);
    expect(validateConfig({ ...base, FRONTEND_URL: 'https://app.example' }).errors).toEqual([]);
  });
});

describe('log redaction', () => {
  test('credentials never appear in log lines', () => {
    const lines = [];
    const log = pino({ redact: { paths: REDACT_PATHS, censor: '[redacted]' } }, { write: (l) => lines.push(l) });
    log.info({
      req: { headers: { authorization: 'Bearer SECRET-JWT', cookie: 'internalx_token=SECRET-COOKIE', 'x-ok': 'visible' } },
      body: { password: 'SECRET-PW', newPassword: 'SECRET-NPW', token: 'SECRET-TOKEN', otp: '123456' },
      invite: { link: 'http://x/reset-password?token=SECRET-LINK' },
    }, 'sample');
    const out = lines.join('');
    for (const secret of ['SECRET-JWT', 'SECRET-COOKIE', 'SECRET-PW', 'SECRET-NPW', 'SECRET-TOKEN', '123456', 'SECRET-LINK']) {
      expect(out).not.toContain(secret);
    }
    expect(out).toContain('visible');
  });
});
