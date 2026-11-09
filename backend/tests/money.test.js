/**
 * Money: every cost/budget/invoice/portal figure comes from one rate source
 * (project_members.rate -> users.hourly_rate), and a missing rate is reported
 * as missing, never invented.
 */
jest.mock('../src/services/email.service', () => new Proxy({}, { get: () => async () => ({ success: true }) }));
const { setup } = require('./helpers/app');

let t; let c; const A = {};

beforeAll(async () => {
  t = await setup();
  c = t.ctx;
  for (const k of ['l1', 'l2', 'dd.l3', 'dd.l4', 'dd.l5', 'dd.l7', 'dd.client', 'fx.l3', 'fx.l4', 'fx.l5', 'fx.client']) A[k] = await t.as(k);
});
afterAll(() => t.close());

const MONTH = '2020-01';
const r2 = (n) => Math.round(n * 100) / 100;

describe('controlled fixture: 2020-01 in venture dd', () => {
  // dd.l7 (45/h): 10h on p1 ; dd.l5 (80/h, 95 override on p2 only): 4h on p2 and 2h on p1 ; dd.l8 (20/h): 5h
  // fx.l8 has NO rate: 3h in venture fx
  beforeAll(async () => {
    const add = (who, v, project, hours, day) => t.pool.query(
      `INSERT INTO timesheets (user_id, project_id, venture_id, hours_worked, date, status, approved_by)
       VALUES ($1, $2, $3, $4, $5, 'approved', $6)`,
      [c.users[who], project ? c.projects[project] : null, c.ventureId[v], hours, `${MONTH}-${day}`, c.users['l1']]);
    await add('dd.l7', 'dd', 'dd.p1', 10, '05');
    await add('dd.l5', 'dd', 'dd.p2', 4, '06');
    await add('dd.l5', 'dd', 'dd.p1', 2, '07');
    await add('dd.l8', 'dd', 'dd.p1', 5, '08');
    await add('fx.l8', 'fx', 'fx.p1', 3, '09');
    await add('fx.l7', 'fx', 'fx.p1', 1, '10');
  });

  test('invoice = hours x (project rate, else user rate); no invented 50 or 150', async () => {
    const id = `INV-${c.ventureId.dd}-${MONTH}`;
    const d = (await A['dd.l5'].get(`/api/invoices/${id}`)).body.data;
    const expected = 10 * 45 + 4 * 95 + 2 * 80 + 5 * 20; // 450 + 380 + 160 + 100
    expect(d.total_hours).toBe(21);
    expect(d.total_amount).toBe(expected);
    expect(d.rate_missing).toBe(false);
    expect(d.items.reduce((s, i) => s + i.amount, 0)).toBe(expected);
    expect(d.billing_rate).toBe(r2(expected / 21));
    const list = (await A['dd.l5'].get('/api/invoices')).body.data.find((i) => i.id === id);
    expect(list).toMatchObject({ total_hours: 21, total_amount: expected, rate_missing: false });
  });

  test('client invoice covers only their project, from the same source', async () => {
    const id = `INV-${c.ventureId.dd}-${MONTH}`;
    const d = (await A['dd.client'].get(`/api/invoices/${id}`)).body.data;
    expect(d.total_amount).toBe(10 * 45 + 2 * 80 + 5 * 20); // p1 lines only (the 4h on p2 is excluded)
    expect(d.items.every((i) => i.rate === undefined)).toBe(true); // rates are internal
    const portal = (await A['dd.client'].get('/api/client-portal/overview')).body.data.invoices.find((i) => i.invoice_number === `INV-${c.ventureId.dd}-${MONTH.replace('-', '')}`);
    expect(portal.total_amount).toBe(d.total_amount);
  });

  test('a missing rate is reported, not guessed', async () => {
    const id = `INV-${c.ventureId.fx}-${MONTH}`;
    const d = (await A['fx.l5'].get(`/api/invoices/${id}`)).body.data;
    expect(d.total_hours).toBe(4);
    expect(d.total_amount).toBe(45); // only fx.l7's 1h x 45 is priced
    expect(d.unrated_hours).toBe(3);
    expect(d.rate_missing).toBe(true);
    expect(d.items.find((i) => i.hours === 3).amount).toBeNull();

    const fin = (await A['fx.l4'].get('/api/timesheets/financials')).body.data;
    expect(fin.global.unratedHours).toBeGreaterThanOrEqual(3);
    expect(fin.global.rateMissing).toBe(true);
  });

  test('budget numbers use the same rates', async () => {
    const monthly = (await A.l1.get('/api/budget/monthly')).body.data;
    expect(monthly).toHaveLength(6); // 2020 is outside the 6-month window, shape check only

    const sum = (await A['dd.l4'].get('/api/budget/summary')).body.data.ventures[0];
    const rows = (await t.pool.query(
      `SELECT t.hours_worked, COALESCE(pm.rate, u.hourly_rate) AS rate
       FROM timesheets t JOIN users u ON u.id = t.user_id
       LEFT JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = t.user_id
       WHERE t.venture_id = $1`, [c.ventureId.dd])).rows;
    const expected = r2(rows.reduce((s, r) => s + (r.rate == null ? 0 : parseFloat(r.hours_worked) * parseFloat(r.rate)), 0));
    expect(sum.total_expenses).toBe(expected);
    expect(sum.rate_missing).toBe(false);
    const fx = (await A['fx.l4'].get('/api/budget/summary')).body.data.ventures[0];
    expect(fx.rate_missing).toBe(true);
    expect(fx.unrated_hours).toBeGreaterThan(0);

    const exp = (await A['dd.l4'].get('/api/budget/expenses?limit=500')).body.data;
    const total = r2(exp.reduce((s, e) => s + (e.amount || 0), 0));
    expect(total).toBe(expected);
  });

  test('timesheet cost is shown to L<=3 from the same source', async () => {
    const rows = (await A['dd.l3'].get('/api/timesheets')).body.data;
    const l7 = rows.find((r) => r.user_id === c.users['dd.l7'] && String(r.date).startsWith(MONTH));
    expect(l7.hourly_rate).toBe(45);
    expect(l7.total_cost).toBe(450);
  });
});

