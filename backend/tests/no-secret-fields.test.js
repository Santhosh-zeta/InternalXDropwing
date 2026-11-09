/**
 * Sweep: call every GET route of the REAL app as a Super Admin (the most privileged
 * caller) against seeded demo data, and fail if any JSON response contains a key that
 * names a credential: password hashes, OTP state, reset/invite tokens, session token hashes.
 * Routes with :params are tried with every id in the demo data.
 */
const request = require('supertest');
const { app } = require('../src/server');
const { setup } = require('./helpers/app');

const FORBIDDEN = /^(password|password_hash|passwordhash|otp|otp_expires_at|otp_attempts|otp_locked_until|reset_password_token|reset_password_expires_at|token_hash|tokenhash|secret|jwt|refresh_token|access_token|invite_token)$/i;

/** Express 4 router -> [{ method, path }] for every route, including mounted routers. */
const collectRoutes = (stack, prefix = '') => {
  const routes = [];
  for (const layer of stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) routes.push({ method, path: prefix + layer.route.path });
    } else if (layer.name === 'router' && layer.handle.stack) {
      const m = layer.regexp.toString()
        .replace('\\/?', '').replace('(?=\\/|$)', '$')
        .match(/^\/\^((?:\\[.*+?^${}()|[\]\\/]|[^.*+?^${}()|[\]\\/])*)\$\//);
      const mount = m ? m[1].replace(/\\\//g, '/') : '';
      routes.push(...collectRoutes(layer.handle.stack, prefix + mount));
    }
  }
  return routes;
};

const findForbidden = (value, path = '$', hits = []) => {
  if (Array.isArray(value)) value.forEach((v, i) => findForbidden(v, `${path}[${i}]`, hits));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN.test(k)) hits.push(`${path}.${k}`);
      findForbidden(v, `${path}.${k}`, hits);
    }
  }
  return hits;
};

let t;
beforeAll(async () => { t = await setup(); });
afterAll(async () => { await t.close(); });

test('no GET endpoint returns password hashes, OTP, reset/invite tokens or session hashes', async () => {
  const stack = app._router.stack;
  const getRoutes = collectRoutes(stack).filter((r) => r.method === 'get' && r.path.startsWith('/api/'));
  expect(getRoutes.length).toBeGreaterThan(30); // the walk really found the API

  const admin = await t.as('l1');
  const ids = [...new Set([
    ...Object.values(t.ctx.users), ...Object.values(t.ctx.projects), ...Object.values(t.ctx.tasks),
    ...Object.values(t.ctx.documents), ...Object.values(t.ctx.messages || {}),
  ])].filter((v) => Number.isInteger(v)).slice(0, 80);

  const failures = [];
  let jsonResponses = 0;
  for (const { path } of getRoutes) {
    const params = path.match(/:[A-Za-z]+/g) || [];
    const urls = params.length
      ? ids.map((id) => params.reduce((p, name) => p.replace(name, id), path))
      : [path];
    for (const url of urls) {
      const res = await request(app).get(url).set('Authorization', `Bearer ${admin.token}`);
      if (!/json/.test(res.headers['content-type'] || '')) continue;
      jsonResponses += 1;
      const hits = findForbidden(res.body);
      if (hits.length) failures.push(`${url} -> ${hits.slice(0, 3).join(', ')}`);
    }
  }
  expect(jsonResponses).toBeGreaterThan(50);
  expect(failures).toEqual([]);
});

test('the detector itself catches a leak', () => {
  expect(findForbidden({ data: [{ id: 1, password_hash: 'x' }, { nested: { otp: '1' } }] })).toEqual(['$.data[0].password_hash', '$.data[1].nested.otp']);
  expect(findForbidden({ data: [{ id: 1, full_name: 'ok' }] })).toEqual([]);
});
