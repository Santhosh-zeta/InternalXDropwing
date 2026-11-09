const { canManageUser } = require('../src/utils/canManageUser');

const actor = (accessLevel, ventureId = null, id = 100) => ({ id, accessLevel, ventureId });
const target = (access_level, venture_id = null, id = 200, is_active = true) => ({ id, access_level, venture_id, is_active });
const ok = (r) => expect(r).toEqual({ ok: true });
const denied = (r, status = 403) => { expect(r.ok).toBe(false); expect(r.status).toBe(status); };

describe('canManageUser - who may manage at all', () => {
  test.each([4, 5, 6, 7, 8, 9])('L%i cannot manage anyone', (lvl) => {
    denied(canManageUser(actor(lvl, 1), target(9, 1), { access_level: 9 }));
    denied(canManageUser(actor(lvl, 1), null, { action: 'create', access_level: 9, venture_id: 1 }));
  });
  test('unauthenticated actor', () => {
    denied(canManageUser(null, target(8, 1), {}), 401);
  });
  test('missing target on update/delete is a 404', () => {
    denied(canManageUser(actor(1), null, { action: 'update' }), 404);
    denied(canManageUser(actor(1), null, { action: 'delete' }), 404);
  });
});

describe('canManageUser - create', () => {
  test('L1 may create any level; global levels need no venture, others need one', () => {
    ok(canManageUser(actor(1), null, { access_level: 1 }));
    ok(canManageUser(actor(1), null, { access_level: 2 }));
    ok(canManageUser(actor(1), null, { access_level: 5, venture_id: 3 }));
    denied(canManageUser(actor(1), null, { access_level: 5 }), 400);
    denied(canManageUser(actor(1), null, { access_level: 2, venture_id: 3 }), 400);
  });
  test('L2 cannot create L1 or L2, may create L3..L9 in any venture', () => {
    denied(canManageUser(actor(2), null, { access_level: 1 }));
    denied(canManageUser(actor(2), null, { access_level: 2 }));
    ok(canManageUser(actor(2), null, { access_level: 3, venture_id: 4 }));
    ok(canManageUser(actor(2), null, { access_level: 9, venture_id: 2 }));
  });
  test('L3 creates only below L3, only in its own venture', () => {
    denied(canManageUser(actor(3, 1), null, { access_level: 3, venture_id: 1 }));
    denied(canManageUser(actor(3, 1), null, { access_level: 2 }));
    denied(canManageUser(actor(3, 1), null, { access_level: 5, venture_id: 2 }));
    ok(canManageUser(actor(3, 1), null, { access_level: 5, venture_id: 1 }));
    ok(canManageUser(actor(3, 1), null, { access_level: 9, venture_id: 1 }));
  });
  test('an L3 with no venture cannot create anyone', () => {
    denied(canManageUser(actor(3, null), null, { access_level: 5 }));
  });
  test('access_level is required on create', () => {
    denied(canManageUser(actor(1), null, {}), 400);
  });
});

