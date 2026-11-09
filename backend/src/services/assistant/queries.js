/**
 * Scoped read queries shared by the assistant tools and the weekly digest.
 *
 * Every function takes the caller's scope (from utils/scope.js scopeFor) as its
 * first argument and ANDs the matching predicate into the SQL (taskWhere,
 * projectWhere, timesheetWhere, ...). No function accepts a venture or user id
 * to widen access: ids passed in (project_id) only narrow an already scoped
 * result. "Overdue" = not completed and the due date is before `today`
 * (a YYYY-MM-DD string in the app timezone, passed in so the app and the SQL
 * agree on what day it is).
 *
 * Nothing here writes to the database.
 */
const { pool } = require('../../config/database');
const {
  toId, projectWhere, taskWhere, timesheetWhere, ventureWhere, getAccessibleProject,
} = require('../../utils/scope');
const { rateJoin, sumColumns, money, num } = require('../../utils/rates');
const { userWhere, announcementWhere, search } = require('../search.service');

const TZ = () => process.env.APP_TIMEZONE || 'Asia/Kolkata';

/** Today's date (YYYY-MM-DD) in the app timezone. */
const todayIn = (tz = TZ(), now = new Date()) => now.toLocaleDateString('en-CA', { timeZone: tz });

/** Raised for a refusal the model should be told about (not a server fault). */
class ToolError extends Error {}

const TASK_STATUSES = ['pending', 'in-progress', 'completed'];
const clampLimit = (v, def = 20, max = 50) => Math.min(Math.max(parseInt(v, 10) || def, 1), max);
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Small param collector: `p(value)` returns the `$n` placeholder. */
const builder = () => {
  const params = [];
  return { params, p: (v) => { params.push(v); return `$${params.length}`; } };
};

const overdueExpr = (a, todayRef) =>
  `(${a}.status <> 'completed' AND ${a}.due_date IS NOT NULL AND ${a}.due_date::date < ${todayRef}::date)`;

const q = async (sql, params) => (await pool.query(sql, params))[0];

// ── tasks ────────────────────────────────────────────────────────────────────

const taskRows = (rows) => rows.map((r) => ({
  id: r.id, title: r.title, status: r.status, priority: r.priority,
  due_date: r.due_date ? new Date(r.due_date).toISOString().slice(0, 10) : null,
  project: r.project_name || null,
  ...(r.assignees !== undefined ? { assignees: r.assignees || '' } : {}),
  ...(r.overdue !== undefined ? { overdue: r.overdue, days_overdue: r.days_overdue } : {}),
}));

/** Tasks assigned to the caller (open by default). */
const myTasks = async (scope, { status = 'open', limit, today = todayIn() } = {}) => {
  if (status !== 'open' && status !== 'all' && !TASK_STATUSES.includes(status)) throw new ToolError('Invalid status');
  const { params, p } = builder();
  const t = p(today);
  const u = p(scope.userId);
  const where = [
    taskWhere(scope, 't', params),
    `(t.assigned_to = ${u} OR EXISTS (SELECT 1 FROM task_assignees mine WHERE mine.task_id = t.id AND mine.user_id = ${u}))`,
  ];
  if (status === 'open') where.push("t.status <> 'completed'");
  else if (status !== 'all') where.push(`t.status = ${p(status)}::task_status`);
  const lim = clampLimit(limit);
  const rows = await q(
    `SELECT t.id, t.title, t.status::text AS status, t.priority::text AS priority, t.due_date, pr.name AS project_name,
            ${overdueExpr('t', t)} AS overdue,
            GREATEST(0, (${t}::date - t.due_date::date))::int AS days_overdue,
            COUNT(*) OVER()::int AS total
     FROM tasks t LEFT JOIN projects pr ON pr.id = t.project_id
     WHERE ${where.join(' AND ')}
     ORDER BY overdue DESC, t.due_date ASC NULLS LAST, t.id DESC LIMIT ${lim}`,
    params
  );
  return { total: rows[0] ? rows[0].total : 0, tasks: taskRows(rows) };
};

