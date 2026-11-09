/**
 * Daily alert rules for managers and admins (levels 1-5), evaluated inside the
 * recipient's own scope (taskWhere / projectWhere / timesheetWhere) so a manager
 * is only ever told about their venture. Plain SQL rules, no model involved.
 *
 *   hours       a person logged more than ALERT_MAX_HOURS_PER_DAY (14) in one day
 *   cluster     a project with at least ALERT_OVERDUE_CLUSTER (3) overdue tasks
 *   idle        an active project with no activity for ALERT_IDLE_DAYS (14) days
 *   unassigned  an overdue task none of whose assignees is still active
 *
 * A finding that stays true is announced again at most once a week
 * (table scheduler_alerts).
 */
const { pool } = require('../config/database');
const { scopeFor, projectWhere, taskWhere, timesheetWhere } = require('../utils/scope');
const Q = require('./assistant/queries');
const { createNotification } = require('./notification.service');
const { normalizePrefs, addDays } = require('./digest');

const num = (name, def) => {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v > 0 ? v : def;
};
const REALERT_DAYS = 7;

/** All current findings for this scope: [{ key, rule, text }]. */
const findAlerts = async (scope, { today = Q.todayIn() } = {}) => {
  if (!(scope.global || scope.isVentureAdmin)) return [];
  const maxHours = num('ALERT_MAX_HOURS_PER_DAY', 14);
  const clusterMin = num('ALERT_OVERDUE_CLUSTER', 3);
  const idleDays = num('ALERT_IDLE_DAYS', 14);
  const out = [];

  // 1. Timesheet anomalies: a day above the limit where a row was logged in the last 24 hours.
  {
    const { params, p } = Q.builder();
    const from = p(addDays(today, -7));
    const [rows] = await pool.query(
      `SELECT u.id AS user_id, u.full_name, to_char(t.date, 'YYYY-MM-DD') AS day, SUM(t.hours_worked) AS hours
       FROM timesheets t JOIN users u ON u.id = t.user_id
       WHERE ${timesheetWhere(scope, 't', params)} AND t.date >= ${from}::date
       GROUP BY u.id, u.full_name, t.date
       HAVING SUM(t.hours_worked) > ${p(maxHours)} AND MAX(t.created_at) >= CURRENT_TIMESTAMP - INTERVAL '1 day'
       ORDER BY t.date DESC LIMIT 20`,
      params
    );
    for (const r of rows) {
      out.push({
        key: `hours:${r.user_id}:${r.day}`, rule: 'hours',
        text: `${r.full_name} logged ${parseFloat(r.hours)} hours on ${r.day} (limit ${maxHours}). Check the timesheet.`,
      });
    }
  }

  // 2. Overdue clusters per project.
  {
    const { params, p } = Q.builder();
    const t = p(today);
    const [rows] = await pool.query(
      `SELECT pr.id, pr.name, COUNT(*)::int AS n
       FROM tasks t JOIN projects pr ON pr.id = t.project_id
       WHERE ${taskWhere(scope, 't', params)} AND ${projectWhere(scope, 'pr', params)} AND ${Q.overdueExpr('t', t)}
       GROUP BY pr.id, pr.name HAVING COUNT(*) >= ${p(clusterMin)} ORDER BY n DESC LIMIT 20`,
      params
    );
    for (const r of rows) out.push({ key: `cluster:${r.id}`, rule: 'cluster', text: `${r.name} has ${r.n} overdue tasks.` });
  }

  // 3. Active projects with no activity (project, task or timesheet changes) for N days.
  {
    const { params, p } = Q.builder();
    const cutoff = p(addDays(today, -idleDays));
    const [rows] = await pool.query(
      `SELECT x.id, x.name FROM (
         SELECT pr.id, pr.name,
           GREATEST(pr.created_at, pr.updated_at,
             COALESCE((SELECT MAX(tk.updated_at) FROM tasks tk WHERE tk.project_id = pr.id), pr.created_at),
             COALESCE((SELECT MAX(ts.created_at) FROM timesheets ts WHERE ts.project_id = pr.id), pr.created_at)) AS last_activity
         FROM projects pr WHERE ${projectWhere(scope, 'pr', params)} AND pr.status = 'active'
       ) x WHERE x.last_activity < ${cutoff}::date ORDER BY x.last_activity LIMIT 20`,
      params
    );
    for (const r of rows) out.push({ key: `idle:${r.id}`, rule: 'idle', text: `${r.name} has had no activity for ${idleDays} days.` });
  }

  // 4. Overdue tasks nobody active is working on.
  {
    const { params, p } = Q.builder();
    const t = p(today);
    const [rows] = await pool.query(
      `SELECT t.id, t.title, pr.name AS project_name
       FROM tasks t LEFT JOIN projects pr ON pr.id = t.project_id
       WHERE ${taskWhere(scope, 't', params)} AND ${Q.overdueExpr('t', t)}
         AND NOT EXISTS (SELECT 1 FROM task_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = t.id AND u.is_active)
         AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = t.assigned_to AND u.is_active)
       ORDER BY t.due_date LIMIT 20`,
      params
    );
    for (const r of rows) {
      out.push({ key: `unassigned:${r.id}`, rule: 'unassigned', text: `"${r.title}"${r.project_name ? ` (${r.project_name})` : ''} is overdue and has no active assignee.` });
    }
  }
  return out;
};

