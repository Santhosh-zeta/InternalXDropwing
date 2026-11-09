/**
 * Startup / on-demand self-check: is this install configured well enough to be used?
 *
 * Each check reports { id, label, status: 'ok' | 'warn' | 'missing', detail, fix }.
 *   ok       works as configured
 *   warn     works, but degraded or risky (or an optional feature is off)
 *   missing  something needed for normal use is absent or broken
 * `detail` and `fix` are one-liners and NEVER contain secret values (only whether they are set).
 *
 * Logged at boot (server.js) and served to L1/L2 at GET /api/admin/system-status.
 */
const fs = require('fs');
const path = require('path');
const { validateConfig } = require('./env');
const { allowedEmailDomains } = require('../utils/emailDomains');
const { schedulerEnabled } = require('../services/scheduler');

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');
const SMTP_VERIFY_TIMEOUT_MS = 8000;
const SMTP_CACHE_MS = 60 * 1000;

const check = (id, label, status, detail, fix = '') => ({ id, label, status, detail, fix });
const isProd = (env) => env.NODE_ENV === 'production';
const set = (v) => typeof v === 'string' && v.trim() !== '';

const JWT_LABEL = 'Session signing key (JWT_SECRET)';
const checkJwt = (env) => {
  if (!set(env.JWT_SECRET)) {
    return check('jwt_secret', JWT_LABEL, 'missing', 'Not set.', 'Set JWT_SECRET to 32+ random characters: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"');
  }
  // Reuse the boot-time rule so the two can never disagree.
  const { errors, warnings } = validateConfig({ NODE_ENV: 'production', JWT_SECRET: env.JWT_SECRET, DB_HOST: 'x', DB_NAME: 'x', DB_USER: 'x', DB_PASSWORD: 'x', FRONTEND_URL: 'x' });
  if ([...errors, ...warnings].some((m) => m.startsWith('JWT_SECRET'))) {
    return check('jwt_secret', JWT_LABEL, isProd(env) ? 'missing' : 'warn', 'Set, but it is a placeholder or shorter than 32 characters.', 'Generate a real one with the node command in backend/.env.example.');
  }
  return check('jwt_secret', JWT_LABEL, 'ok', 'Set.');
};

const checkDatabase = async (pool, migrationStatus) => {
  try {
    await pool.query('SELECT 1');
  } catch {
    return [check('database', 'Database', 'missing', 'Cannot connect.', 'Check DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD and that PostgreSQL is running.')];
  }
  const out = [check('database', 'Database', 'ok', 'Connected.')];
  try {
    const m = await migrationStatus();
    out.push(m.ok
      ? check('migrations', 'Database migrations', 'ok', 'Up to date.')
      : check('migrations', 'Database migrations', 'missing', `${m.pending.length} pending.`, 'Set AUTO_MIGRATE=true (default) and restart, or run `npm run migrate` in backend/.'));
  } catch {
    out.push(check('migrations', 'Database migrations', 'missing', 'Could not read migration state.', 'Run `npm run migrate` in backend/.'));
  }
  return out;
};

const checkBootstrap = async (pool, env) => {
  const label = 'Super Admin account';
  try {
    const [rows] = await pool.query('SELECT COUNT(*)::int AS n FROM users WHERE access_level = 1 AND is_active = TRUE');
    if (rows[0].n === 0) {
      return check('bootstrap_admin', label, 'missing', 'No active Super Admin exists, so nobody can sign in.', 'Set BOOTSTRAP_ADMIN_EMAIL + BOOTSTRAP_ADMIN_PASSWORD (12+ chars) and restart, or run `npm run create-admin` in backend/.');
    }
    if (set(env.BOOTSTRAP_ADMIN_PASSWORD)) {
      return check('bootstrap_admin', label, 'warn', 'A Super Admin exists, but BOOTSTRAP_ADMIN_PASSWORD is still in the environment.', 'Remove BOOTSTRAP_ADMIN_PASSWORD from the environment; it is only needed for the first boot.');
    }
    return check('bootstrap_admin', label, 'ok', 'An active Super Admin exists.');
  } catch {
    return check('bootstrap_admin', label, 'missing', 'Could not read users.', 'Check the database and migrations.');
  }
};