/** Overdue tasks the caller can see, optionally narrowed to one project. */
const overdueTasks = async (scope, { projectId, limit, today = todayIn() } = {}) => {
  const { params, p } = builder();
  const t = p(today);
  const where = [taskWhere(scope, 't', params), overdueExpr('t', t)];
  if (projectId !== undefined && projectId !== null) {
    const id = toId(projectId);
    if (!id) throw new ToolError('Invalid project_id');
    where.push(`t.project_id = ${p(id)}`);
  }
  const rows = await q(
    `SELECT t.id, t.title, t.status::text AS status, t.priority::text AS priority, t.due_date, pr.name AS project_name,
            true AS overdue, GREATEST(0, (${t}::date - t.due_date::date))::int AS days_overdue,
            (SELECT string_agg(u.full_name, ', ') FROM task_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = t.id) AS assignees,
            COUNT(*) OVER()::int AS total
     FROM tasks t LEFT JOIN projects pr ON pr.id = t.project_id
     WHERE ${where.join(' AND ')}
     ORDER BY t.due_date ASC, t.id LIMIT ${clampLimit(limit)}`,
    params
  );
  return { total: rows[0] ? rows[0].total : 0, tasks: taskRows(rows) };
};

/** Open tasks, project end dates and milestones falling in the next `days` days. */
const upcomingDeadlines = async (scope, { days = 14, today = todayIn() } = {}) => {
  const span = Math.min(Math.max(parseInt(days, 10) || 14, 1), 90);
  const tasks = (() => {
    const { params, p } = builder();
    const t = p(today);
    const sql = `SELECT t.id, t.title, t.status::text AS status, t.priority::text AS priority, t.due_date, pr.name AS project_name,
        (SELECT string_agg(u.full_name, ', ') FROM task_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = t.id) AS assignees
      FROM tasks t LEFT JOIN projects pr ON pr.id = t.project_id
      WHERE ${taskWhere(scope, 't', params)} AND t.status <> 'completed' AND t.due_date IS NOT NULL
        AND t.due_date::date BETWEEN ${t}::date AND ${t}::date + ${span}
      ORDER BY t.due_date LIMIT 30`;
    return q(sql, params);
  })();
  const projects = (() => {
    const { params, p } = builder();
    const t = p(today);
    const sql = `SELECT pr.id, pr.name, pr.status::text AS status, pr.end_date FROM projects pr
      WHERE ${projectWhere(scope, 'pr', params)} AND pr.status <> 'completed' AND pr.end_date IS NOT NULL
        AND pr.end_date BETWEEN ${t}::date AND ${t}::date + ${span} ORDER BY pr.end_date LIMIT 20`;
    return q(sql, params);
  })();
  const milestones = (() => {
    const { params, p } = builder();
    const t = p(today);
    const sql = `SELECT m.id, m.title, m.due_date, pr.name AS project_name FROM project_milestones m
      JOIN projects pr ON pr.id = m.project_id
      WHERE ${projectWhere(scope, 'pr', params)} AND m.status <> 'completed' AND m.due_date IS NOT NULL
        AND m.due_date BETWEEN ${t}::date AND ${t}::date + ${span} ORDER BY m.due_date LIMIT 20`;
    return q(sql, params);
  })();
  const [tRows, pRows, mRows] = await Promise.all([tasks, projects, milestones]);
  const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
  return {
    window_days: span,
    tasks: taskRows(tRows),
    projects_ending: pRows.map((r) => ({ id: r.id, name: r.name, status: r.status, end_date: day(r.end_date) })),
    milestones: mRows.map((r) => ({ id: r.id, title: r.title, project: r.project_name, due_date: day(r.due_date) })),
  };
};

// ── projects ─────────────────────────────────────────────────────────────────

