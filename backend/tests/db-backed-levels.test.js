/**
 * Authorisation uses the level stored in the database, never the JWT claim,
 * so a demoted user with a still-valid token loses access at once (also on
 * other replicas whose session cache has not expired yet).
 */
const request = require('supertest');
const { app } = require('../src/server');
const { resetUsers, createUser, tokenFor, auth, pgPool, close } = require('./helpers/db');

beforeEach(resetUsers);
afterAll(close);

// token minted while the user was L3, then the user is demoted in the DB only
const demoted = async () => {
  const user = await createUser({ level: 3, ventureId: 1 });
  const headers = auth(await tokenFor(user));
  await pgPool.query('UPDATE users SET access_level = 8 WHERE id = $1', [user.id]);
  return { user, headers };
};

test('a stale L3 token cannot create/update/delete users after demotion', async () => {
  const { user, headers } = await demoted();
  const victim = await createUser({ level: 8, ventureId: 1 });
  const api = () => request(app);
  expect((await api().post('/api/team-members').set(headers).send({
    full_name: 'X Y', email: 'x.y@dropwing.in', access_level: 8, venture_id: 1,
  })).status).toBe(403);
  expect((await api().put(`/api/team-members/${victim.id}`).set(headers).send({ full_name: 'Hacked' })).status).toBe(403);
  expect((await api().delete(`/api/team-members/${victim.id}`).set(headers)).status).toBe(403);
  expect((await api().post(`/api/team-members/${victim.id}/invite`).set(headers)).status).toBe(403);
  expect(user.access_level).toBe(3); // the claim in the token really is stale
});

test('a stale L3 token cannot create projects or delete tasks after demotion', async () => {
  const { headers } = await demoted();
  expect((await request(app).post('/api/projects').set(headers).send({ name: 'P' })).status).toBe(403);
  expect((await request(app).delete('/api/tasks/1').set(headers)).status).toBe(403);
});

test('the team list follows the stored level and venture, not the token', async () => {
  const user = await createUser({ level: 3, ventureId: 1 });
  const headers = auth(await tokenFor(user));
  await createUser({ level: 7, ventureId: 2 });
  await pgPool.query('UPDATE users SET access_level = 9 WHERE id = $1', [user.id]);
  const res = await request(app).get('/api/team-members').set(headers);
  expect(res.body.data).toEqual([]); // now a client: no directory
});