let smtpCache = null;
/** nodemailer verify() with a timeout and a short cache so the status page cannot hammer the mail server. */
const verifySmtp = async (transporter, { force = false } = {}) => {
  if (!force && smtpCache && Date.now() - smtpCache.at < SMTP_CACHE_MS) return smtpCache.result;
  let result;
  try {
    await Promise.race([
      transporter.verify(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), SMTP_VERIFY_TIMEOUT_MS).unref()),
    ]);
    result = { ok: true };
  } catch (err) {
    result = { ok: false, reason: String(err.code || err.message || 'failed').slice(0, 80) };
  }
  smtpCache = { at: Date.now(), result };
  return result;
};

const checkSmtp = async (env, transporter, verify) => {
  const label = 'Email (SMTP)';
  const fix = 'Set SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER and SMTP_PASS (see backend/.env.example).';
  if (!set(env.SMTP_HOST) || !set(env.SMTP_USER) || !set(env.SMTP_PASS)) {
    return check('smtp', label, isProd(env) ? 'missing' : 'warn',
      isProd(env)
        ? 'Not configured: sign-in codes, invites and password resets cannot be emailed, so nobody can finish signing in.'
        : 'Not configured: in development sign-in codes are printed in the server log and invite links are shown to the admin.',
      fix);
  }
  if (!verify) return check('smtp', label, 'ok', 'Configured (connection not tested).');
  const r = await verifySmtp(transporter);
  return r.ok
    ? check('smtp', label, 'ok', 'Configured; the mail server accepted the connection and login.')
    : check('smtp', label, 'missing', `Configured, but the connection test failed (${r.reason}).`, 'Check SMTP_HOST, SMTP_PORT, SMTP_SECURE (true for 465, false for 587) and the credentials.');
};

const checkAnthropic = (env) => (set(env.ANTHROPIC_API_KEY)
  ? check('anthropic', 'Ask InternalX assistant (ANTHROPIC_API_KEY)', 'ok', 'Key set: the assistant, AI digest summaries and notes-to-tasks are enabled.')
  : check('anthropic', 'Ask InternalX assistant (ANTHROPIC_API_KEY)', 'warn', 'Not set: the assistant is disabled; digests use their built-in summary.', 'Add ANTHROPIC_API_KEY to the backend environment and restart.'));

const checkGoogle = (env) => (set(env.GOOGLE_CLIENT_ID)
  ? check('google', 'Google sign-in (GOOGLE_CLIENT_ID)', 'ok', 'Enabled for accounts that already exist.')
  : check('google', 'Google sign-in (GOOGLE_CLIENT_ID)', 'warn', 'Not set: only email + password + code sign-in is offered (optional).', 'Set GOOGLE_CLIENT_ID to enable the Google button.'));

const checkDomains = (env) => {
  const label = 'Allowed email domains (ALLOWED_EMAIL_DOMAINS)';
  const relevant = set(env.GOOGLE_CLIENT_ID) || env.ALLOW_SELF_REGISTRATION === 'true';
  if (!relevant) return check('email_domains', label, 'ok', 'Not used (no Google sign-in, self-registration off).');
  if (set(env.ALLOWED_EMAIL_DOMAINS)) return check('email_domains', label, 'ok', `${allowedEmailDomains().length} domain(s) allowed for Google sign-in / self-registration.`);
  return check('email_domains', label, 'warn', 'Not set: a built-in example list applies to Google sign-in / self-registration.', 'Set ALLOWED_EMAIL_DOMAINS to your own domains (comma separated).');
};