const PROJECT_STATUSES = ['planning', 'active', 'completed', 'on-hold'];

const listProjects = async (scope, { status, limit, today = todayIn() } = {}) => {
  const { params, p } = builder();
  const t = p(today);
  const where = [projectWhere(scope, 'pr', params)];
  if (status) {
    if (!PROJECT_STATUSES.includes(status)) throw new ToolError('Invalid status');
    where.push(`pr.status = ${p(status)}::project_status`);
  }
  // Task counts use the same task scope, so a staff member only counts their own tasks.
  const open = `(SELECT COUNT(*) FROM tasks t WHERE t.project_id = pr.id AND t.status <> 'completed' AND ${taskWhere(scope, 't', params)})::int`;
  const overdue = `(SELECT COUNT(*) FROM tasks t WHERE t.project_id = pr.id AND ${overdueExpr('t', t)} AND ${taskWhere(scope, 't', params)})::int`;
  const rows = await q(
    `SELECT pr.id, pr.name, pr.status::text AS status, pr.priority::text AS priority, pr.end_date,
            v.name AS venture, ${open} AS open_tasks, ${overdue} AS overdue_tasks, COUNT(*) OVER()::int AS total
     FROM projects pr LEFT JOIN ventures v ON v.id = pr.venture_id
     WHERE ${where.join(' AND ')}
     ORDER BY overdue_tasks DESC, pr.id DESC LIMIT ${clampLimit(limit)}`,
    params
  );
  return {
    total: rows[0] ? rows[0].total : 0,
    projects: rows.map((r) => ({
      id: r.id, name: r.name, status: r.status, priority: r.priority, venture: r.venture,
      end_date: r.end_date ? new Date(r.end_date).toISOString().slice(0, 10) : null,
      open_tasks: r.open_tasks, overdue_tasks: r.overdue_tasks,
    })),
  };
};

/** One project: task counts, members, milestones, hours. Null-equivalent error if not visible. */
const projectSummary = async (scope, { projectId, today = todayIn() } = {}) => {
  const project = await getAccessibleProject(scope, projectId);
  if (!project) throw new ToolError('Project not found or not visible to you');
  const tc = builder();
  const t = tc.p(today);
  const tasks = await q(
    `SELECT COUNT(*) FILTER (WHERE t.status = 'pending')::int AS pending,
            COUNT(*) FILTER (WHERE t.status = 'in-progress')::int AS in_progress,
            COUNT(*) FILTER (WHERE t.status = 'completed')::int AS completed,
            COUNT(*) FILTER (WHERE ${overdueExpr('t', t)})::int AS overdue,
            MAX(t.updated_at) AS last_task_activity
     FROM tasks t WHERE t.project_id = ${tc.p(project.id)} AND ${taskWhere(scope, 't', tc.params)}`,
    tc.params
  );
  const members = scope.isClient ? [] : await q(
    `SELECT u.full_name AS name, pm.role FROM project_members pm JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1 AND u.access_level <> 9 ORDER BY u.full_name LIMIT 30`,
    [project.id]
  );
  const milestones = await q(
    `SELECT title, due_date, status::text AS status FROM project_milestones WHERE project_id = $1 ORDER BY due_date NULLS LAST LIMIT 20`,
    [project.id]
  );
  const hb = builder();
  const hours = await q(
    `SELECT COALESCE(SUM(t.hours_worked), 0) AS hours FROM timesheets t
     WHERE t.project_id = ${hb.p(project.id)} AND ${timesheetWhere(scope, 't', hb.params)}`,
    hb.params
  );
  const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
  return {
    id: project.id, name: project.name, status: project.status, priority: project.priority,
    description: project.description || null,
    start_date: day(project.start_date), end_date: day(project.end_date),
    tasks: { pending: tasks[0].pending, in_progress: tasks[0].in_progress, completed: tasks[0].completed, overdue: tasks[0].overdue },
    last_task_activity: day(tasks[0].last_task_activity),
    members,
    milestones: milestones.map((m) => ({ title: m.title, due_date: day(m.due_date), status: m.status })),
    hours_logged_visible_to_you: num(hours[0].hours),
  };
};

