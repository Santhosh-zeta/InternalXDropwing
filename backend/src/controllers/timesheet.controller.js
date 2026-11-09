const { pool } = require('../config/database');
const { logAudit } = require('../services/audit.service');
const {
  toId, timesheetWhere, ventureWhere, getAccessibleProject, getAccessibleTask, getAccessibleTimesheet,
} = require('../utils/scope');
const { rateJoin, rateExpr, sumColumns, money } = require('../utils/rates');

const fail = (res, status, message) => res.status(status).json({ success: false, message });

/**
 * Hours are logged against the caller. Venture/project are DERIVED, never taken
 * from the request as a venture id: the task (if given) decides the project,
 * the project decides the venture, and without either it is the caller's own
 * venture. Both must be visible to the caller.
 */
exports.logHours = async (req, res, next) => {
  try {
    const { scope } = req;
    if (scope.isClient) return fail(res, 403, 'Clients cannot log hours');
    const { taskId, projectId, hours, activityDate, notes } = req.body;

    if (!hours || hours <= 0) return fail(res, 400, 'Invalid hours logged');

    let project = null;
    let ventureId = scope.ventureId;
    let resolvedTaskId = null;

    if (taskId) {
      const task = await getAccessibleTask(scope, taskId);
      if (!task) return fail(res, 404, 'Task not found');
      resolvedTaskId = task.id;
      if (task.project_id) {
        project = await getAccessibleProject(scope, task.project_id);
        if (!project) return fail(res, 404, 'Project not found');
      }
      ventureId = task.venture_id;
      if (projectId && toId(projectId) !== task.project_id) return fail(res, 400, 'Project does not match the task');
    } else if (projectId) {
      project = await getAccessibleProject(scope, projectId);
      if (!project) return fail(res, 404, 'Project not found');
    }
    if (project) ventureId = project.venture_id;
    // A venture-less global user logging against nothing gets a venture-less row.

    const [result] = await pool.query(
      `INSERT INTO timesheets (user_id, task_id, project_id, venture_id, hours_worked, date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [scope.userId, resolvedTaskId, project ? project.id : null, ventureId || null, hours, activityDate, notes || '']
    );
    const [inserted] = await pool.query('SELECT * FROM timesheets WHERE id = ?', [result.insertId]);

    res.status(201).json({ success: true, data: inserted[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * Visible timesheets (see timesheetWhere): global all, L3-5 own venture, L6-8
 * own rows only, clients none. Rate and cost are only included for L<=3.
 */
exports.getTimesheets = async (req, res, next) => {
  try {
    const { scope } = req;
    if (scope.isClient) return fail(res, 403, 'Not available for client accounts');
    const params = [];
    const where = timesheetWhere(scope, 't', params);
    const [timesheets] = await pool.query(`
      SELECT t.*,
             u.full_name as user_name, u.access_level,
             p.name as project_name,
             ts.title as task_title,
             v.name as venture_name, v.primary_color as venture_color,
             ${rateExpr('u', 'pmr')} AS effective_rate
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      ${rateJoin('t', 'pmr')}
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN tasks ts ON t.task_id = ts.id
      LEFT JOIN ventures v ON t.venture_id = v.id
      WHERE ${where}
      ORDER BY t.date DESC, t.created_at DESC
    `, params);

    const data = timesheets.map(({ effective_rate, ...t }) => {
      if (!scope.canSeeRates) return t;
      const rate = effective_rate == null ? null : parseFloat(effective_rate);
      return {
        ...t,
        hourly_rate: rate,
        total_cost: rate == null ? null : Math.round(parseFloat(t.hours_worked) * rate * 100) / 100,
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * Approve / reject. Needs L<=5, the sheet must be inside the caller's scope,
 * and nobody approves their own hours or those of someone more senior.
 */
exports.updateStatus = async (req, res, next) => {
  try {
    const { scope } = req;
    const { status } = req.body;

    if (!scope.global && !scope.isVentureAdmin) return fail(res, 403, 'Not authorized to approve timesheets');
    if (!['approved', 'rejected'].includes(status)) return fail(res, 400, 'Invalid status');

    const sheet = await getAccessibleTimesheet(scope, req.params.id);
    if (!sheet) return fail(res, 404, 'Timesheet not found');
    if (sheet.user_id === scope.userId) return fail(res, 403, 'You cannot approve your own timesheet');

    const [owner] = await pool.query('SELECT access_level FROM users WHERE id = $1', [sheet.user_id]);
    if (owner[0] && owner[0].access_level < scope.level) {
      return fail(res, 403, 'You cannot approve the timesheet of someone more senior');
    }

    await pool.query('UPDATE timesheets SET status = ?, approved_by = ? WHERE id = ?', [status, scope.userId, sheet.id]);
    await logAudit(scope.userId, 'TIMESHEET_' + status.toUpperCase(), 'timesheet', sheet.id, { owner: sheet.user_id });

    res.json({ success: true, message: `Timesheet ${status}` });
  } catch (err) {
    next(err);
  }
};

/** Approved hours and cost per venture, from the one rate source (utils/rates.js). */
exports.getFinancials = async (req, res, next) => {
  try {
    const { scope } = req;
    if (!scope.canSeeCost) return fail(res, 403, 'Not authorized');

    const params = [];
    const where = ventureWhere(scope, 't.venture_id', params);
    const [rows] = await pool.query(`
      SELECT t.venture_id, v.name AS venture_name, ${sumColumns('t', 'u', 'pmr')}
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      ${rateJoin('t', 'pmr')}
      LEFT JOIN ventures v ON t.venture_id = v.id
      WHERE t.status = 'approved' AND ${where}
      GROUP BY t.venture_id, v.name
      ORDER BY v.name
    `, params);

    const byVenture = rows.map((r) => ({
      venture_id: r.venture_id,
      name: r.venture_name || 'Global Operations',
      ...money(r),
    }));
    const total = byVenture.reduce(
      (a, v) => ({ hours: a.hours + v.hours, cost: a.cost + v.cost, unrated_hours: a.unrated_hours + v.unrated_hours }),
      { hours: 0, cost: 0, unrated_hours: 0 }
    );

    res.json({
      success: true,
      data: {
        byVenture: byVenture.map(({ venture_id, name, hours, cost, rate_missing, unrated_hours }) => ({ venture_id, name, hours, cost, unrated_hours, rate_missing })),
        global: {
          totalHours: total.hours,
          totalCost: Math.round(total.cost * 100) / 100,
          unratedHours: total.unrated_hours,
          rateMissing: total.unrated_hours > 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
