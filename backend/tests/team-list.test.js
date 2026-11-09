const request = require('supertest');
const { app } = require('../src/server');
const { resetUsers, createUser, tokenFor, auth, close } = require('./helpers/db');

const api = () => request(app);
afterAll(close);

let u;
const list = async (user, qs = '') => (await api().get(`/api/team-members${qs}`).set(auth(await tokenFor(user)))).body.data;
const ids = (rows) => rows.map((r) => r.id).sort((a, b) => a - b);

beforeAll(async () => {
  await resetUsers();
  u = {
    l1: await createUser({ level: 1 }),
    l2: await createUser({ level: 2 }),
    admin1: await createUser({ level: 3, ventureId: 1 }),
    mgr1: await createUser({ level: 5, ventureId: 1 }),
    staff1: await createUser({ level: 7, ventureId: 1 }),
    staff1b: await createUser({ level: 7, ventureId: 1 }),
    intern1: await createUser({ level: 8, ventureId: 1 }),
    client1: await createUser({ level: 9, ventureId: 1 }),
    staff2: await createUser({ level: 7, ventureId: 2 }),
    client2: await createUser({ level: 9, ventureId: 2 }),
  };
});

describe('GET /api/team-members (also the DM picker data)', () => {
  test('venture staff (L6-L8) get own venture + global leadership, no clients, no other ventures', async () => {
    for (const who of [u.staff1, u.intern1]) {
      const got = ids(await list(who));
      expect(got).toEqual(ids([u.l1, u.l2, u.admin1, u.mgr1, u.staff1, u.staff1b, u.intern1]));
      expect(got).not.toContain(u.client1.id);
      expect(got).not.toContain(u.staff2.id);
    }
  });

  test('search cannot be used to reach clients or other ventures', async () => {
    const rows = await list(u.staff1, '?search=Test');
    expect(rows.map((r) => r.id)).not.toContain(u.client1.id);
    expect(rows.map((r) => r.id)).not.toContain(u.staff2.id);
  });

  test('venture managers (L3-L5) still see their own clients for user management, never other ventures', async () => {
    for (const who of [u.admin1, u.mgr1]) {
      const got = ids(await list(who));
      expect(got).toContain(u.client1.id);
      expect(got).not.toContain(u.client2.id);
      expect(got).not.toContain(u.staff2.id);
    }
  });

  test('L1/L2 see everyone', async () => {
    expect(await list(u.l2)).toHaveLength(Object.keys(u).length);
  });

  test('clients get nothing', async () => {
    expect(await list(u.client1)).toEqual([]);
  });

  test('single-user lookup follows the same rule', async () => {
    const get = async (viewer, target) => api().get(`/api/team-members/${target.id}`).set(auth(await tokenFor(viewer)));
    expect((await get(u.staff1, u.staff1b)).status).toBe(200);
    expect((await get(u.staff1, u.l2)).status).toBe(200);
    expect((await get(u.staff1, u.client1)).status).toBe(403);
    expect((await get(u.staff1, u.staff2)).status).toBe(403);
    expect((await get(u.client1, u.staff1)).status).toBe(403);
    expect((await get(u.mgr1, u.client1)).status).toBe(200);
  });
});
