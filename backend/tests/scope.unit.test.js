const {
  buildScope, toId, projectWhere, taskWhere, timesheetWhere, documentWhere, ventureWhere,
  canAccessVenture, canWriteTask, canJoinRoom, canUseVentureChannel,
} = require('../src/utils/scope');

const mk = (level, ventureId, projectIds = [], userId = 10) => buildScope({ userId, level, ventureId, projectIds });

describe('toId', () => {
  test('accepts positive integers only', () => {
    expect(toId('12')).toBe(12);
    expect(toId(7)).toBe(7);
    for (const bad of ['0', '-1', '1e3', '1 OR 1=1', '', null, undefined, 1.5, [], {}]) expect(toId(bad)).toBeNull();
  });
});

describe('buildScope', () => {
  test('levels map to the access model', () => {
    expect(mk(1, null).global).toBe(true);
    expect(mk(2, null).global).toBe(true);
    expect(mk(3, 2)).toMatchObject({ global: false, isVentureAdmin: true, ventureIds: [2], canSetRates: true });
    expect(mk(5, 2)).toMatchObject({ isVentureAdmin: true, canSetRates: false, canSeeCost: true });
    expect(mk(7, 2)).toMatchObject({ isStaff: true, canSeeCost: false });
    expect(mk(9, 2, [4])).toMatchObject({ isClient: true, isInternal: false, ventureIds: [] });
  });
});

describe('predicates', () => {
  const sql = (fn, scope, alias = 'x') => { const params = []; const s = fn(scope, alias, params); return { s, params }; };

  test('global sees everything', () => {
    for (const fn of [projectWhere, taskWhere, timesheetWhere, documentWhere]) {
      expect(sql(fn, mk(2, null))).toEqual({ s: 'TRUE', params: [] });
    }
    expect(sql((s, a, p) => ventureWhere(s, 'x.venture_id', p), mk(1, null)).s).toBe('TRUE');
  });

  test('venture-less internal user matches nothing venture-wide', () => {
    expect(sql(projectWhere, mk(4, null)).s).toBe('FALSE');
    expect(sql((s, a, p) => ventureWhere(s, 'x.venture_id', p), mk(4, null)).s).toBe('FALSE');
  });

  test('values are always bound, never interpolated', () => {
    const { s, params } = sql(projectWhere, mk(6, 3, [5, 6]));
    expect(s).toMatch(/\$1/);
    expect(s).not.toMatch(/\b3\b/);
    expect(params).toEqual([3, [5, 6]]);
  });

  test('clients: no venture-wide data, no timesheets', () => {
    expect(sql(timesheetWhere, mk(9, 1, [2])).s).toBe('FALSE');
    expect(sql((s, a, p) => ventureWhere(s, 'x.venture_id', p), mk(9, 1, [2])).s).toBe('FALSE');
    expect(sql(documentWhere, mk(9, 1, [2])).s).toMatch(/client_visible/);
  });

  test('staff timesheets are own-only; admins venture-wide', () => {
    expect(sql(timesheetWhere, mk(7, 1)).s).toBe('x.user_id = $1');
    expect(sql(timesheetWhere, mk(4, 1)).s).toMatch(/venture_id = \$2/);
  });
});

describe('single-row helpers', () => {
  test('canAccessVenture', () => {
    expect(canAccessVenture(mk(2, null), 4)).toBe(true);
    expect(canAccessVenture(mk(4, 1), 1)).toBe(true);
    expect(canAccessVenture(mk(4, 1), '1')).toBe(true);
    expect(canAccessVenture(mk(4, 1), 2)).toBe(false);
    expect(canAccessVenture(mk(4, 1), null)).toBe(false);
    expect(canAccessVenture(mk(9, 1, [1]), 1)).toBe(false);
  });

  test('canWriteTask: staff only on their own tasks', () => {
    const t = { assigned_by: 1, assigned_to: 2, assignee_ids: [2, 3] };
    expect(canWriteTask(mk(4, 1, [], 50), t)).toBe(true);
    expect(canWriteTask(mk(7, 1, [], 3), t)).toBe(true);
    expect(canWriteTask(mk(7, 1, [], 99), t)).toBe(false);
    expect(canWriteTask(mk(9, 1, [], 3), t)).toBe(false);
  });

  test('chat rooms', () => {
    const staff = mk(7, 2, [], 10);
    expect(canJoinRoom(staff, 'venture_2')).toBe(true);
    expect(canJoinRoom(staff, 'venture_3')).toBe(false);
    expect(canJoinRoom(staff, 'dm_10')).toBe(true);
    expect(canJoinRoom(staff, 'dm_11')).toBe(false);
    expect(canJoinRoom(staff, 'global')).toBe(true);
    expect(canJoinRoom(staff, 'venture_2 ')).toBe(false);
    expect(canJoinRoom(staff, ['venture_2'])).toBe(false);
    expect(canJoinRoom(mk(2, null), 'venture_4')).toBe(true);
    const client = mk(9, 2, [1], 10);
    for (const r of ['global', 'venture_2', 'dm_10']) expect(canJoinRoom(client, r)).toBe(false);
    expect(canUseVentureChannel(client, 'global')).toBe(false);
  });
});
