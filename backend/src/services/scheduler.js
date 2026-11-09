/**
 * Tiny in-process scheduler (no new infrastructure). Enabled with
 * ENABLE_SCHEDULER=true; every SCHEDULER_TICK_MS (5 minutes) it checks the
 * clock in APP_TIMEZONE (default Asia/Kolkata) and runs, at most once each:
 *
 *   weekly_digest  Mondays from DIGEST_HOUR (default 8) onwards, key = that Monday's date
 *   daily_alerts   every day from ALERTS_HOUR (default 9) onwards, key = the date
 *
 * Multiple instances are safe: a Postgres advisory lock serialises them and the
 * job occurrence is claimed in scheduler_runs *before* it runs, so it is
 * at-most-once (a crash mid-run never causes a duplicate send; the next
 * occurrence runs normally).
 */
const { pgPool } = require('../config/database.pg');
const { runWeeklyDigest } = require('./digest');
const { runDailyAlerts } = require('./alerts');

const tz = () => process.env.APP_TIMEZONE || 'Asia/Kolkata';
const hourEnv = (name, def) => {
  const v = parseInt(process.env[name], 10);
  return Number.isInteger(v) && v >= 0 && v <= 23 ? v : def;
};

/** { date: 'YYYY-MM-DD', weekday: 'Mon', hour: 0-23 } for `now` in the app timezone. */
const localParts = (now = new Date(), zone = tz()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    }).formatToParts(now).map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday: parts.weekday, hour: parseInt(parts.hour, 10) };
};

/** Run `fn` once for (job, key) across all instances. Returns { ran, skipped?, result? }. */
const runOnce = async (job, key, fn) => {
  const client = await pgPool.connect();
  try {
    const { rows } = await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS ok', [`ix_scheduler_${job}`]);
    if (!rows[0].ok) return { ran: false, skipped: 'locked' };
    try {
      const claim = await client.query(
        'INSERT INTO scheduler_runs (job, run_key) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING run_key',
        [job, key]
      );
      if (claim.rowCount === 0) return { ran: false, skipped: 'already_ran' };
      return { ran: true, result: await fn() };
    } finally {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', [`ix_scheduler_${job}`]);
    }
  } finally {
    client.release();
  }
};

/** One scheduling decision. Exported for tests (pass `now` and job overrides). */
const tick = async ({ now = new Date(), jobs = { digest: runWeeklyDigest, alerts: runDailyAlerts } } = {}) => {
  const { date, weekday, hour } = localParts(now);
  const out = {};
  if (weekday === 'Mon' && hour >= hourEnv('DIGEST_HOUR', 8)) {
    out.digest = await runOnce('weekly_digest', date, () => jobs.digest({ today: date }));
  }
  if (hour >= hourEnv('ALERTS_HOUR', 9)) {
    out.alerts = await runOnce('daily_alerts', date, () => jobs.alerts({ today: date }));
  }
  return out;
};

let timer = null;

/** Starts the loop when ENABLE_SCHEDULER=true; returns the timer (or null). Safe to call twice. */
const startScheduler = () => {
  if (process.env.ENABLE_SCHEDULER !== 'true' || timer) return timer;
  const every = parseInt(process.env.SCHEDULER_TICK_MS, 10) || 5 * 60 * 1000;
  const safeTick = () => tick().catch((err) => console.error('[scheduler] tick failed:', err.message));
  timer = setInterval(safeTick, every);
  timer.unref();
  setTimeout(safeTick, 15000).unref();
  console.log(`[scheduler] enabled (${tz()}, tick ${Math.round(every / 1000)}s)`);
  return timer;
};

const stopScheduler = () => { if (timer) clearInterval(timer); timer = null; };

module.exports = { startScheduler, stopScheduler, tick, runOnce, localParts };
