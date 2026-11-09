/**
 * The single authority on "may this actor create / change / delete that user?".
 * Every user mutation route calls it; nothing else decides.
 *
 * Levels: 1 Super Admin, 2 Managing Director (both global, venture NULL),
 * 3 Admin, 4 CXO, 5 Manager, 6 Exec Staff, 7 Staff, 8 Intern, 9 Client.
 * Lower number = more power.
 *
 * Rules
 *   - Only L1, L2, L3 manage users at all.
 *   - L1 may manage anyone (including other L1s) and set any level/venture.
 *   - L2 and L3 may only act on users strictly BELOW their own level, and may
 *     only grant levels strictly below their own (no promotion to or past
 *     their own rank).
 *   - L3 is confined to its own venture: it may only touch users of that
 *     venture, create users into that venture, and can never move anyone
 *     between ventures (venture changes are L1/L2 only).
 *   - Nobody can change their own level/venture/active flag or delete themselves.
 *   - The last active L1 can never be deleted, demoted or deactivated.
 *   - Levels 1-2 are global (no venture); levels 3-9 must belong to a venture.
 *
 * @param {{id:number, accessLevel:number, ventureId:?number}} actor  from the JWT
 * @param {?{id:number, access_level:number, venture_id:?number}} target  the stored
 *        user, or null when creating
 * @param {object} patch
 *        action: 'create' | 'update' | 'delete' (default: create if target is
 *                null, otherwise update)
 *        access_level, venture_id, is_active: the requested new values
 *        (undefined = unchanged; venture_id 0/null = no venture)
 * @param {{activeL1Count?:number}} ctx  database facts the caller looked up
 * @returns {{ok:true} | {ok:false, status:number, message:string}}
 */
const deny = (message, status = 403) => ({ ok: false, status, message });

const toNumOrNull = (v) => (v === null || v === undefined || v === 0 || v === '0' || v === '' ? null : Number(v));

const canManageUser = (actor, target, patch = {}, ctx = {}) => {
  if (!actor || !Number.isInteger(actor.accessLevel)) return deny('Authentication required', 401);

  const action = patch.action || (target ? 'update' : 'create');
  const actorLevel = actor.accessLevel;
  const actorVenture = toNumOrNull(actor.ventureId);

  if (actorLevel > 3) return deny('Your access level cannot manage users');
  if (action !== 'create' && !target) return deny('User not found', 404);

  const wantsLevel = patch.access_level !== undefined && patch.access_level !== null;
  const newLevel = wantsLevel ? Number(patch.access_level) : null;
  if (wantsLevel && (!Number.isInteger(newLevel) || newLevel < 1 || newLevel > 9)) {
    return deny('Invalid access level', 400);
  }
  const wantsVenture = patch.venture_id !== undefined;
  const newVenture = wantsVenture ? toNumOrNull(patch.venture_id) : undefined;
  const wantsActive = patch.is_active !== undefined && patch.is_active !== null;
  const deactivating = wantsActive && (patch.is_active === false || patch.is_active === 'false');

  if (action === 'create') {
    if (!wantsLevel) return deny('access_level is required', 400);
    if (actorLevel > 1 && newLevel <= actorLevel) {
      return deny('You can only create users below your own access level');
    }
    if (actorLevel === 3) {
      if (actorVenture === null) return deny('Your account has no venture');
      if (newVenture !== undefined && newVenture !== null && newVenture !== actorVenture) {
        return deny('You can only create users in your own venture');
      }
    }
    const venture = actorLevel === 3 ? actorVenture : (newVenture ?? null);
    if (newLevel <= 2 && venture !== null) return deny('Global levels (1-2) cannot belong to a venture', 400);
    if (newLevel >= 3 && venture === null) return deny('A venture is required for access levels 3-9', 400);
    return { ok: true };
  }

  // ── update / delete of an existing user ────────────────────────────────
  const isSelf = Number(actor.id) === Number(target.id);

  if (action === 'delete' && isSelf) return deny('You cannot delete your own account');
  if (isSelf && (wantsLevel && newLevel !== target.access_level)) return deny('You cannot change your own access level');
  if (isSelf && wantsVenture && newVenture !== toNumOrNull(target.venture_id)) return deny('You cannot change your own venture');
  if (isSelf && deactivating) return deny('You cannot deactivate your own account');

  if (actorLevel > 1) {
    if (target.access_level <= actorLevel) return deny('Cannot manage users at or above your own level');
    if (actorLevel === 3 && toNumOrNull(target.venture_id) !== actorVenture) {
      return deny('Cannot manage users outside your venture');
    }
    if (wantsLevel && newLevel <= actorLevel) return deny('Cannot grant an access level at or above your own');
  }

  if (wantsVenture && newVenture !== toNumOrNull(target.venture_id)) {
    if (actorLevel > 2) return deny('Only a Super Admin or Managing Director can change a venture');
  }

  // Result state must be coherent when level or venture is being touched.
  const levelChanged = wantsLevel && newLevel !== target.access_level;
  const ventureChanged = wantsVenture && newVenture !== toNumOrNull(target.venture_id);
  if (action === 'update' && (levelChanged || ventureChanged)) {
    const level = wantsLevel ? newLevel : target.access_level;
    const venture = wantsVenture ? newVenture : toNumOrNull(target.venture_id);
    if (level <= 2 && venture !== null) return deny('Global levels (1-2) cannot belong to a venture', 400);
    if (level >= 3 && venture === null) return deny('A venture is required for access levels 3-9', 400);
  }

  // Last active L1 protection.
  if (target.access_level === 1 && target.is_active !== false) {
    const demoting = wantsLevel && newLevel !== 1;
    const removing = action === 'delete' || deactivating;
    if ((demoting || removing) && (ctx.activeL1Count === undefined || ctx.activeL1Count <= 1)) {
      return deny('The last Super Admin cannot be deleted, demoted or deactivated');
    }
  }

  return { ok: true };
};

module.exports = { canManageUser };
