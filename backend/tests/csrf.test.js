const request = require('supertest');
const { app } = require('../src/server');
const { resetUsers, createUser, tokenFor, pgPool, close } = require('./helpers/db');

beforeEach(resetUsers);
afterAll(close);

const mkCookieUser = async () => {
  const user = await createUser({ level: 7, ventureId: 1 });
  return { user, cookie: `internalx_token=${await tokenFor(user)}` };
};
const post = (cookie) => request(app).put('/api/notifications/preferences').set('Cookie', cookie).set('Host', 'app.example.com');

describe('CSRF guard on cookie-authenticated state-changing requests', () => {
  test('a foreign Origin is refused, the same Origin is accepted', async () => {
    const { cookie } = await mkCookieUser();
    expect((await post(cookie).set('Origin', 'https://evil.example')).status).toBe(403);
    expect((await post(cookie).set('Origin', 'https://app.example.com')).status).not.toBe(403);
  });

  test('Sec-Fetch-Site decides when there is no Origin', async () => {
    const { cookie } = await mkCookieUser();
    expect((await post(cookie).set('Sec-Fetch-Site', 'cross-site')).status).toBe(403);
    expect((await post(cookie).set('Sec-Fetch-Site', 'same-site')).status).toBe(403);
    expect((await post(cookie).set('Sec-Fetch-Site', 'same-origin')).status).not.toBe(403);
  });

  test('with neither header, only JSON or multipart passes (a plain form cannot send these)', async () => {
    const { cookie } = await mkCookieUser();
    expect((await post(cookie).type('form').send({ a: 1 })).status).toBe(403);
    expect((await post(cookie).send({ a: 1 })).status).not.toBe(403); // JSON
  });

  test('bearer-token and cookie-less requests are exempt; GET is never blocked', async () => {
    const { user } = await mkCookieUser();
    const token = await tokenFor(user);
    const r = await request(app).put('/api/notifications/preferences').set('Authorization', `Bearer ${token}`)
      .set('Origin', 'https://evil.example');
    expect(r.status).not.toBe(403);
    expect((await request(app).post('/api/auth/login').set('Origin', 'https://evil.example').send({})).status).toBe(400);
    expect((await request(app).get('/api/notifications').set('Cookie', `internalx_token=${token}`).set('Origin', 'https://evil.example')).status).toBe(200);
  });

  test('urlencoded bodies are no longer parsed', async () => {
    const res = await request(app).post('/api/auth/login').type('form').send({ email: 'a@b.c', password: 'x' });
    expect(res.status).toBe(400);
  });
});