// ── people / time ────────────────────────────────────────────────────────────

/** Open work per person. Venture admins and global users only; others get a refusal. */
const teamWorkload = async (scope, { today = todayIn() } = {}) => {
  if (!(scope.global || scope.isVentureAdmin)) throw new ToolError('Team workload is available to managers and above');
  const { params, p } = builder();
  const t = p(today);
  const rows = await q(
    `SELECT u.id, u.full_name AS name, u.designation,
            COUNT(x.task_id) FILTER (WHERE x.status <> 'completed')::int AS open_tasks,
            COUNT(x.task_id) FILTER (WHERE x.status = 'in-progress')::int AS in_progress,
            COUNT(x.task_id) FILTER (WHERE x.status <> 'completed' AND x.due_date IS NOT NULL AND x.due_date::date < ${t}::date)::int AS overdue_tasks
     FROM users u
     LEFT JOIN (
       SELECT ta.user_id, t.id AS task_id, t.status, t.due_date
       FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id
       WHERE ${taskWhere(scope, 't', params)}
     ) x ON x.user_id = u.id
     WHERE ${userWhere(scope, 'u', params)}
     GROUP BY u.id, u.full_name, u.designation
     ORDER BY open_tasks DESC, u.full_name LIMIT 50`,
    params
  );
  return { people: rows };
};

/** Hours by status / project / user / week in a date window. Own rows for staff; venture rows for managers. */
const timesheetSummary = async (scope, { from, to, groupBy = 'status', today = todayIn() } = {}) => {
  if (scope.isClient) throw new ToolError('Not available');
  if (from !== undefined && !isDate(from)) throw new ToolError('from must be YYYY-MM-DD');
  if (to !== undefined && !isDate(to)) throw new ToolError('to must be YYYY-MM-DD');
  const groups = {
    status: 't.status::text',
    project: "COALESCE(pr.name, '(no project)')",
    user: 'u.full_name',
    week: "to_char(date_trunc('week', t.date), 'YYYY-MM-DD')",
  };
  if (!groups[groupBy]) throw new ToolError('Invalid group_by');
  const { params, p } = builder();
  const where = [timesheetWhere(scope, 't', params)];
  const start = from || new Date(Date.parse(today) - 29 * 86400000).toISOString().slice(0, 10);
  const end = to || today;
  where.push(`t.date BETWEEN ${p(start)}::date AND ${p(end)}::date`);
  const rows = await q(
    `SELECT ${groups[groupBy]} AS bucket, COALESCE(SUM(t.hours_worked), 0) AS hours, COUNT(*)::int AS entries
     FROM timesheets t JOIN users u ON u.id = t.user_id LEFT JOIN projects pr ON pr.id = t.project_id
     WHERE ${where.join(' AND ')} GROUP BY bucket ORDER BY ${groupBy === 'week' ? 'bucket' : 'hours DESC'} LIMIT 40`,
    params
  );
  return {
    from: start, to: end, group_by: groupBy,
    scope_note: scope.global || scope.isVentureAdmin ? 'All timesheets you may see' : 'Your own timesheets only',
    total_hours: Math.round(rows.reduce((a, r) => a + parseFloat(r.hours), 0) * 100) / 100,
    rows: rows.map((r) => ({ bucket: r.bucket, hours: num(r.hours), entries: r.entries })),
  };
};

const listAnnouncements = async (scope, { limit } = {}) => {
  const { params } = builder();
  const rows = await q(
    `SELECT a.title, a.content, a.type, a.created_at FROM announcements a
     WHERE ${announcementWhere(scope, 'a', params)} ORDER BY a.created_at DESC LIMIT ${clampLimit(limit, 5, 10)}`,
    params
  );
  return { announcements: rows.map((r) => ({ title: r.title, content: r.content, type: r.type, posted: new Date(r.created_at).toISOString().slice(0, 10) })) };
};

