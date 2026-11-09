/**
 * Cross-venture / cross-project IDOR matrix.
 *
 * Venture "dd" (Dropwing, the target) vs venture "fx" (Fenixa, the attacker's
 * venture). Each actor below is checked against the same dd resources:
 *
 *   L1, L2          global             everything
 *   dd.l3           L3 same venture    all dd data
 *   fx.l3           L3 other venture   nothing of dd
 *   dd.l7           L7 on project p1   p1 data, own timesheets
 *   dd.l7b          L7 NOT on p1       no p1 data; only own tasks/timesheets
 *   dd.client       L9 member of p1    client-safe p1 data only
 *   client.other    L9 non-member      nothing
 */
jest.mock('../src/services/email.service', () => new Proxy({}, { get: () => async () => ({ success: true }) }));
const { setup } = require('./helpers/app');

let t;
let c; // seeded ids
const A = {}; // actors

beforeAll(async () => {
  t = await setup();
  c = t.ctx;
  for (const k of ['l1', 'l2', 'dd.l3', 'dd.l4', 'dd.l5', 'dd.l6', 'dd.l7', 'dd.l7b', 'dd.l8', 'dd.client', 'fx.l3', 'fx.l4', 'fx.l5', 'fx.l7', 'fx.client', 'client.other']) {
    A[k] = await t.as(k);
  }
});
afterAll(() => t.close());

const ids = (res) => res.body.data.map((r) => r.id);

describe('projects', () => {
  const p1 = () => c.projects['dd.p1'];
  const p2 = () => c.projects['dd.p2'];

  test.each([
    ['l1', 200], ['l2', 200], ['dd.l3', 200], ['dd.l7', 200], ['dd.client', 200],
    ['fx.l3', 404], ['dd.l7b', 404], ['fx.client', 404], ['client.other', 404],
  ])('GET /projects/:dd.p1 as %s -> %i', async (who, status) => {
    expect((await A[who].get(`/api/projects/${p1()}`)).status).toBe(status);
  });

  test('dd.l7 is on p1 but not p2', async () => {
    expect((await A['dd.l7'].get(`/api/projects/${p2()}`)).status).toBe(404);
  });

  test('project lists contain only what the actor may see', async () => {
    const all = await A.l1.get('/api/projects');
    expect(ids(all)).toEqual(expect.arrayContaining([p1(), p2(), c.projects['fx.p1']]));
    expect(ids(await A['dd.l3'].get('/api/projects')).sort()).toEqual([p1(), p2()].sort());
    expect(ids(await A['fx.l3'].get('/api/projects'))).not.toContain(p1());
    expect(ids(await A['dd.l7'].get('/api/projects'))).toEqual([p1()]);
    expect(ids(await A['dd.l7b'].get('/api/projects'))).toEqual([]);
    expect(ids(await A['dd.client'].get('/api/projects'))).toEqual([p1()]);
    expect(ids(await A['client.other'].get('/api/projects'))).toEqual([]);
  });

  test('budget and staff emails are hidden from staff and clients', async () => {
    const asL7 = (await A['dd.l7'].get(`/api/projects/${p1()}`)).body.data;
    expect(asL7.budget).toBeUndefined();
    const asClient = (await A['dd.client'].get(`/api/projects/${p1()}`)).body.data;
    expect(asClient.budget).toBeUndefined();
    expect(asClient.members.every((m) => m.email === undefined && m.rate === undefined)).toBe(true);
    expect((await A['dd.l4'].get(`/api/projects/${p1()}`)).body.data.budget).toBeDefined();
  });

  test('rates on members are visible to L<=3 only', async () => {
    const l3 = (await A['dd.l3'].get(`/api/projects/${c.projects['dd.p2']}`)).body.data;
    expect(l3.members[0].rate).toBeDefined();
    const l4 = (await A['dd.l4'].get(`/api/projects/${c.projects['dd.p2']}`)).body.data;
    expect(l4.members.every((m) => m.rate === undefined)).toBe(true);
  });

  test('writes: other venture 404, staff/client 403, own venture ok', async () => {
    expect((await A['fx.l4'].put(`/api/projects/${p1()}`).send({ name: 'hijack' })).status).toBe(404);
    expect((await A['fx.l3'].delete(`/api/projects/${p1()}`)).status).toBe(404);
    expect((await A['dd.l7'].put(`/api/projects/${p1()}`).send({ name: 'x' })).status).toBe(403);
    expect((await A['dd.client'].put(`/api/projects/${p1()}`).send({ name: 'x' })).status).toBe(403);
    expect((await A['dd.l4'].put(`/api/projects/${p1()}`).send({ description: 'updated by dd.l4' })).status).toBe(200);
    const row = (await t.pool.query('SELECT name, description FROM projects WHERE id = $1', [p1()])).rows[0];
    expect(row.name).not.toBe('hijack');
    expect(row.description).toBe('updated by dd.l4');
  });

  test('create: venture comes from the caller, members must belong to it', async () => {
    const res = await A['fx.l4'].post('/api/projects').send({ name: '[demo] sneaky', venture_id: c.ventureId.dd, members: [] });
    expect(res.status).toBe(200);
    const row = (await t.pool.query('SELECT venture_id FROM projects WHERE id = $1', [res.body.data.id])).rows[0];
    expect(row.venture_id).toBe(c.ventureId.fx);

    const bad = await A['fx.l4'].post('/api/projects').send({ name: '[demo] bad members', members: [{ user_id: c.users['dd.l7'] }] });
    expect(bad.status).toBe(403);
    const ok = await A['fx.l4'].post('/api/projects').send({ name: '[demo] good members', members: [{ user_id: c.users['fx.l7'] }, { user_id: c.users['fx.client'] }] });
    expect(ok.status).toBe(200);
    expect((await A['dd.l4'].get(`/api/projects/${ok.body.data.id}`)).status).toBe(404);
  });
});

