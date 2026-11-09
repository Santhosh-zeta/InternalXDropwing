/**
 * The one place money is computed.
 *
 * Cost of a timesheet row = hours_worked x rate, where rate is
 *   project_members.rate (per-project override)  ->  users.hourly_rate  ->  NULL
 * When no rate is set the cost is NULL, never a guess: totals only add up rows
 * that have a rate and report the remaining hours as `unrated_hours`, so the
 * UI can say "12.5 h, no rate set" instead of showing an invented number.
 *
 * Every budget, timesheet, invoice and client-portal query builds its money
 * columns from the helpers below so they cannot drift apart.
 */

/** JOIN that attaches the optional per-project rate override to a timesheet alias. */
const rateJoin = (t = 't', pm = 'pmr') =>
  `LEFT JOIN project_members ${pm} ON ${pm}.project_id = ${t}.project_id AND ${pm}.user_id = ${t}.user_id`;

/** Effective hourly rate for the row (NULL if unset). Needs rateJoin + a users alias. */
const rateExpr = (u = 'u', pm = 'pmr') => `COALESCE(${pm}.rate, ${u}.hourly_rate)`;

/** Cost of a single timesheet row (NULL if no rate). */
const costExpr = (t = 't', u = 'u', pm = 'pmr') => `(${t}.hours_worked * ${rateExpr(u, pm)})`;

/** Aggregate columns: hours, cost (rated hours only), unrated_hours. Use inside GROUP BY queries. */
const sumColumns = (t = 't', u = 'u', pm = 'pmr') => `
  COALESCE(SUM(${t}.hours_worked), 0) AS hours,
  COALESCE(SUM(${costExpr(t, u, pm)}), 0) AS cost,
  COALESCE(SUM(CASE WHEN ${rateExpr(u, pm)} IS NULL THEN ${t}.hours_worked END), 0) AS unrated_hours`;

const num = (v) => (v === null || v === undefined ? 0 : Math.round(parseFloat(v) * 100) / 100);

/** Normalise the numeric strings pg returns for the sumColumns() columns. */
const money = (row, { cost = true } = {}) => {
  const out = { hours: num(row.hours), unrated_hours: num(row.unrated_hours) };
  if (cost) {
    out.cost = num(row.cost);
    out.rate_missing = out.unrated_hours > 0;
  }
  return out;
};

module.exports = { rateJoin, rateExpr, costExpr, sumColumns, money, num };
