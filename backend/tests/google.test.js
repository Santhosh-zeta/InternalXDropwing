const mockVerify = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: (...a) => mockVerify(...a) })),
}));

const request = require('supertest');
const { app } = require('../src/server');
const { resetUsers, createUser, pgPool, close } = require('./helpers/db');

const payload = (over = {}) => ({
  getPayload: () => ({ email: 'someone@dropwing.in', email_verified: true, name: 'Some One', picture: 'https://lh3.googleusercontent.com/x', ...over }),
});
const login = (credential = 'google-id-token') => request(app).post('/api/auth/google-login').send({ credential });
const userCount = async () => (await pgPool.query('SELECT count(*)::int AS n FROM users')).rows[0].n;

beforeEach(async () => {
  await resetUsers();
  mockVerify.mockReset();
});
afterAll(close);

describe('POST /api/auth/google-login', () => {
  test('requires a credential', async () => {
    expect((await request(app).post('/api/auth/google-login').send({})).status).toBe(400);
  });

  test('refuses outright when GOOGLE_CLIENT_ID is not configured', async () => {
    const saved = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    try {
      expect((await login()).status).toBe(503);
      expect(mockVerify).not.toHaveBeenCalled();
    } finally {
      process.env.GOOGLE_CLIENT_ID = saved;
    }
  });

  test('verifies the token against OUR client id', async () => {
    mockVerify.mockResolvedValue(payload());
    await createUser({ level: 7, ventureId: 1, email: 'someone@dropwing.in' });
    await login();
    expect(mockVerify).toHaveBeenCalledWith({ idToken: 'google-id-token', audience: 'test-google-client-id' });
  });

  test('an invalid Google token is a 401', async () => {
    mockVerify.mockRejectedValue(new Error('bad signature'));
    expect((await login()).status).toBe(401);
  });

  test('rejects an unverified Google email', async () => {
    mockVerify.mockResolvedValue(payload({ email_verified: false }));
    await createUser({ level: 7, ventureId: 1, email: 'someone@dropwing.in' });
    expect((await login()).status).toBe(401);
    mockVerify.mockResolvedValue(payload({ email_verified: undefined }));
    expect((await login()).status).toBe(401);
  });

  test('rejects an email outside the allowed domains, even if a row exists', async () => {
    mockVerify.mockResolvedValue(payload({ email: 'someone@gmail.com' }));
    await createUser({ level: 7, ventureId: 1, email: 'someone@gmail.com' });
    const res = await login();
    expect(res.status).toBe(403);
    expect(res.body.data).toBeUndefined();
  });

  test('invite-only: an allowed, verified email with no user row gets 403 and NO account is created', async () => {
    mockVerify.mockResolvedValue(payload());
    const res = await login();
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/invite/i);
    expect(await userCount()).toBe(0);
  });

  test('an existing user signs in with their stored level, and is marked verified (no ReferenceError)', async () => {
    mockVerify.mockResolvedValue(payload());
    const u = await createUser({ level: 5, ventureId: 2, email: 'someone@dropwing.in' });
    await pgPool.query('UPDATE users SET is_verified = FALSE WHERE id = $1', [u.id]);
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.data.user.accessLevel).toBe(5);
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    expect(res.headers['set-cookie'][0]).toMatch(/SameSite=Strict/);
    const { rows } = await pgPool.query('SELECT is_verified, avatar_url FROM users WHERE id = $1', [u.id]);
    expect(rows[0].is_verified).toBe(true);
    expect(rows[0].avatar_url).toContain('googleusercontent');
  });

  test('a deactivated user cannot sign in via Google', async () => {
    mockVerify.mockResolvedValue(payload());
    await createUser({ level: 7, ventureId: 1, email: 'someone@dropwing.in', active: false });
    expect((await login()).status).toBe(403);
  });

  test('self-registration is limited to the same domain list', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ fullName: 'X', email: 'x@gmail.com', password: 'Abcdefgh1!' });
    expect(res.status).toBe(403);
  });
});