describe('tasks', () => {
  const tk = (k) => c.tasks[`dd.${k}`];

  test.each([
    // [actor, task, expected GET status]
    ['l1', 't_l7', 200], ['l2', 't_l7', 200], ['dd.l3', 't_l7', 200],
    ['dd.l7', 't_l7', 200],        // assigned
    ['dd.l6', 't_l7', 200],        // member of the project
    ['dd.l7b', 't_l7', 404],       // not on the project, not assigned
    ['dd.l7b', 't_l7b', 200],      // own task
    ['dd.l7', 't_l7b', 404],       // another person's project-less task
    ['fx.l3', 't_l7', 404], ['fx.l7', 't_l7', 404],
    ['dd.client', 't_l7', 404], ['dd.client', 't_client', 200],
    ['client.other', 't_client', 404], ['fx.client', 't_client', 404],
  ])('GET /tasks/:id %s %s -> %i', async (who, task, status) => {
    expect((await A[who].get(`/api/tasks/${tk(task)}`)).status).toBe(status);
  });

  test('task lists are scoped', async () => {
    expect(ids(await A.l1.get('/api/tasks'))).toEqual(expect.arrayContaining([tk('t_l7'), c.tasks['fx.t_l7']]));
    const l3 = ids(await A['dd.l3'].get('/api/tasks'));
    expect(l3).toContain(tk('t_l7'));
    expect(l3).not.toContain(c.tasks['fx.t_l7']);
    expect(ids(await A['dd.l7b'].get('/api/tasks'))).toEqual([tk('t_l7b')]);
    expect(ids(await A['dd.client'].get('/api/tasks'))).toEqual([tk('t_client')]);
    expect(ids(await A['client.other'].get('/api/tasks'))).toEqual([]);
  });

  const exists = async (id) => (await t.pool.query('SELECT 1 FROM tasks WHERE id = $1', [id])).rowCount === 1;
  const statusOf = async (id) => (await t.pool.query('SELECT status FROM tasks WHERE id = $1', [id])).rows[0].status;

  test('updateTask: IDOR attempts change nothing', async () => {
    const id = tk('t_l8');
    for (const who of ['fx.l3', 'fx.l5', 'dd.l7b', 'dd.client', 'client.other']) {
      const r = await A[who].put(`/api/tasks/${id}`).send({ status: 'completed', title: 'pwned' });
      expect([403, 404]).toContain(r.status);
    }
    const r = await A['dd.l7'].put(`/api/tasks/${id}`).send({ status: 'completed' }); // can read, not on it
    expect(r.status).toBe(403);
    expect(await statusOf(id)).toBe('pending');
    expect((await t.pool.query('SELECT title FROM tasks WHERE id = $1', [id])).rows[0].title).not.toBe('pwned');
  });

  test('updateTask: assignee and venture admin may update', async () => {
    expect((await A['dd.l8'].put(`/api/tasks/${tk('t_l8')}`).send({ status: 'in-progress' })).status).toBe(403); // L8 cannot edit at all (route gate)
    expect((await A['dd.l7'].put(`/api/tasks/${tk('t_l7')}`).send({ status: 'completed' })).status).toBe(200);
    expect(await statusOf(tk('t_l7'))).toBe('completed');
    expect((await A['dd.l3'].put(`/api/tasks/${tk('t_l8')}`).send({ status: 'in-progress' })).status).toBe(200);
  });

  test('deleteTask: other venture / lower levels cannot delete', async () => {
    for (const who of ['fx.l3', 'fx.l5']) expect((await A[who].delete(`/api/tasks/${tk('t_l6')}`)).status).toBe(404);
    for (const who of ['dd.l7', 'dd.client']) expect((await A[who].delete(`/api/tasks/${tk('t_l6')}`)).status).toBe(403);
    expect(await exists(tk('t_l6'))).toBe(true);
  });

  test('create: project and assignees must be in scope', async () => {
    const base = { title: '[demo] cross' };
    expect((await A['fx.l5'].post('/api/tasks').send({ ...base, assigned_to: c.users['fx.l7'], project_id: c.projects['dd.p1'] })).status).toBe(404);
    expect((await A['fx.l5'].post('/api/tasks').send({ ...base, assigned_to: c.users['dd.l7'] })).status).toBe(403);
    expect((await A['dd.l5'].post('/api/tasks').send({ ...base, assigned_to: c.users['fx.l7'] })).status).toBe(403);
    // a venture is never taken from the body for non-global users
    const own = await A['fx.l5'].post('/api/tasks').send({ ...base, assigned_to: c.users['fx.l7'], venture_id: c.ventureId.dd });
    expect(own.status).toBe(201);
    const row = (await t.pool.query('SELECT venture_id FROM tasks WHERE id = $1', [own.body.data.id])).rows[0];
    expect(row.venture_id).toBe(c.ventureId.fx);
    // clients can be assigned only on their own project
    expect((await A['dd.l5'].post('/api/tasks').send({ ...base, assigned_to: c.users['dd.client'], project_id: c.projects['dd.p1'] })).status).toBe(201);
    expect((await A['dd.l5'].post('/api/tasks').send({ ...base, assigned_to: c.users['dd.client'], project_id: c.projects['dd.p2'] })).status).toBe(403);
  });

  test('reassigning and moving a task is scope-checked too', async () => {
    const id = tk('t_l8');
    expect((await A['dd.l5'].put(`/api/tasks/${id}`).send({ assigned_to: c.users['fx.l7'] })).status).toBe(403);
    expect((await A['dd.l5'].put(`/api/tasks/${id}`).send({ project_id: c.projects['fx.p1'] })).status).toBe(404);
  });
});