const checkOrigin = (env) => {
  const label = 'Public URL and CORS (FRONTEND_URL)';
  const url = env.FRONTEND_URL;
  if (!set(url)) {
    return isProd(env)
      ? check('frontend_url', label, 'missing', 'Not set: invite and reset links and CORS have no public origin.', 'Set FRONTEND_URL to the public https origin of the app, e.g. https://internalx.example.com.')
      : check('frontend_url', label, 'ok', 'Not set: defaults to http://localhost:3000 (fine for local development).');
  }
  if (isProd(env) && /localhost|127\.0\.0\.1/.test(url)) return check('frontend_url', label, 'warn', 'Points at localhost: emailed links will not work for other people.', 'Set FRONTEND_URL to the public URL.');
  if (isProd(env) && !/^https:\/\//i.test(url)) return check('frontend_url', label, 'warn', 'Not https: links in emails are not secure.', 'Use the public https URL (COOKIE_SECURE=false is only for a plain-http LAN install).');
  return check('frontend_url', label, 'ok', 'Set.');
};

const checkProxy = (env) => {
  const label = 'Reverse proxy (TRUST_PROXY)';
  if (set(env.TRUST_PROXY)) return check('trust_proxy', label, 'ok', 'Set.');
  return isProd(env)
    ? check('trust_proxy', label, 'warn', 'Not set: assuming the app is exposed directly. Behind a proxy every visitor shares one rate-limit bucket.', 'Behind Caddy/nginx/Cloudflare Tunnel set TRUST_PROXY=1.')
    : check('trust_proxy', label, 'ok', 'Not set (correct for local development).');
};

const checkScheduler = (env) => {
  const label = 'Scheduler: weekly digest and alerts';
  const tz = env.APP_TIMEZONE || 'Asia/Kolkata';
  try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }); } catch {
    return check('scheduler', label, 'warn', `APP_TIMEZONE "${tz}" is not a valid time zone.`, 'Use an IANA name such as Asia/Kolkata or Europe/London.');
  }
  if (!schedulerEnabled(env)) return check('scheduler', label, 'warn', 'Disabled: no Monday digest or daily alerts.', 'Set ENABLE_SCHEDULER=true (it is on by default in production).');
  if (!set(env.SMTP_HOST)) return check('scheduler', label, 'warn', `Enabled (${tz}); digests are in-app notifications only until SMTP is configured.`, 'Configure SMTP to also email the digest.');
  return check('scheduler', label, 'ok', `Enabled (${tz}).`);
};

const checkUploads = () => {
  const label = 'Uploads directory';
  const probe = path.join(UPLOAD_ROOT, `.write-test-${process.pid}`);
  try {
    fs.mkdirSync(path.join(UPLOAD_ROOT, 'avatars'), { recursive: true });
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    return check('uploads', label, 'ok', 'Writable.');
  } catch {
    return check('uploads', label, 'missing', 'Not writable: document and avatar uploads will fail.', 'Make backend/uploads writable by the app user (in Docker mount a volume at /app/uploads).');
  }
};

/**
 * Run every check. `verify: false` skips the (network) SMTP connection test.
 * Dependencies are injectable for tests.
 */
const runSelfCheck = async ({
  env = process.env,
  verify = true,
  pool = require('./database').pool,
  migrationStatus = () => require('../migrate').migrationStatus(),
  transporter = require('../services/email.service').transporter,
} = {}) => {
  const checks = [
    checkJwt(env),
    ...(await checkDatabase(pool, migrationStatus)),
    await checkBootstrap(pool, env),
    await checkSmtp(env, transporter, verify),
    checkAnthropic(env),
    checkGoogle(env),
    checkDomains(env),
    checkOrigin(env),
    checkProxy(env),
    checkScheduler(env),
    checkUploads(),
  ];
  const summary = { ok: 0, warn: 0, missing: 0 };
  checks.forEach((c) => { summary[c.status] += 1; });
  return { generatedAt: new Date().toISOString(), environment: env.NODE_ENV || 'development', summary, checks };
};

/** One clear block in the boot log. */
const logSelfCheck = (report, log = console) => {
  const mark = { ok: 'OK     ', warn: 'WARN   ', missing: 'MISSING' };
  const lines = report.checks.map((c) => `  [${mark[c.status]}] ${c.label}: ${c.detail}${c.status !== 'ok' && c.fix ? ` -> ${c.fix}` : ''}`);
  const { ok, warn, missing } = report.summary;
  log.info(`[selfcheck] ${ok} ok, ${warn} warning(s), ${missing} missing\n${lines.join('\n')}`);
};

module.exports = { runSelfCheck, logSelfCheck, verifySmtp };
