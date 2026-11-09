/**
 * Data-scope: the single source of truth for "who may see / touch what".
 *
 * Access model (see docs/ACCESS_MODEL.md):
 *   - Global        level <= 2     every venture, every row.
 *   - Venture admin level 3..5     own venture only (users.venture_id), all of its data.
 *   - Venture staff level 6..8     own venture, but only projects they are a member of,
 *                                  tasks assigned to / created by them, own timesheets.
 *   - Client        level 9        only projects they are a member of, client-safe data only
 *                                  (tasks assigned to them, documents flagged client_visible,
 *                                  invoices for their projects). No internal chat.
 *
 * Nothing here trusts the request body or the (possibly stale) JWT claims for
 * authorisation: `scopeFor` re-reads level / venture / activity / project
 * membership from the database once per request.
 *
 * Every *Where(scope, alias, params) helper returns a SQL fragment using
 * numbered placeholders ($n), pushing its values onto `params`. Callers AND it
 * into their own query, so list endpoints and single-row checks share exactly
 * the same rule.
 */
const { pool } = require('../config/database');

const GLOBAL_MAX_LEVEL = 2;
const VENTURE_ADMIN_MAX_LEVEL = 5;
const CLIENT_LEVEL = 9;

/** Positive integer or null. Never throws; used for every id that arrives as text. */
const toId = (v) => {
  if (typeof v === 'number') return Number.isInteger(v) && v > 0 ? v : null;
  if (typeof v === 'string' && /^[1-9]\d{0,9}$/.test(v)) return parseInt(v, 10);
  return null;
};

/** Pure constructor — no I/O, unit-testable. */
const buildScope = ({ userId, level, ventureId = null, projectIds = [] }) => {
  const lvl = Number(level);
  const global = lvl <= GLOBAL_MAX_LEVEL;
  const isClient = lvl === CLIENT_LEVEL;
  const vId = ventureId == null ? null : Number(ventureId);
  return {
    userId: Number(userId),
    level: lvl,
    global,
    isClient,
    isInternal: !isClient,
    isVentureAdmin: lvl > GLOBAL_MAX_LEVEL && lvl <= VENTURE_ADMIN_MAX_LEVEL,
    isStaff: lvl > VENTURE_ADMIN_MAX_LEVEL && lvl < CLIENT_LEVEL,
    ventureId: vId,
    // Ventures the user may reach through their own venture membership.
    // Global users reach all of them; `global` is the authoritative flag.
    ventureIds: global || isClient || vId == null ? [] : [vId],
    projectIds: projectIds.map(Number),
    // Cost / money visibility (derived from the hourly-rate source, see utils/rates.js).
    canSeeCost: lvl <= VENTURE_ADMIN_MAX_LEVEL,
    canSeeRates: lvl <= 3,
    canSetRates: lvl <= 3,
  };
};

/**
 * Load the caller's scope fresh from the DB. Returns null if the account no
 * longer exists or is deactivated (callers answer 401).
 */
const scopeFor = async (user) => {
  const id = toId(user && user.id);
  if (!id) return null;
  const [rows] = await pool.query(
    'SELECT id, access_level, venture_id, is_active FROM users WHERE id = $1',
    [id]
  );
  const row = rows[0];
  if (!row || row.is_active === false) return null;
  let projectIds = [];
  if (row.access_level > GLOBAL_MAX_LEVEL) {
    const [pm] = await pool.query('SELECT project_id FROM project_members WHERE user_id = $1', [id]);
    projectIds = pm.map((r) => r.project_id);
  }
  return buildScope({
    userId: row.id,
    level: row.access_level,
    ventureId: row.venture_id,
    projectIds,
  });
};

/** Express middleware: run after `authenticate`. Sets req.scope. */
const withScope = async (req, res, next) => {
  try {
    const scope = await scopeFor(req.user);
    if (!scope) {
      return res.status(401).json({ success: false, message: 'Account not found or deactivated' });
    }
    req.scope = scope;
    next();
  } catch (err) {
    next(err);
  }
};

/** Reject clients from an internal-only route. */
const internalOnly = (req, res, next) => {
  if (req.scope && req.scope.isClient) {
    return res.status(403).json({ success: false, message: 'Not available for client accounts' });
  }
  next();
};