describe('timesheets', () => {
  test('lists: own for staff, venture for admins, none for clients', async () => {
    const l7 = (await A['dd.l7'].get('/api/timesheets')).body.data;
    expect(l7.length).toBeGreaterThan(0);
    expect(l7.every((r) => r.user_id === c.users['dd.l7'])).toBe(true);

    const l5 = (await A['dd.l5'].get('/api/timesheets')).body.data;
    expect(l5.every((r) => r.venture_id === c.ventureId.dd)).toBe(true);
    expect(l5.some((r) => r.user_id === c.users['dd.l7'])).toBe(true);

    const l3other = (await A['fx.l3'].get('/api/timesheets')).body.data;
    expect(l3other.every((r) => r.venture_id === c.ventureId.fx)).toBe(true);

    const all = (await A.l1.get('/api/timesheets')).body.data;
    expect(new Set(all.map((r) => r.venture_id)).size).toBe(4);

    expect((await A['dd.client'].get('/api/timesheets')).status).toBe(403);
    expect((await A['client.other'].get('/api/timesheets')).status).toBe(403);
    expect((await A['dd.client'].post('/api/timesheets').send({ hours: 1, activityDate: '2025-01-02' })).status).toBe(403);
  });

  test('rate and cost are only shown to L<=3', async () => {
    const l3 = (await A['dd.l3'].get('/api/timesheets')).body.data;
    expect(l3.some((r) => r.hourly_rate != null && r.total_cost != null)).toBe(true);
    for (const who of ['dd.l5', 'dd.l7', 'dd.l4']) {
      const rows = (await A[who].get('/api/timesheets')).body.data;
      expect(rows.every((r) => !('hourly_rate' in r) && !('total_cost' in r))).toBe(true);
    }
  });

  test('log hours: venture is derived, never taken from the body', async () => {
    const date = '2025-02-03';
    const r = await A['dd.l7'].post('/api/timesheets').send({ hours: 2, activityDate: date, ventureId: c.ventureId.fx });
    expect(r.status).toBe(201);
    expect(r.body.data.venture_id).toBe(c.ventureId.dd);
    expect(r.body.data.user_id).toBe(c.users['dd.l7']);

    expect((await A['dd.l7'].post('/api/timesheets').send({ hours: 2, activityDate: date, projectId: c.projects['fx.p1'] })).status).toBe(404);
    expect((await A['dd.l7'].post('/api/timesheets').send({ hours: 2, activityDate: date, taskId: c.tasks['fx.t_l7'] })).status).toBe(404);
    expect((await A['dd.l7b'].post('/api/timesheets').send({ hours: 2, activityDate: date, projectId: c.projects['dd.p1'] })).status).toBe(404);

    const viaTask = await A['dd.l7'].post('/api/timesheets').send({ hours: 1, activityDate: date, taskId: c.tasks['dd.t_l7'] });
    expect(viaTask.status).toBe(201);
    expect(viaTask.body.data.project_id).toBe(c.projects['dd.p1']);
  });

  test('approval: needs scope, level and a different approver', async () => {
    const pending = c.tasks['dd.ts.l7.pending.3'];
    const url = `/api/timesheets/${pending}/approve`;
    expect((await A['fx.l4'].patch(url).send({ status: 'approved' })).status).toBe(404);   // other venture
    expect((await A['fx.l3'].patch(url).send({ status: 'approved' })).status).toBe(404);
    expect((await A['dd.l7'].patch(url).send({ status: 'approved' })).status).toBe(403);   // own sheet, no right
    expect((await A['dd.l7b'].patch(url).send({ status: 'approved' })).status).toBe(403);
    expect((await A['dd.l6'].patch(url).send({ status: 'approved' })).status).toBe(403);
    expect((await A['dd.client'].patch(url).send({ status: 'approved' })).status).toBe(403);
    expect((await t.pool.query('SELECT status FROM timesheets WHERE id = $1', [pending])).rows[0].status).toBe('pending');

    // self-approval is refused even for someone who may approve others
    const mine = await A['dd.l5'].post('/api/timesheets').send({ hours: 1, activityDate: '2025-03-01' });
    expect((await A['dd.l5'].patch(`/api/timesheets/${mine.body.data.id}/approve`).send({ status: 'approved' })).status).toBe(403);
    // nor may a manager approve someone senior
    const seniorSheet = await A['dd.l3'].post('/api/timesheets').send({ hours: 1, activityDate: '2025-03-02' });
    expect((await A['dd.l5'].patch(`/api/timesheets/${seniorSheet.body.data.id}/approve`).send({ status: 'approved' })).status).toBe(403);

    expect((await A['dd.l4'].patch(url).send({ status: 'approved' })).status).toBe(200);
    expect((await t.pool.query('SELECT status, approved_by FROM timesheets WHERE id = $1', [pending])).rows[0]).toEqual({ status: 'approved', approved_by: c.users['dd.l4'] });
  });

  test('financials: scoped to the venture, closed to staff and clients', async () => {
    expect((await A['dd.l7'].get('/api/timesheets/financials')).status).toBe(403);
    expect((await A['dd.client'].get('/api/timesheets/financials')).status).toBe(403);
    const dd4 = (await A['dd.l4'].get('/api/timesheets/financials')).body.data;
    expect(dd4.byVenture.map((v) => v.venture_id)).toEqual([c.ventureId.dd]);
    const all = (await A.l2.get('/api/timesheets/financials')).body.data;
    expect(all.byVenture.length).toBe(4);
  });
});

