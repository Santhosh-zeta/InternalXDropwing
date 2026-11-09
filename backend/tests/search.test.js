/** Full-text search: every hit comes from the caller's scope, enforced in SQL. */
const { setup } = require('./helpers/app');
const { toTsQuery } = require('../src/services/search.service');

let t;
let c;
const A = {};

beforeAll(async () => {
  t = await setup();
  c = t.ctx;
  for (const k of ['l1', 'l2', 'dd.l3', 'dd.l5', 'dd.l7', 'dd.l7b', 'dd.client', 'fx.l5', 'fx.l7', 'fx.client', 'client.other']) A[k] = await t.as(k);
});
afterAll(() => t.close());

const search = async (who, q) => {
  const res = await A[who].get(`/api/search?q=${encodeURIComponent(q)}`);
  expect(res.status).toBe(200);
  return res.body.data.groups;
};
const ids = (groups, type) => (groups[type] || []).map((h) => h.id);

describe('query building', () => {
  test('only letters and digits survive; prefix match per term', () => {
    expect(toTsQuery("red lo")).toBe('red:* & lo:*');
    expect(toTsQuery("a' | b:* ) & !c")).toBe('a:* & b:* & c:*');
    expect(toTsQuery('  ')).toBeNull();
    expect(toTsQuery('!!!')).toBeNull();
  });
});

describe('projects, tasks, documents', () => {
  test('a project member finds only their project, and prefixes work', async () => {
    const g = await search('dd.l7', 'alph');
    expect(ids(g, 'project')).toEqual([c.projects['dd.p1']]);
    expect(ids(await search('dd.l7', 'beta'), 'project')).toEqual([]); // not a member of Beta
    expect(ids(await search('dd.l5', 'beta'), 'project')).toEqual([c.projects['dd.p2']]);
  });

  test('venture admins see their venture, never another', async () => {
    const g = await search('dd.l5', 'alpha');
    expect(ids(g, 'project')).toEqual([c.projects['dd.p1']]);
    const fx = await search('fx.l5', 'alpha');
    expect(ids(fx, 'project')).toEqual([c.projects['fx.p1']]);
  });

  test('global users see every venture', async () => {
    for (const who of ['l1', 'l2']) {
      expect(ids(await search(who, 'alpha'), 'project')).toEqual(expect.arrayContaining([c.projects['dd.p1'], c.projects['fx.p1']]));
    }
  });

  test('tasks follow taskWhere', async () => {
    const mine = await search('dd.l7', 'chore');
    expect(ids(mine, 'task')).toEqual([]); // the l7b chore belongs to someone else
    expect(ids(await search('dd.l7b', 'chore'), 'task')).toEqual([c.tasks['dd.t_l7b']]);
    expect(ids(await search('fx.l5', 'chore'), 'task')).toEqual([c.tasks['fx.t_l7b']]);
    expect(ids(await search('dd.client', 'deliverable'), 'task')).toEqual([c.tasks['dd.t_client']]);
    expect(ids(await search('dd.client', 'feature'), 'task')).toEqual([]); // internal task
  });

  test('documents follow documentWhere (clients: flagged only)', async () => {
    const client = await search('dd.client', 'dd');
    expect(ids(client, 'document')).toEqual([c.documents['dd.client'].id]);
    expect(ids(await search('dd.l7b', 'p1'), 'document')).toEqual([]);
    expect(ids(await search('fx.l7', 'internal'), 'document')).not.toContain(c.documents['dd.internal'].id);
    expect(ids(await search('dd.l5', 'internal'), 'document')).toContain(c.documents['dd.internal'].id);
  });

  test('a client without projects finds nothing at all', async () => {
    for (const q of ['alpha', 'dropwing', 'update', 'welcome']) expect(await search('client.other', q)).toEqual({});
  });
});

describe('users, announcements, chat', () => {
  test('staff search is internal and same-venture only', async () => {
    expect((await search('dd.l7', 'dropwing')).user.length).toBeGreaterThan(0);
    expect((await search('fx.l7', 'dropwing')).user).toBeUndefined();
    const demoDd = (await search('dd.l7', 'dropwing')).user.map((u) => u.id);
    expect(demoDd).not.toContain(c.users['dd.client']);
    expect((await search('dd.client', 'dropwing')).user).toBeUndefined();
    expect((await search('l1', 'fenixa')).user.length).toBeGreaterThan(0);
  });

  test('announcements: company-wide plus own venture; none for clients', async () => {
    const g = await search('dd.l7', 'update');
    expect(g.announcement.map((a) => a.title)).toEqual(['[demo] Dropwing Design Studio update']);
    expect((await search('dd.l7', 'all-hands')).announcement).toHaveLength(1);
    expect((await search('dd.client', 'update')).announcement).toBeUndefined();
  });

  test('chat: own venture channel and global, never another venture or someone else\'s DM', async () => {
    const dd = await search('dd.l7', 'team channel');
    expect(dd.message.map((m) => m.title)).toEqual(['[demo] Dropwing Design Studio team channel']);
    expect(dd.message[0].subtitle).toBe('Venture channel');
    expect((await search('dd.l7', 'fenixa')).message).toBeUndefined();
    expect((await search('dd.l7', 'welcome')).message).toHaveLength(1); // global channel
    expect((await search('dd.client', 'welcome')).message).toBeUndefined();
  });

  test('DMs are visible to the two participants only, even for L1', async () => {
    expect((await search('dd.l7', 'private note')).message).toHaveLength(1);
    expect((await search('dd.l5', 'private note')).message).toHaveLength(1);
    expect((await search('dd.l7b', 'private note')).message).toBeUndefined();
    expect((await search('l1', 'private note')).message).toBeUndefined();
    expect((await search('fx.l5', 'private note')).message.map((m) => m.title)).toHaveLength(1); // their own DM
  });
});

describe('input handling', () => {
  test('short or hostile queries are harmless', async () => {
    expect((await A.l1.get('/api/search?q=a')).body.data.groups).toEqual({});
    expect((await A.l1.get('/api/search')).body.data.groups).toEqual({});
    const res = await A.l1.get(`/api/search?q=${encodeURIComponent("'; DROP TABLE users; -- | & ! (")}`);
    expect(res.status).toBe(200);
    expect((await t.pool.query('SELECT 1 FROM users LIMIT 1')).rowCount).toBe(1);
  });

  test('needs a session', async () => {
    const request = require('supertest');
    expect((await request(t.app).get('/api/search?q=alpha')).status).toBe(401);
  });
});
