const crypto = require('crypto');
const request = require('supertest');
const { app } = require('../src/server');
const { hashOTP } = require('../src/utils/otp');
const { resetUsers, createUser, tokenFor, auth, pgPool, USER_PW, close } = require('./helpers/db');

beforeEach(resetUsers);
afterAll(close);

const setOtp = (userId, code = '123456', minutes = 10) =>
  pgPool.query(
    "UPDATE users SET otp = $1, otp_expires_at = NOW() + ($2 || ' minutes')::interval, otp_attempts = 0, otp_locked_until = NULL WHERE id = $3",
    [hashOTP(code), String(minutes), userId]
  );

describe('password reset', () => {
  const issueResetToken = async (userId) => {
    const token = crypto.randomBytes(32).toString('hex');
    await pgPool.query(
      "UPDATE users SET reset_password_token = $1, reset_password_expires_at = NOW() + interval '15 minutes' WHERE id = $2",
      [crypto.createHash('sha256').update(token).digest('hex'), userId]
    );
    return token;
  };

  test('revokes every existing session, changes the password and burns the token', async () => {
    const user = await createUser({ level: 7, ventureId: 1 });
    const t1 = await tokenFor(user);
    const t2 = await tokenFor(user);
    expect((await request(app).get('/api/auth/me').set(auth(t1))).status).toBe(200);

    const reset = await issueResetToken(user.id);
    const newPassword = 'Another-Str0ng-Pass!';
    expect((await request(app).post('/api/auth/reset-password').send({ token: reset, newPassword })).status).toBe(200);

    expect((await request(app).get('/api/auth/me').set(auth(t1))).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(auth(t2))).status).toBe(401);
    // the same reset link cannot be replayed
    expect((await request(app).post('/api/auth/reset-password').send({ token: reset, newPassword: 'Yet-Another-Pass1!' })).status).toBe(400);
    // new password works, old does not (first step of login)
    expect((await request(app).post('/api/auth/login').send({ email: user.email, password: newPassword })).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: user.email, password: USER_PW })).status).toBe(401);
  });

  test('reset tokens and OTPs are stored hashed, never in the clear', async () => {
    const user = await createUser({ level: 7, ventureId: 1 });
    const reset = await issueResetToken(user.id);
    await setOtp(user.id, '654321');
    const { rows } = await pgPool.query('SELECT otp, reset_password_token FROM users WHERE id = $1', [user.id]);
    expect(rows[0].reset_password_token).not.toBe(reset);
    expect(rows[0].otp).not.toBe('654321');
    expect(rows[0].otp).toHaveLength(64);
  });

  test('changing the password while signed in revokes other sessions but keeps this one', async () => {
    const user = await createUser({ level: 7, ventureId: 1 });
    const mine = await tokenFor(user);
    const stolen = await tokenFor(user);
    const res = await request(app).put('/api/team-members/me/password').set(auth(mine))
      .send({ currentPassword: USER_PW, newPassword: 'Brand-New-Pass-77!' });
    expect(res.status).toBe(200);
    expect((await request(app).get('/api/auth/me').set(auth(stolen))).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(auth(mine))).status).toBe(200);
  });
});

describe('login + OTP', () => {
  test('wrong password and unknown user get the same generic response', async () => {
    const user = await createUser({ level: 7, ventureId: 1 });
    const a = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Wrong-Password-1!' });
    const b = await request(app).post('/api/auth/login').send({ email: 'nobody@dropwing.in', password: 'Wrong-Password-1!' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body).toEqual(b.body);
  });

  test('the correct OTP completes login and sets a strict httpOnly cookie', async () => {
    const user = await createUser({ level: 7, ventureId: 1 });
    await setOtp(user.id);
    const res = await request(app).post('/api/auth/verify-otp').send({ email: user.email, otp: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.headers['set-cookie'][0]).toMatch(/internalx_token=.*HttpOnly.*SameSite=Strict/);
  });

  test('five wrong guesses lock the account: even the right code is then refused', async () => {
    const user = await createUser({ level: 7, ventureId: 1 });
    await setOtp(user.id);
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).post('/api/auth/verify-otp').send({ email: user.email, otp: '000000' });
      expect(res.status).toBe(401);
    }
    const right = await request(app).post('/api/auth/verify-otp').send({ email: user.email, otp: '123456' });
    expect(right.status).toBe(401);
    const { rows } = await pgPool.query('SELECT otp, otp_locked_until FROM users WHERE id = $1', [user.id]);
    expect(rows[0].otp).toBeNull();
    expect(new Date(rows[0].otp_locked_until).getTime()).toBeGreaterThan(Date.now());
    // a locked account is not given a fresh code either
    expect((await request(app).post('/api/auth/login').send({ email: user.email, password: USER_PW })).status).toBe(429);
  });

  test('parallel guesses cannot exceed the attempt budget', async () => {
    const user = await createUser({ level: 7, ventureId: 1 });
    await setOtp(user.id, '123456');
    const results = await Promise.all(
      Array.from({ length: 12 }, () => request(app).post('/api/auth/verify-otp').send({ email: user.email, otp: '000000' }))
    );
    expect(results.every((r) => r.status === 401)).toBe(true);
    const right = await request(app).post('/api/auth/verify-otp').send({ email: user.email, otp: '123456' });
    expect(right.status).toBe(401);
  });

  test('an expired OTP is refused with the same generic message', async () => {
    const user = await createUser({ level: 7, ventureId: 1 });
    await setOtp(user.id, '123456', -1);
    const res = await request(app).post('/api/auth/verify-otp').send({ email: user.email, otp: '123456' });
    expect(res.status).toBe(401);
    const unknown = await request(app).post('/api/auth/verify-otp').send({ email: 'nobody@dropwing.in', otp: '123456' });
    expect(unknown.body).toEqual(res.body);
  });

  test('error responses never leak internals', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{not json');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/SyntaxError|node_modules|at /);
  });
});

describe('removed surfaces', () => {
  test.each(['/api/database/tables', '/api/access-control', '/api/access-control/2fa-config', '/api/role-management'])(
    '%s is gone',
    async (url) => {
      const l1 = await createUser({ level: 1 });
      const res = await request(app).get(url).set(auth(await tokenFor(l1)));
      expect(res.status).toBe(404);
    }
  );
});