describe('invoices', () => {
  const list = async (who) => A[who].get('/api/invoices');

  test('lists are scoped; staff below L5 have no finance access', async () => {
    const l5 = (await list('dd.l5')).body.data;
    expect(l5.length).toBeGreaterThan(0);
    expect(l5.every((i) => i.venture_id === c.ventureId.dd)).toBe(true);
    const fx5 = (await list('fx.l5')).body.data;
    expect(fx5.every((i) => i.venture_id === c.ventureId.fx)).toBe(true);
    expect(new Set((await list('l1')).body.data.map((i) => i.venture_id)).size).toBe(4);
    for (const who of ['dd.l6', 'dd.l7', 'dd.l7b', 'dd.l8']) expect((await list(who)).status).toBe(403);
    expect((await list('client.other')).body.data).toEqual([]);
    expect((await list('fx.client')).body.data.every((i) => i.venture_id === c.ventureId.fx)).toBe(true);
  });

  test('details: foreign venture is not found; clients see only their project lines', async () => {
    const inv = (await list('dd.l5')).body.data[0];
    const url = `/api/invoices/${inv.id}`;
    expect((await A['dd.l5'].get(url)).status).toBe(200);
    expect((await A['dd.l3'].get(url)).status).toBe(200);
    expect((await A.l2.get(url)).status).toBe(200);
    for (const who of ['fx.l5', 'fx.l3', 'fx.client', 'client.other']) expect((await A[who].get(url)).status).toBe(404);
    for (const who of ['dd.l7', 'dd.l6', 'dd.l8']) expect((await A[who].get(url)).status).toBe(403);

    // The client sees an invoice only if it has lines on their project, and then only those lines.
    const clientInvoices = (await list('dd.client')).body.data;
    expect(clientInvoices.length).toBeGreaterThan(0);
    const detail = (await A['dd.client'].get(`/api/invoices/${clientInvoices[0].id}`)).body.data;
    expect(detail.items.every((i) => i.project !== 'General Deliverables')).toBe(true);
    expect(detail.items.every((i) => i.rate === undefined)).toBe(true);
    const staffDetail = (await A['dd.l5'].get(`/api/invoices/${clientInvoices[0].id}`)).body.data;
    expect(staffDetail.items.length).toBeGreaterThanOrEqual(detail.items.length);
  });
});

