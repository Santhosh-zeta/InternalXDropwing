const { pool } = require('../config/database');
const { toId, ventureWhere } = require('../utils/scope');
const { rateJoin, rateExpr, costExpr, sumColumns, money, num } = require('../utils/rates');

/**
 * Invoices are derived from approved timesheets, grouped by venture and month,
 * and priced from the one rate source (utils/rates.js): project rate override,
 * else the person's hourly rate. Hours without a rate are reported as
 * `unrated_hours` and add nothing to the amount - nothing is invented.
 *
 * Who sees what:
 *   - L1/L2   every venture
 *   - L3-L5   their own venture
 *   - L6-L8   no finance data (403)
 *   - L9      only lines on projects they are a member of
 */
const fail = (res, status, message) => res.status(status).json({ success: false, message });

/** SQL scoping for the invoice source rows (alias t = timesheets). */
const invoiceScope = (scope, params) => {
  if (scope.isClient) {
    params.push(scope.projectIds);
    return `t.project_id = ANY($${params.length}::int[])`;
  }
  return ventureWhere(scope, 't.venture_id', params);
};

const allowed = (scope) => scope.isClient || scope.canSeeCost;

exports.getInvoices = async (req, res, next) => {
  try {
    const { scope } = req;
    if (!allowed(scope)) return fail(res, 403, 'Not authorized to view invoices');

    const params = [];
    const where = invoiceScope(scope, params);
    const [results] = await pool.query(`
      SELECT
        t.venture_id,
        v.name as venture_name,
        TO_CHAR(t.date, 'YYYY-MM') as invoice_month,
        COUNT(t.id) as timesheet_count,
        ${sumColumns('t', 'u', 'pmr')}
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      ${rateJoin('t', 'pmr')}
      JOIN ventures v ON t.venture_id = v.id
      WHERE t.status = 'approved' AND ${where}
      GROUP BY t.venture_id, v.name, invoice_month
      ORDER BY invoice_month DESC
    `, params);

    const invoices = results.map((row) => {
      const m = money(row);
      return {
        id: `INV-${row.venture_id}-${row.invoice_month}`,
        invoice_number: `INV-${row.venture_id}-${row.invoice_month.replace('-', '')}`,
        venture_id: row.venture_id,
        venture_name: row.venture_name,
        month: row.invoice_month,
        total_hours: m.hours,
        total_amount: m.cost,
        unrated_hours: m.unrated_hours,
        rate_missing: m.rate_missing,
        timesheet_count: parseInt(row.timesheet_count, 10),
        status: 'Unpaid', // payment tracking is not modelled yet
        issue_date: `${row.invoice_month}-28`,
      };
    });

    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
};

exports.getInvoiceDetails = async (req, res, next) => {
  try {
    const { scope } = req;
    if (!allowed(scope)) return fail(res, 403, 'Not authorized to view invoices');

    const parts = req.params.id.split('-'); // INV-ventureId-YYYY-MM
    if (parts.length !== 4) return fail(res, 400, 'Invalid invoice ID format');
    const ventureId = toId(parts[1]);
    const month = `${parts[2]}-${parts[3]}`;
    if (!ventureId) return fail(res, 400, 'Invalid invoice ID format');

    // The venture in the id is only a lookup key: the scope predicate decides
    // what rows come back, so a foreign venture id simply yields "not found".
    const params = [ventureId, month];
    const where = invoiceScope(scope, params);
    const [timesheets] = await pool.query(`
      SELECT t.id, t.date, t.hours_worked, t.notes,
             u.full_name AS user_name,
             p.name AS project_name,
             ts.title AS task_title,
             ${rateExpr('u', 'pmr')} AS rate,
             ${costExpr('t', 'u', 'pmr')} AS amount
      FROM timesheets t
      JOIN users u ON t.user_id = u.id
      ${rateJoin('t', 'pmr')}
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN tasks ts ON t.task_id = ts.id
      WHERE t.status = 'approved' AND t.venture_id = $1 AND TO_CHAR(t.date, 'YYYY-MM') = $2 AND ${where}
      ORDER BY t.date ASC
    `, params);

    if (timesheets.length === 0) return fail(res, 404, 'Invoice not found');

    let totalHours = 0;
    let totalAmount = 0;
    let unrated = 0;
    const items = timesheets.map((t) => {
      const hours = num(t.hours_worked);
      totalHours += hours;
      const hasRate = t.rate != null;
      if (hasRate) totalAmount += parseFloat(t.amount); else unrated += hours;
      return {
        id: t.id,
        date: t.date,
        developer: t.user_name,
        project: t.project_name || 'General Deliverables',
        task: t.task_title || t.notes,
        hours,
        // The per-line rate is internal pricing detail: only L<=3 staff see it.
        ...(scope.canSeeRates ? { rate: hasRate ? num(t.rate) : null } : {}),
        amount: hasRate ? num(t.amount) : null,
      };
    });

    const [venture] = await pool.query('SELECT name, logo_url, primary_color FROM ventures WHERE id = ?', [ventureId]);

    res.json({
      success: true,
      data: {
        id: req.params.id,
        invoice_number: `INV-${ventureId}-${month.replace('-', '')}`,
        month,
        venture_name: venture.length ? venture[0].name : 'Unknown Venture',
        items,
        total_hours: Math.round(totalHours * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
        unrated_hours: Math.round(unrated * 100) / 100,
        rate_missing: unrated > 0,
        // Blended rate over the priced hours (rates can differ per person); null if nothing is priced.
        billing_rate: totalHours - unrated > 0 ? Math.round((totalAmount / (totalHours - unrated)) * 100) / 100 : null,
        issue_date: `${month}-28`,
        due_date: new Date(new Date(`${month}-28`).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    });
  } catch (err) {
    next(err);
  }
};