describe('PUT /api/team-members/:id/rate', () => {
  const put = (who, target, body) => A[who].put(`/api/team-members/${c.users[target]}/rate`).send(body);
  const rateOf = async (key) => (await t.pool.query('SELECT hourly_rate FROM users WHERE id = $1', [c.users[key]])).rows[0].hourly_rate;

  test('only L<=3 may set, and L3 only below them in their own venture', async () => {
    expect((await put('dd.l4', 'dd.l7', { hourly_rate: 1 })).status).toBe(403);
    expect((await put('dd.l5', 'dd.l7', { hourly_rate: 1 })).status).toBe(403);
    expect((await put('dd.l7', 'dd.l7', { hourly_rate: 1 })).status).toBe(403);
    expect((await put('dd.client', 'dd.l7', { hourly_rate: 1 })).status).toBe(403);
    expect((await put('fx.l3', 'dd.l7', { hourly_rate: 1 })).status).toBe(404);     // other venture
    expect((await put('dd.l3', 'dd.l3', { hourly_rate: 1 })).status).toBe(404);     // peers are not manageable
    expect((await put('dd.l3', 'l2', { hourly_rate: 1 })).status).toBe(404);
    expect(String(await rateOf('dd.l7'))).toBe('45.00');

    expect((await put('dd.l3', 'dd.l7', { hourly_rate: 55.555 })).status).toBe(200);
    expect(String(await rateOf('dd.l7'))).toBe('55.56');
    expect((await put('l1', 'fx.l7', { hourly_rate: 70 })).status).toBe(200);
    expect((await put('l2', 'fx.l7', { hourly_rate: null })).body.data.hourly_rate).toBeNull();
    expect(await rateOf('fx.l7')).toBeNull();
  });

  test('validation', async () => {
    for (const bad of [-1, 'abc', 100000, {}, [1]]) expect((await put('l1', 'dd.l7', { hourly_rate: bad })).status).toBe(400);
    expect((await put('l1', 'dd.l7', {})).status).toBe(400);
    expect((await A.l1.put('/api/team-members/abc/rate').send({ hourly_rate: 1 })).status).toBe(404);
  });

  test('GET shows the rate to managers only', async () => {
    expect((await A['dd.l3'].get(`/api/team-members/${c.users['dd.l5']}/rate`)).body.data.hourly_rate).toBe(80);
    expect((await A['dd.l5'].get(`/api/team-members/${c.users['dd.l7']}/rate`)).status).toBe(403);
    expect((await A['fx.l3'].get(`/api/team-members/${c.users['dd.l5']}/rate`)).status).toBe(404);
  });
});