describe('documents', () => {
  const doc = (k) => c.documents[`dd.${k}`];
  const names = async (who, qs = '') => (await A[who].get(`/api/documents${qs}`)).body.data.map((d) => d.id);

  test('lists', async () => {
    expect(await names('l1')).toEqual(expect.arrayContaining([doc('client').id, c.documents['fx.internal'].id]));
    const l3 = await names('dd.l3');
    expect(l3).toEqual(expect.arrayContaining([doc('client').id, doc('internal').id, doc('p2').id, doc('venture').id]));
    expect(l3).not.toContain(c.documents['fx.internal'].id);
    const l7 = await names('dd.l7');
    expect(l7).toEqual(expect.arrayContaining([doc('client').id, doc('internal').id, doc('venture').id]));
    expect(l7).not.toContain(doc('p2').id); // not a member of p2
    expect(await names('dd.l7b')).toEqual([doc('venture').id]);
    expect(await names('dd.client')).toEqual([doc('client').id]);
    expect(await names('client.other')).toEqual([]);
    expect(await names('fx.client')).not.toContain(doc('client').id);
    // a venture filter cannot widen the scope
    expect(await names('fx.l3', `?ventureId=${c.ventureId.dd}`)).toEqual([]);
  });

  test.each([
    ['l1', 'internal', 200], ['dd.l3', 'internal', 200], ['dd.l7', 'internal', 200],
    ['dd.l7', 'p2', 404], ['dd.l7b', 'internal', 404], ['fx.l5', 'internal', 404], ['fx.l3', 'client', 404],
    ['dd.client', 'client', 200], ['dd.client', 'internal', 404], ['dd.client', 'venture', 404],
    ['client.other', 'client', 404], ['fx.client', 'client', 404],
  ])('download /uploads/<file> as %s of %s -> %i', async (who, key, status) => {
    expect((await A[who].get(`/uploads/${doc(key).path}`)).status).toBe(status);
  });

  test('upload: venture and project are derived, not taken from the body', async () => {
    const up = (who, fields) => {
      let r = A[who].post('/api/documents/upload').attach('file', Buffer.from('hello'), { filename: '[demo] up.txt', contentType: 'text/plain' });
      for (const [k, v] of Object.entries(fields || {})) r = r.field(k, v);
      return r;
    };
    const own = await up('dd.l5', { ventureId: String(c.ventureId.fx) });
    expect(own.status).toBe(201);
    expect(own.body.data.venture_id).toBe(c.ventureId.dd);

    expect((await up('fx.l5', { projectId: String(c.projects['dd.p1']) })).status).toBe(404);
    expect((await up('dd.l7b', { projectId: String(c.projects['dd.p1']) })).status).toBe(404);
    expect((await up('dd.client')).status).toBe(403);

    // only global users may name a venture, and only if no project decides it
    const g = await up('l1', { ventureId: String(c.ventureId.px) });
    expect(g.status).toBe(201);
    expect(g.body.data.venture_id).toBe(c.ventureId.px);

    // a global upload must name a venture (that exists) or say companyWide=true
    expect((await up('l1')).status).toBe(400);
    expect((await up('l2', { ventureId: '999999' })).status).toBe(400);
    expect((await up('l1', { ventureId: 'abc' })).status).toBe(400);
    const wide = await up('l2', { companyWide: 'true' });
    expect(wide.status).toBe(201);
    expect(wide.body.data.venture_id).toBeNull();

    // staff cannot publish a document to clients; admins can
    const staffTry = await up('dd.l7', { projectId: String(c.projects['dd.p1']), clientVisible: 'true' });
    expect(staffTry.body.data.client_visible).toBe(false);
    const adminTry = await up('dd.l3', { projectId: String(c.projects['dd.p1']), clientVisible: 'true' });
    expect(adminTry.body.data.client_visible).toBe(true);
    expect(await names('dd.client')).toContain(adminTry.body.data.id);
  });

  test('delete and share-with-client are scope-checked', async () => {
    expect((await A['fx.l3'].delete(`/api/documents/${doc('internal').id}`)).status).toBe(404);
    expect((await A['dd.l7'].delete(`/api/documents/${doc('internal').id}`)).status).toBe(403);
    expect((await A['dd.client'].delete(`/api/documents/${doc('client').id}`)).status).toBe(403);
    expect((await A['dd.l7'].patch(`/api/documents/${doc('internal').id}/client-visible`).send({ clientVisible: true })).status).toBe(403);
    expect((await A['fx.l3'].patch(`/api/documents/${doc('internal').id}/client-visible`).send({ clientVisible: true })).status).toBe(404);
    expect((await A['dd.l3'].patch(`/api/documents/${doc('venture').id}/client-visible`).send({ clientVisible: true })).status).toBe(400); // no project
    expect((await t.pool.query('SELECT 1 FROM documents WHERE id = $1', [doc('internal').id])).rowCount).toBe(1);
  });
});

