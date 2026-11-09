/**
 * A client's invoice detail carries totals and client-safe line fields only:
 * no staff names, rates, per-line prices, internal notes or internal task titles.
 */
jest.mock('../src/services/email.service', () => new Proxy({}, { get: () => async () => ({ success: true }) }));
const { setup } = require('./helpers/app');

let t; let c; const A = {};

beforeAll(async () => {
  t = await setup();
  c = t.ctx;
  for (const k of ['dd.l5', 'dd.client']) A[k] = await t.as(k);
});
afterAll(() => t.close());

test('client invoice detail has no rate, per-line amount, staff name, notes or foreign task titles', async () => {
  const list = (await A['dd.client'].get('/api/invoices')).body.data;
  expect(list.length).toBeGreaterThan(0);
  const res = await A['dd.client'].get(`/api/invoices/${list[0].id}`);
  expect(res.status).toBe(200);
  const d = res.body.data;
  expect(d.total_amount).toEqual(expect.any(Number));
  expect(d).not.toHaveProperty('billing_rate');
  expect(d).not.toHaveProperty('unrated_hours');
  expect(d.items.length).toBeGreaterThan(0);
  for (const item of d.items) {
    expect(Object.keys(item).sort()).toEqual(['date', 'hours', 'id', 'project', 'task']);
  }
  const body = JSON.stringify(d);
  expect(body).not.toMatch(/\[demo\] work/); // internal timesheet notes
  expect(body).not.toMatch(/write notes/); // titles of tasks not assigned to the client

  const staff = (await A['dd.l5'].get(`/api/invoices/${list[0].id}`)).body.data;
  expect(staff).toHaveProperty('billing_rate');
  expect(staff.items[0]).toHaveProperty('developer');
  expect(staff.items[0]).toHaveProperty('amount');
});
