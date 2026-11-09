const request = require('supertest');
const { app } = require('../src/server');
const { resetUsers, createUser, tokenFor, auth, pgPool, close } = require('./helpers/db');

const api = () => request(app);
const NEW_PW = 'Brand-New-Pass-77!';

beforeEach(async () => {
  await resetUsers();
  delete process.env.ALLOW_SELF_REGISTRATION;
});
afterAll(close);

const as = async (level, ventureId = null) => {
  const user = await createUser({ level, ventureId });
  return { user, headers: auth(await tokenFor(user)) };
};

const tokenOf = (link) => new URL(link).searchParams.get('token');

describe('self-registration policy', () => {
  const body = () => ({ fullName: 'Pat Newcomer', email: 'pat@dropwing.in', password: NEW_PW });

  test('is disabled by default and config says so', async () => {
    expect((await api().get('/api/auth/config')).body.data.selfRegistration).toBe(false);
    const res = await api().post('/api/auth/register').send(body());
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/invitation only/i);
    expect((await pgPool.query('SELECT 1 FROM users')).rowCount).toBe(0);
  });

  test('when enabled: account is pending, inactive, venture-less and cannot sign in', async () => {
    process.env.ALLOW_SELF_REGISTRATION = 'true';
    expect((await api().get('/api/auth/config')).body.data.selfRegistration).toBe(true);
    const res = await api().post('/api/auth/register').send(body());
    expect(res.status).toBe(202);
    const { rows } = await pgPool.query("SELECT is_active, pending_approval, venture_id, access_level FROM users WHERE email = 'pat@dropwing.in'");
    expect(rows[0]).toEqual({ is_active: false, pending_approval: true, venture_id: null, access_level: 8 });
    const login = await api().post('/api/auth/login').send({ email: 'pat@dropwing.in', password: NEW_PW });
    expect(login.status).toBe(401);
    // same answer for an address that already exists: no account probing
    const again = await api().post('/api/auth/register').send(body());
    expect(again.status).toBe(202);
    expect(again.body).toEqual(res.body);
  });

  test('pending users are listed for L2 via ?pending=true, approved with a venture, never listed by default', async () => {
    process.env.ALLOW_SELF_REGISTRATION = 'true';
    await api().post('/api/auth/register').send(body());
    const md = await as(2);
    const admin = await as(3, 1);
    const pendingId = (await pgPool.query("SELECT id FROM users WHERE email = 'pat@dropwing.in'")).rows[0].id;

    const list = await api().get('/api/team-members?pending=true').set(md.headers);
    expect(list.body.data.map((u) => u.id)).toEqual([pendingId]);
    expect((await api().get('/api/team-members').set(md.headers)).body.data.map((u) => u.id)).not.toContain(pendingId);
    expect((await api().get('/api/team-members?pending=true').set(admin.headers)).body.data).toEqual([]);

    const noVenture = await api().put(`/api/team-members/${pendingId}`).set(md.headers).send({ is_active: true });
    expect(noVenture.status).toBe(400);
    const ok = await api().put(`/api/team-members/${pendingId}`).set(md.headers).send({ is_active: true, venture_id: 1 });
    expect(ok.status).toBe(200);
    const { rows } = await pgPool.query('SELECT is_active, pending_approval, venture_id FROM users WHERE id = $1', [pendingId]);
    expect(rows[0]).toEqual({ is_active: true, pending_approval: false, venture_id: 1 });
    expect((await api().get('/api/team-members?pending=true').set(md.headers)).body.data).toEqual([]);
  });
});

describe('invite flow', () => {
  const spies = [];
  afterEach(() => spies.splice(0).forEach((s) => s.mockRestore()));

  test('create returns a one-time link without SMTP, stores only a hash, never logs the link, and the user can set a password', async () => {
    const logged = [];
    for (const m of ['log', 'info', 'warn', 'error']) {
      spies.push(jest.spyOn(console, m).mockImplementation((...a) => logged.push(a.join(' '))));
    }
    const admin = await as(3, 1);
    const res = await api().post('/api/team-members').set(admin.headers)
      .send({ full_name: 'Ivy Invitee', email: 'ivy@dropwing.in', access_level: 6, venture_id: 2 });
    expect(res.status).toBe(201);
    expect(res.body.invite.emailed).toBe(false);
    const token = tokenOf(res.body.invite.link);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(res.body)).not.toMatch(/password_hash|tempPassword|temp_password/i);

    const { rows } = await pgPool.query("SELECT venture_id, reset_password_token AS t, reset_password_expires_at AS exp FROM users WHERE email = 'ivy@dropwing.in'");
    expect(rows[0].venture_id).toBe(1); // L3 always invites into their own venture
    expect(rows[0].t).not.toBe(token);
    const hours = (new Date(rows[0].exp) - Date.now()) / 3600000;
    expect(hours).toBeGreaterThan(71);
    expect(hours).toBeLessThanOrEqual(72.01);
    expect(logged.join('\n')).not.toContain(token);

    // the invitee sets a password with the link, once
    expect((await api().post('/api/auth/reset-password').send({ token, newPassword: NEW_PW })).status).toBe(200);
    expect((await api().post('/api/auth/reset-password').send({ token, newPassword: NEW_PW })).status).toBe(400);
    const login = await api().post('/api/auth/login').send({ email: 'ivy@dropwing.in', password: NEW_PW });
    expect(login.status).toBe(200);
    expect(login.body.requiresOTP).toBe(true);
  });

  test('no invitation password field is needed or accepted as a way in', async () => {
    const admin = await as(3, 1);
    const res = await api().post('/api/team-members').set(admin.headers)
      .send({ full_name: 'Sam', email: 'sam@dropwing.in', access_level: 7, password: 'Chosen-By-Admin-1!' });
    expect(res.status).toBe(201);
    const login = await api().post('/api/auth/login').send({ email: 'sam@dropwing.in', password: 'Chosen-By-Admin-1!' });
    expect(login.status).toBe(401);
  });

  test('canManageUser rules still apply to invites', async () => {
    const admin = await as(3, 1);
    const res = await api().post('/api/team-members').set(admin.headers)
      .send({ full_name: 'Peer', email: 'peer@dropwing.in', access_level: 3 });
    expect(res.status).toBe(403);
    expect((await pgPool.query("SELECT 1 FROM users WHERE email = 'peer@dropwing.in'")).rowCount).toBe(0);
  });

  test('re-invite: only for accounts that never signed in, within management scope', async () => {
    const admin = await as(3, 1);
    const other = await as(3, 2);
    const fresh = await createUser({ level: 7, ventureId: 1 });
    const used = await createUser({ level: 7, ventureId: 1 });
    await pgPool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [used.id]);

    const ok = await api().post(`/api/team-members/${fresh.id}/invite`).set(admin.headers);
    expect(ok.status).toBe(200);
    expect(tokenOf(ok.body.invite.link)).toMatch(/^[0-9a-f]{64}$/);
    expect((await api().post(`/api/team-members/${used.id}/invite`).set(admin.headers)).status).toBe(409);
    expect((await api().post(`/api/team-members/${fresh.id}/invite`).set(other.headers)).status).toBe(403);
    const staff = await as(7, 1);
    expect((await api().post(`/api/team-members/${fresh.id}/invite`).set(staff.headers)).status).toBe(403);
  });
});