/** Reject everyone below `maxLevel` power (level number > maxLevel). */
const atLeast = (maxLevel) => (req, res, next) => {
  if (!req.scope || req.scope.level > maxLevel) {
    return res.status(403).json({ success: false, message: 'Insufficient access level' });
  }
  next();
};

// ── SQL predicates ───────────────────────────────────────────────────────────

const push = (params, value) => {
  params.push(value);
  return `$${params.length}`;
};

const intArray = (params, ids) => `${push(params, ids)}::int[]`;

/** Generic venture column filter. Clients never match on venture alone. */
const ventureWhere = (scope, column, params) => {
  if (scope.global) return 'TRUE';
  if (scope.isClient || scope.ventureId == null) return 'FALSE';
  return `${column} = ${push(params, scope.ventureId)}`;
};

const projectWhere = (scope, a, params) => {
  if (scope.global) return 'TRUE';
  if (scope.isClient) return `${a}.id = ANY(${intArray(params, scope.projectIds)})`;
  if (scope.ventureId == null) return 'FALSE';
  const v = push(params, scope.ventureId);
  if (scope.isVentureAdmin) return `${a}.venture_id = ${v}`;
  return `(${a}.venture_id = ${v} AND ${a}.id = ANY(${intArray(params, scope.projectIds)}))`;
};

const ownTask = (a, u) =>
  `(${a}.assigned_to = ${u} OR ${a}.assigned_by = ${u} OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = ${a}.id AND ta.user_id = ${u}))`;

const taskWhere = (scope, a, params) => {
  if (scope.global) return 'TRUE';
  const u = push(params, scope.userId);
  if (scope.isClient) {
    // Deliverables only: tasks explicitly assigned to the client, inside a project they belong to.
    return `(${a}.project_id = ANY(${intArray(params, scope.projectIds)}) AND EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = ${a}.id AND ta.user_id = ${u}))`;
  }
  if (scope.ventureId == null) return ownTask(a, u);
  const v = push(params, scope.ventureId);
  const inVenture = `(${a}.venture_id = ${v} OR EXISTS (SELECT 1 FROM projects pp WHERE pp.id = ${a}.project_id AND pp.venture_id = ${v}))`;
  if (scope.isVentureAdmin) return `(${inVenture} OR ${ownTask(a, u)})`;
  return `(${ownTask(a, u)} OR (${inVenture} AND ${a}.project_id = ANY(${intArray(params, scope.projectIds)})))`;
};

const timesheetWhere = (scope, a, params) => {
  if (scope.global) return 'TRUE';
  if (scope.isClient) return 'FALSE';
  const u = push(params, scope.userId);
  if (scope.isVentureAdmin && scope.ventureId != null) {
    return `(${a}.venture_id = ${push(params, scope.ventureId)} OR ${a}.user_id = ${u})`;
  }
  return `${a}.user_id = ${u}`;
};

const documentWhere = (scope, a, params) => {
  if (scope.global) return 'TRUE';
  if (scope.isClient) {
    return `(${a}.project_id = ANY(${intArray(params, scope.projectIds)}) AND ${a}.client_visible = TRUE)`;
  }
  const u = push(params, scope.userId);
  if (scope.ventureId == null) return `(${a}.uploaded_by = ${u} OR ${a}.venture_id IS NULL)`;
  const v = push(params, scope.ventureId);
  if (scope.isVentureAdmin) return `(${a}.venture_id = ${v} OR ${a}.venture_id IS NULL OR ${a}.uploaded_by = ${u})`;
  return `(${a}.uploaded_by = ${u} OR ${a}.venture_id IS NULL OR (${a}.venture_id = ${v} AND (${a}.project_id IS NULL OR ${a}.project_id = ANY(${intArray(params, scope.projectIds)}))))`;
};

// ── Single-row checks (same predicates as the list queries) ──────────────────

/** Venture-level check for a venture id taken from a stored row (not the request). */
const canAccessVenture = (scope, ventureId) => {
  if (scope.global) return true;
  if (scope.isClient) return false;
  const id = toId(ventureId);
  return id != null && scope.ventureId === id;
};

const fetchOne = async (table, alias, where, scope, id, columns = `${alias}.*`) => {
  const key = toId(id);
  if (!key) return null;
  const params = [key];
  const pred = where(scope, alias, params);
  const [rows] = await pool.query(
    `SELECT ${columns} FROM ${table} ${alias} WHERE ${alias}.id = $1 AND ${pred}`,
    params
  );
  return rows[0] || null;
};

