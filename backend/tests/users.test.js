const request = require('supertest');
const { app } = require('../src/server');
const { resetUsers, createUser, tokenFor, auth, pgPool, close } = require('./helpers/db');

const api = () => request(app);

beforeEach(resetUsers);
afterAll(close);

const as = async (level, ventureId = null) => {
  const user = await createUser({ level, ventureId });
  return { user, headers: auth(await tokenFor(user)) };
};

describe('last Super Admin protection (HTTP)', () => {
  test('the only L1 cannot delete themselves, demote or deactivate themselves', async () => {
    const { user, headers } = await as(1);
    expect((await api().delete(`/api/team-members/${user.id}`).set(headers)).status).toBe(403);
    expect((await api().put(`/api/team-members/${user.id}`).set(headers).send({ access_level: 2 })).status).toBe(403);
    expect((await api().put(`/api/team-members/${user.id}`).set(headers).send({ is_active: false })).status).toBe(403);
    const { rows } = await pgPool.query('SELECT access_level, is_active FROM users WHERE id = $1', [user.id]);
    expect(rows[0]).toEqual({ access_level: 1, is_active: true });
  });

  test('with two L1s, one can delete the other but never the last one', async () => {
    const a = await as(1);
    const b = await as(1);
    expect((await api().delete(`/api/team-members/${b.user.id}`).set(a.headers)).status).toBe(200);
    // a is now the last one; a second L1 cannot exist to delete it, and self-delete is refused
    expect((await api().delete(`/api/team-members/${a.user.id}`).set(a.headers)).status).toBe(403);
  });

  test('concurrent demotion of both L1s leaves at least one', async () => {
    const a = await as(1);
    const b = await as(1);
    const [r1, r2] = await Promise.all([
      api().put(`/api/team-members/${b.user.id}`).set(a.headers).send({ access_level: 2 }),
      api().put(`/api/team-members/${a.user.id}`).set(b.headers).send({ access_level: 2 }),
    ]);
    // Serialised: whoever goes first wins; the demoted one is then L2 and may no longer touch an L1.
    expect([r1.status, r2.status].sort()).toEqual([200, 403]);
    const { rows } = await pgPool.query('SELECT count(*)::int AS n FROM users WHERE access_level = 1');
    expect(rows[0].n).toBe(1);
  });
});

describe('ceilings (HTTP)', () => {
  test('an L3 admin cannot create an L3 or L1, nor a user in another venture', async () => {
    const admin = await as(3, 1);
    const body = (over) => ({ full_name: 'N', email: `n${Math.random().toString(36).slice(2)}@dropwing.in`, password: 'Abcdefgh1!', access_level: 5, venture_id: 1, ...over });
    expect((await api().post('/api/team-members').set(admin.headers).send(body({ access_level: 3 }))).status).toBe(403);
    expect((await api().post('/api/team-members').set(admin.headers).send(body({ access_level: 1 }))).status).toBe(403);
    // venture in the body is ignored for L3: user lands in the admin's own venture
    const res = await api().post('/api/team-members').set(admin.headers).send(body({ venture_id: 2 }));
    expect(res.status).toBe(201);
    const { rows } = await pgPool.query('SELECT venture_id, access_level FROM users WHERE id = $1', [res.body.userId]);
    expect(rows[0]).toEqual({ venture_id: 1, access_level: 5 });
  });

  test('an L3 admin cannot edit or delete a user in another venture, or promote past themselves', async () => {
    const admin = await as(3, 1);
    const other = await createUser({ level: 7, ventureId: 2 });
    const mine = await createUser({ level: 7, ventureId: 1 });
    expect((await api().put(`/api/team-members/${other.id}`).set(admin.headers).send({ full_name: 'x' })).status).toBe(403);
    expect((await api().delete(`/api/team-members/${other.id}`).set(admin.headers)).status).toBe(403);
    expect((await api().put(`/api/team-members/${mine.id}`).set(admin.headers).send({ access_level: 2 })).status).toBe(403);
    expect((await api().put(`/api/team-members/${mine.id}`).set(admin.headers).send({ venture_id: 2 })).status).toBe(403);
    expect((await api().put(`/api/team-members/${mine.id}`).set(admin.headers).send({ access_level: 5 })).status).toBe(200);
  });

  test('a manager (L5) cannot manage users at all', async () => {
    const mgr = await as(5, 1);
    const staff = await createUser({ level: 7, ventureId: 1 });
    expect((await api().put(`/api/team-members/${staff.id}`).set(mgr.headers).send({ full_name: 'x' })).status).toBe(403);
    expect((await api().delete(`/api/team-members/${staff.id}`).set(mgr.headers)).status).toBe(403);
    expect((await api().post('/api/team-members').set(mgr.headers).send({})).status).toBe(403);
  });

  test('changing a user level or venture revokes their sessions; denials are audited', async () => {
    const md = await as(2);
    const victim = await createUser({ level: 7, ventureId: 1 });
    const vheaders = auth(await tokenFor(victim));
    expect((await api().get('/api/auth/me').set(vheaders)).status).toBe(200);
    expect((await api().put(`/api/team-members/${victim.id}`).set(md.headers).send({ venture_id: 2 })).status).toBe(200);
    expect((await api().get('/api/auth/me').set(vheaders)).status).toBe(401);

    await api().put(`/api/team-members/${md.user.id}`).set(md.headers).send({ access_level: 1 });
    const { rows } = await pgPool.query("SELECT action_type FROM audit_logs ORDER BY id");
    const actions = rows.map((r) => r.action_type);
    expect(actions).toContain('UPDATE_USER');
    expect(actions).toContain('USER_MANAGE_DENIED');
  });

  test('clients cannot list staff', async () => {
    const client = await as(9, 1);
    await createUser({ level: 7, ventureId: 1 });
    const res = await api().get('/api/team-members').set(client.headers);
    expect(res.body.data).toEqual([]);
  });

  test('venture-scoped users only list their own venture; L2 lists all', async () => {
    const staff = await as(6, 1);
    await createUser({ level: 7, ventureId: 2 });
    const md = await as(2);
    const own = await api().get('/api/team-members').set(staff.headers);
    expect(own.body.data.every((u) => u.venture_id === 1 || u.access_level <= 2)).toBe(true); // own venture + global leadership
    const all = await api().get('/api/team-members').set(md.headers);
    expect(all.body.data.length).toBeGreaterThanOrEqual(3);
  });
});