describe('canManageUser - update', () => {
  test('L1 manages anyone, including other L1s and changing venture', () => {
    ok(canManageUser(actor(1), target(1), { full_name: 'x' }, { activeL1Count: 2 }));
    ok(canManageUser(actor(1), target(6, 1), { venture_id: 2 }));
    ok(canManageUser(actor(1), target(6, 1), { access_level: 2, venture_id: 0 }));
  });
  test('L2 cannot touch L1 or L2, cannot grant L1/L2', () => {
    denied(canManageUser(actor(2), target(1), { full_name: 'x' }));
    denied(canManageUser(actor(2), target(2, null, 201), { full_name: 'x' }));
    denied(canManageUser(actor(2), target(5, 1), { access_level: 2, venture_id: null }));
    denied(canManageUser(actor(2), target(5, 1), { access_level: 1, venture_id: null }));
  });
  test('L2 may move a user to another venture and change level', () => {
    ok(canManageUser(actor(2), target(5, 1), { venture_id: 2 }));
    ok(canManageUser(actor(2), target(5, 1), { access_level: 4 }));
  });
  test('L3 manages only strictly lower levels in its own venture', () => {
    ok(canManageUser(actor(3, 1), target(7, 1), { access_level: 5 }));
    ok(canManageUser(actor(3, 1), target(7, 1), { is_active: false }));
    denied(canManageUser(actor(3, 1), target(3, 1, 201), { full_name: 'x' }));
    denied(canManageUser(actor(3, 1), target(2), { full_name: 'x' }));
    denied(canManageUser(actor(3, 1), target(7, 2), { full_name: 'x' }));
    denied(canManageUser(actor(3, 1), target(7, null), { full_name: 'x' }));
  });
  test('L3 cannot promote to its own level or above, nor change ventures', () => {
    denied(canManageUser(actor(3, 1), target(7, 1), { access_level: 3 }));
    denied(canManageUser(actor(3, 1), target(7, 1), { access_level: 1 }));
    denied(canManageUser(actor(3, 1), target(7, 1), { venture_id: 2 }));
    denied(canManageUser(actor(3, 1), target(7, 1), { venture_id: 0 }));
  });
  test('a level 3-9 user cannot be left without a venture', () => {
    denied(canManageUser(actor(1), target(7, 1), { venture_id: null }), 400);
    denied(canManageUser(actor(1), target(7, null), { access_level: 6 }), 400);
  });
});

describe('canManageUser - self protection', () => {
  const me = (lvl, v = null) => ({ actor: actor(lvl, v, 7), self: target(lvl, v, 7) });
  test('nobody can self-promote, change own venture, deactivate or delete themselves', () => {
    for (const lvl of [1, 2, 3]) {
      const { actor: a, self } = me(lvl, lvl === 3 ? 1 : null);
      denied(canManageUser(a, self, { access_level: lvl - 1 || 1 + 1 }, { activeL1Count: 5 }));
      denied(canManageUser(a, self, { is_active: false }, { activeL1Count: 5 }));
      denied(canManageUser(a, self, { action: 'delete' }, { activeL1Count: 5 }));
    }
    const { actor: a, self } = me(3, 1);
    denied(canManageUser(a, self, { venture_id: 2 }));
  });
  test('L1 may still edit their own profile fields', () => {
    const { actor: a, self } = me(1);
    ok(canManageUser(a, self, { full_name: 'New' }, { activeL1Count: 1 }));
  });
});

describe('canManageUser - last Super Admin', () => {
  const l1 = target(1);
  test('cannot delete, demote or deactivate the last active L1', () => {
    denied(canManageUser(actor(1, null, 1), l1, { action: 'delete' }, { activeL1Count: 1 }));
    denied(canManageUser(actor(1, null, 1), l1, { access_level: 2 }, { activeL1Count: 1 }));
    denied(canManageUser(actor(1, null, 1), l1, { is_active: false }, { activeL1Count: 1 }));
  });
  test('fails closed when the count was not provided', () => {
    denied(canManageUser(actor(1, null, 1), l1, { action: 'delete' }, {}));
  });
  test('allowed when another active L1 remains', () => {
    ok(canManageUser(actor(1, null, 1), l1, { action: 'delete' }, { activeL1Count: 2 }));
    ok(canManageUser(actor(1, null, 1), l1, { access_level: 2 }, { activeL1Count: 2 }));
  });
  test('an already-inactive L1 does not count towards the guard', () => {
    ok(canManageUser(actor(1, null, 1), target(1, null, 200, false), { action: 'delete' }, { activeL1Count: 1 }));
  });
});

describe('canManageUser - delete', () => {
  test('follows the same hierarchy as update', () => {
    ok(canManageUser(actor(2), target(5, 1), { action: 'delete' }));
    denied(canManageUser(actor(2), target(2, null, 201), { action: 'delete' }));
    ok(canManageUser(actor(3, 1), target(8, 1), { action: 'delete' }));
    denied(canManageUser(actor(3, 1), target(8, 2), { action: 'delete' }));
    denied(canManageUser(actor(3, 1), target(3, 1, 201), { action: 'delete' }));
  });
});
