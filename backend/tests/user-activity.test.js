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

describe('GET /api/team-members/:id activity is scoped to the viewer', () => {
  test('an L3 viewing the Managing Director sees only tasks in their own venture', async () => {
    const md = await createUser({ level: 2 });
    const admin1 = await as(3, 1);
    const mk = async (title, ventureId) => {
      const { rows } = await pgPool.query(
        'INSERT INTO tasks (title, status, assigned_to, assigned_by, venture_id) VALUES ($1, $2, $3, $3, $4) RETURNING id',
        [title, 'pending', md.id, ventureId]
      );
      await pgPool.query('INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)', [rows[0].id, md.id]);
    };
    await mk('venture-one task', 1);
    await mk('venture-two secret', 2);
    const res = await api().get(`/api/team-members/${md.id}`).set(admin1.headers);
    expect(res.status).toBe(200);
    expect(res.body.data.activity.map((a) => a.title)).toEqual(['venture-one task']);
    const l1 = await as(1);
    const full = await api().get(`/api/team-members/${md.id}`).set(l1.headers);
    expect(full.body.data.activity.map((a) => a.title).sort()).toEqual(['venture-one task', 'venture-two secret']);
  });
});
