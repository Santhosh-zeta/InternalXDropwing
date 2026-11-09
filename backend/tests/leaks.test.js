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

describe('pickers', () => {
  test('/ventures: internal users get the list, clients only ventures of their projects', async () => {
    const staff = await as(7, 1);
    expect((await api().get('/api/team-members/ventures').set(staff.headers)).body.data.length).toBeGreaterThan(1);

    const client = await as(9, 1);
    expect((await api().get('/api/team-members/ventures').set(client.headers)).body.data).toEqual([]);
    const owner = await createUser({ level: 3, ventureId: 2 });
    const { rows } = await pgPool.query(
      "INSERT INTO projects (name, venture_id, created_by) VALUES ('p', 2, $1) RETURNING id", [owner.id]);
    await pgPool.query('INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)', [rows[0].id, client.user.id]);
    const mine = (await api().get('/api/team-members/ventures').set(client.headers)).body.data;
    expect(mine.map((v) => v.id)).toEqual([2]);
  });

  test('/access-levels is internal only', async () => {
    const staff = await as(7, 1);
    const client = await as(9, 1);
    expect((await api().get('/api/team-members/access-levels').set(staff.headers)).status).toBe(200);
    expect((await api().get('/api/team-members/access-levels').set(client.headers)).status).toBe(403);
    expect((await api().get('/api/team-members/access-levels')).status).toBe(401);
  });
});

describe('platform-metrics recentActivity', () => {
  test('only level <= 5 see it', async () => {
    const mgr = await as(5, 1);
    const staff = await as(7, 1);
    await pgPool.query(
      "INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id) VALUES ($1, 'UPDATE_USER', 'user', 1)", [mgr.user.id]);
    const m = (await api().get('/api/platform-metrics').set(mgr.headers));
    expect(m.status).toBe(200);
    expect(m.body.data.recentActivity.length).toBe(1);
    const s = (await api().get('/api/platform-metrics').set(staff.headers));
    expect(s.body.data.recentActivity).toEqual([]);
  });
});

describe('/api/ready', () => {
  test('never names migrations to an anonymous caller', async () => {
    await require('../src/migrate').migrate({ log: { info: () => {} } });
    await pgPool.query("DELETE FROM schema_migrations WHERE version = '0006'");
    const res = await api().get('/api/ready');
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toMatch(/0006|\.sql|pending/);
    await require('../src/migrate').migrate({ log: { info: () => {} } });
  });
});