/** Findings not announced to this user in the last week. */
const unsent = async (userId, findings) => {
  if (!findings.length) return [];
  const [rows] = await pool.query(
    `SELECT finding_key FROM scheduler_alerts WHERE user_id = $1 AND finding_key = ANY($2::text[]) AND sent_at > CURRENT_TIMESTAMP - INTERVAL '${REALERT_DAYS} days'`,
    [userId, findings.map((f) => f.key)]
  );
  const seen = new Set(rows.map((r) => r.finding_key));
  return findings.filter((f) => !seen.has(f.key));
};

/** Evaluate the rules for every manager/admin and notify them. Returns { managers, notified, findings }. */
const runDailyAlerts = async ({ today = Q.todayIn(), dryRun = false } = {}) => {
  const [users] = await pool.query(
    'SELECT id, notification_preferences FROM users WHERE is_active = TRUE AND access_level <= 5 ORDER BY id'
  );
  const result = { managers: users.length, notified: 0, findings: 0, alerts: [] };
  for (const u of users) {
    if (!normalizePrefs(u.notification_preferences).alerts) continue;
    try {
      const scope = await scopeFor({ id: u.id });
      if (!scope) continue;
      const fresh = await unsent(u.id, await findAlerts(scope, { today }));
      if (!fresh.length) continue;
      result.findings += fresh.length;
      const shown = fresh.slice(0, 8);
      const text = [...shown.map((f) => `- ${f.text}`), ...(fresh.length > shown.length ? [`- and ${fresh.length - shown.length} more`] : [])].join('\n');
      const title = `${fresh.length} ${fresh.length === 1 ? 'thing needs' : 'things need'} attention`;
      result.alerts.push({ userId: u.id, title, text, keys: fresh.map((f) => f.key) });
      if (dryRun) continue;
      await createNotification(u.id, 'system', title, text, '/dashboard');
      for (const f of fresh) {
        await pool.query(
          `INSERT INTO scheduler_alerts (user_id, finding_key) VALUES ($1, $2)
           ON CONFLICT (user_id, finding_key) DO UPDATE SET sent_at = CURRENT_TIMESTAMP`,
          [u.id, f.key]
        );
      }
      result.notified += 1;
    } catch (err) {
      console.error(`[alerts] user ${u.id} failed:`, err.message);
    }
  }
  return result;
};

module.exports = { findAlerts, runDailyAlerts };