/** The project row if the caller may see it, else null. */
const getAccessibleProject = (scope, id) => fetchOne('projects', 'p', projectWhere, scope, id);
const canAccessProject = async (scope, id) => !!(await getAccessibleProject(scope, id));

/** The task row (with assignee_ids) if the caller may see it, else null. */
const getAccessibleTask = (scope, id) =>
  fetchOne(
    'tasks', 't', taskWhere, scope, id,
    `t.*, COALESCE((SELECT array_agg(ta.user_id) FROM task_assignees ta WHERE ta.task_id = t.id), '{}') AS assignee_ids`
  );
const canAccessTask = async (scope, id) => !!(await getAccessibleTask(scope, id));

/**
 * Write rights on an already-visible task row: venture admins and global users
 * edit anything they can see; staff edit only tasks they are on / created.
 */
const canWriteTask = (scope, task) => {
  if (!task || scope.isClient) return false;
  if (scope.global || scope.isVentureAdmin) return true;
  return task.assigned_by === scope.userId
    || task.assigned_to === scope.userId
    || (task.assignee_ids || []).includes(scope.userId);
};

const getAccessibleTimesheet = (scope, id) => fetchOne('timesheets', 't', timesheetWhere, scope, id);

/** Document row by id or stored path, if the caller may read it. */
const getAccessibleDocument = async (scope, { id, path }) => {
  const params = [];
  const pred = documentWhere(scope, 'd', params);
  const col = id != null ? 'id' : 'path';
  const key = id != null ? toId(id) : path;
  if (key == null) return null;
  params.push(key);
  const [rows] = await pool.query(
    `SELECT d.* FROM documents d WHERE d.${col} = $${params.length} AND ${pred} LIMIT 1`,
    params
  );
  return rows[0] || null;
};

// ── Chat ─────────────────────────────────────────────────────────────────────

/**
 * Parse a chat target from client input into a validated, canonical channel or
 * null. Clients get no internal chat at all. Rooms:
 *   { kind:'global' }                       room 'global'
 *   { kind:'venture', ventureId }           room 'venture_<id>'
 *   { kind:'dm', userId }                   (other user, already validated)
 */
const canUseVentureChannel = (scope, ventureId) => {
  if (scope.isClient) return false;
  if (ventureId === 'global' || ventureId === null) return true;
  const id = toId(ventureId);
  if (!id) return false;
  return scope.global || scope.ventureId === id;
};

/** May `scope` DM user `otherId`? Internal <-> internal, same venture or either side global. */
const canDirectMessage = async (scope, otherId) => {
  const id = toId(otherId);
  if (!id || scope.isClient || id === scope.userId) return false;
  const [rows] = await pool.query(
    'SELECT access_level, venture_id, is_active FROM users WHERE id = $1',
    [id]
  );
  const o = rows[0];
  if (!o || o.is_active === false || o.access_level === CLIENT_LEVEL) return false;
  return scope.global || o.access_level <= GLOBAL_MAX_LEVEL || (scope.ventureId != null && o.venture_id === scope.ventureId);
};

/** Room name for a venture channel id ('global' | number). */
const ventureRoom = (ventureId) => (ventureId === 'global' || ventureId == null ? 'global' : `venture_${ventureId}`);
const dmRoom = (userId) => `dm_${userId}`;

/** Validate a socket room join against scope. Own dm room only. */
const canJoinRoom = (scope, room) => {
  if (typeof room !== 'string' || scope.isClient) return false;
  if (room === 'global') return true;
  let m = /^venture_(\d+)$/.exec(room);
  if (m) return canUseVentureChannel(scope, m[1]);
  m = /^dm_(\d+)$/.exec(room);
  return !!m && Number(m[1]) === scope.userId;
};

module.exports = {
  toId,
  buildScope,
  scopeFor,
  withScope,
  internalOnly,
  atLeast,
  ventureWhere,
  projectWhere,
  taskWhere,
  timesheetWhere,
  documentWhere,
  canAccessVenture,
  getAccessibleProject,
  canAccessProject,
  getAccessibleTask,
  canAccessTask,
  canWriteTask,
  getAccessibleTimesheet,
  getAccessibleDocument,
  canUseVentureChannel,
  canDirectMessage,
  canJoinRoom,
  ventureRoom,
  dmRoom,
};