const searchTool = async (scope, { query }) => {
  if (typeof query !== 'string' || query.trim().length < 2) throw new ToolError('query must be at least 2 characters');
  const { groups } = await search(scope, query, { limit: 5 });
  return { results: groups };
};

// ── finance (L<=4, mirrors routes/budget.routes.js and utils/rates.js) ───────

const requireFinance = (scope) => {
  if (scope.level > 4) throw new ToolError('Finance figures are available to levels 1-4 only');
};

/** Labour cost counts rated hours only; unrated hours are reported, never priced. */
const costOrNull = (m) => (m.hours > 0 && m.unrated_hours >= m.hours ? null : m.cost);
const financeNote = (m) => (m.rate_missing
  ? `${m.unrated_hours} hours have no hourly rate set and are NOT included in the cost.`
  : 'All logged hours have a rate.');

const financeSummary = async (scope) => {
  requireFinance(scope);
  const bp = [];
  const budgets = await q(
    `SELECT v.id, v.name AS venture, COALESCE(SUM(p.budget), 0) AS allocated_budget, COUNT(p.id)::int AS project_count
     FROM ventures v LEFT JOIN projects p ON p.venture_id = v.id
     WHERE ${ventureWhere(scope, 'v.id', bp)} GROUP BY v.id, v.name ORDER BY v.id`,
    bp
  );
  const ep = [];
  const spend = await q(
    `SELECT t.venture_id, ${sumColumns('t', 'u', 'pmr')} FROM timesheets t JOIN users u ON t.user_id = u.id ${rateJoin('t', 'pmr')}
     WHERE t.venture_id IS NOT NULL AND ${ventureWhere(scope, 't.venture_id', ep)} GROUP BY t.venture_id`,
    ep
  );
  const byVenture = new Map(spend.map((s) => [s.venture_id, money(s)]));
  return {
    currency_note: 'Amounts are in the account currency; budgets are project budgets, cost is labour only (hours x rate).',
    ventures: budgets.map((b) => {
      const m = byVenture.get(b.id) || { hours: 0, cost: 0, unrated_hours: 0, rate_missing: false };
      return {
        venture: b.venture, projects: b.project_count, allocated_budget: num(b.allocated_budget),
        labour_cost: costOrNull(m), hours: m.hours, unrated_hours: m.unrated_hours, caveat: financeNote(m),
      };
    }),
  };
};

const projectFinance = async (scope, { projectId } = {}) => {
  requireFinance(scope);
  const project = await getAccessibleProject(scope, projectId);
  if (!project) throw new ToolError('Project not found or not visible to you');
  const { params, p } = builder();
  const rows = await q(
    `SELECT ${sumColumns('t', 'u', 'pmr')} FROM timesheets t JOIN users u ON t.user_id = u.id ${rateJoin('t', 'pmr')}
     WHERE t.project_id = ${p(project.id)} AND ${timesheetWhere(scope, 't', params)}`,
    params
  );
  const m = money(rows[0]);
  const budget = num(project.budget);
  const cost = costOrNull(m);
  return {
    project: project.name, budget, labour_cost: cost, hours: m.hours, unrated_hours: m.unrated_hours,
    remaining: cost == null ? null : Math.round((budget - cost) * 100) / 100,
    caveat: financeNote(m),
  };
};

module.exports = {
  builder, overdueExpr, q,
  ToolError, todayIn, TASK_STATUSES, PROJECT_STATUSES,
  myTasks, overdueTasks, upcomingDeadlines, listProjects, projectSummary,
  teamWorkload, timesheetSummary, listAnnouncements, searchTool, financeSummary, projectFinance,
};