describe('client portal and other internal-only endpoints', () => {
  test('portal returns client-safe data only', async () => {
    const d = (await A['dd.client'].get('/api/client-portal/overview')).body.data;
    expect(d.projects.map((p) => p.id)).toEqual([c.projects['dd.p1']]);
    expect(d.projects.every((p) => p.budget === undefined)).toBe(true);
    expect(d.deliverables.map((x) => x.id)).toContain(c.tasks['dd.t_client']);
    expect(d.deliverables.every((x) => x.assigned_by_name !== undefined && !('assigned_to' in x))).toBe(true);
    const mine = (await t.pool.query('SELECT task_id FROM task_assignees WHERE user_id = $1', [c.users['dd.client']])).rows.map((r) => r.task_id);
    expect(d.deliverables.map((x) => x.id).sort()).toEqual(mine.sort()); // only tasks assigned to this client
    expect(d.documents.map((x) => x.id)).toContain(c.documents['dd.client'].id);
    expect(d.documents.map((x) => x.id)).not.toContain(c.documents['dd.internal'].id);
    const shared = (await t.pool.query('SELECT id FROM documents WHERE client_visible AND project_id = $1', [c.projects['dd.p1']])).rows.map((r) => r.id);
    expect(d.documents.map((x) => x.id).sort()).toEqual(shared.sort());
    expect(JSON.stringify(d)).not.toMatch(/@demo\.internalx\.test/); // no staff emails

    const empty = (await A['client.other'].get('/api/client-portal/overview')).body.data;
    expect(empty.projects).toEqual([]);
    expect(empty.deliverables).toEqual([]);
    expect(empty.invoices).toEqual([]);
    expect(empty.documents).toEqual([]);

    for (const who of ['dd.l5', 'l1']) expect((await A[who].get('/api/client-portal/overview')).status).toBe(403);
  });

  test.each([
    '/api/platform-metrics', '/api/strategy', '/api/budget/summary', '/api/budget/expenses', '/api/budget/monthly',
    '/api/kpis/hr', '/api/kpis/department', '/api/learning/checklist', '/api/learning/resources', '/api/learning/feedback',
    '/api/action-logs', '/api/chat/channels',
  ])('clients are refused at %s', async (url) => {
    for (const who of ['dd.client', 'client.other']) {
      const r = await A[who].get(url);
      expect(r.status).toBe(403);
    }
  });

  test('finance and leadership endpoints: levels and venture scope', async () => {
    for (const url of ['/api/budget/summary', '/api/budget/expenses', '/api/kpis/hr']) {
      expect((await A['dd.l5'].get(url)).status).toBe(403);
      expect((await A['dd.l7'].get(url)).status).toBe(403);
    }
    const dd4 = (await A['dd.l4'].get('/api/budget/summary')).body.data;
    expect(dd4.ventures.map((v) => v.id)).toEqual([c.ventureId.dd]);
    expect((await A.l1.get('/api/budget/summary')).body.data.ventures.length).toBe(4);
    const exp = (await A['dd.l4'].get(`/api/budget/expenses?venture_id=${c.ventureId.fx}`)).body.data;
    expect(exp.every((e) => e.venture === 'Dropwing Design Studio')).toBe(true);
    const kpi = (await A['dd.l4'].get('/api/kpis/hr')).body.data;
    expect(kpi.headcount.map((h) => h.slug)).toEqual(['dropwing']);
    expect((await A['dd.l4'].get('/api/kpis/department')).status).toBe(200);
  });

  test('analytics and strategy are venture scoped', async () => {
    const m = (await A['dd.l7'].get('/api/platform-metrics')).body.data;
    expect(m.budgetDistribution).toEqual([]);
    expect(m.userDistribution.map((u) => u.name)).toEqual(['Dropwing Design Studio']);
    expect(m.announcements.every((a) => a.venture_id === null || a.venture_id === c.ventureId.dd)).toBe(true);
    const s = (await A['dd.l3'].get('/api/strategy')).body.data;
    expect(s.okrs.every((o) => o.venture_id === c.ventureId.dd)).toBe(true);
    expect(s.risks.every((r) => r.venture_id === c.ventureId.dd)).toBe(true);
    const all = (await A.l2.get('/api/strategy')).body.data;
    expect(new Set(all.okrs.map((o) => o.venture_id)).size).toBeGreaterThanOrEqual(4);
  });

  test('audit log: global users only', async () => {
    expect((await A['dd.l3'].get('/api/action-logs')).status).toBe(403);
    expect((await A['dd.l4'].get('/api/action-logs')).status).toBe(403);
    expect((await A.l1.get('/api/action-logs')).status).toBe(200);
    expect((await A.l2.get('/api/action-logs')).status).toBe(200);
  });

  test('learning: feedback and deletes stay inside the venture', async () => {
    const mk = await A['dd.l5'].post('/api/learning/checklist').send({ title: '[demo] dd item' });
    expect(mk.status).toBe(200);
    expect((await A['fx.l5'].delete(`/api/learning/checklist/${mk.body.data.id}`)).status).toBe(404);
    expect((await A['fx.l5'].post('/api/learning/feedback').send({ intern_id: c.users['dd.l8'], note: 'x' })).status).toBe(404);
    expect((await A['dd.l5'].post('/api/learning/feedback').send({ intern_id: c.users['dd.l8'], note: 'good' })).status).toBe(200);
    expect((await A['dd.l5'].post('/api/learning/feedback').send({ intern_id: c.users['dd.l7'], note: 'not an intern' })).status).toBe(404);
    const fx = (await A['fx.l5'].get('/api/learning/checklist')).body.data;
    expect(fx.map((i) => i.id)).not.toContain(mk.body.data.id);
    expect((await A['dd.l7'].post('/api/learning/checklist').send({ title: 'nope' })).status).toBe(403);
  });

  test('notifications are per user', async () => {
    await t.pool.query("INSERT INTO notifications (user_id, title) VALUES ($1, '[demo] private')", [c.users['dd.l7']]);
    const titles = async (who) => (await A[who].get('/api/notifications')).body.data.map((n) => n.title);
    expect(await titles('dd.l7')).toContain('[demo] private');
    expect(await titles('fx.l7')).not.toContain('[demo] private');
    expect(await titles('dd.client')).not.toContain('[demo] private');
  });
});
