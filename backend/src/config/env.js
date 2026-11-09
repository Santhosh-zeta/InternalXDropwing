/**
 * Fail-fast configuration checks, run once at boot (never at import time, so
 * tests and tooling can require the app freely).
 *
 * Without a real JWT_SECRET every token is forgeable, so the server refuses to
 * start rather than run insecurely. In development a placeholder only warns,
 * because .env.example ships one.
 */
const PLACEHOLDER = /change_me|changeme|placeholder|your_|replace|example|secret_here|generate_|^secret$|^password$|ci-only/i;
const MIN_SECRET_LENGTH = 32;

const validateConfig = (env = process.env) => {
  const production = env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  const secret = env.JWT_SECRET || '';
  if (!secret) {
    errors.push('JWT_SECRET is not set');
  } else if (secret.length < MIN_SECRET_LENGTH || PLACEHOLDER.test(secret)) {
    (production ? errors : warnings).push(
      `JWT_SECRET is a placeholder or shorter than ${MIN_SECRET_LENGTH} characters. ` +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\""
    );
  }

  if (production) {
    for (const key of ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']) {
      if (!env[key]) errors.push(`${key} is not set`);
    }
    // Behind a proxy without TRUST_PROXY every visitor looks like the proxy's IP, so the login
    // rate limit becomes one shared bucket for the whole company.
    if (env.TRUST_PROXY === undefined || env.TRUST_PROXY === '') {
      warnings.push('TRUST_PROXY is not set: assuming the app is exposed directly. Behind a reverse proxy / tunnel set TRUST_PROXY=1');
    }
    if (!env.SMTP_HOST) warnings.push('SMTP is not configured: sign-in codes and invite emails cannot be delivered');
    // Invite and password-reset links are built from it, so localhost is never acceptable.
    if (!env.FRONTEND_URL) errors.push('FRONTEND_URL is not set (the public https URL of the app; used in email links and CORS)');
    else if (/localhost|127\.0\.0\.1/.test(env.FRONTEND_URL)) warnings.push('FRONTEND_URL points at localhost');
  }

  return { errors, warnings };
};

/** Logs warnings; throws one Error listing every blocking problem. */
const assertConfig = (env = process.env, log = console) => {
  const { errors, warnings } = validateConfig(env);
  warnings.forEach((w) => log.warn(`[config] ${w}`));
  if (errors.length) {
    throw new Error(`Refusing to start, fix the configuration:\n  - ${errors.join('\n  - ')}`);
  }
};

/**
 * Allowed browser origins for CORS and Socket.IO: CORS_ORIGINS (comma list), else
 * FRONTEND_URL, else the local dev frontend. The app and its API are normally the
 * same origin, in which case CORS never comes into play.
 */
const corsOrigins = (env = process.env) => {
  const raw = env.CORS_ORIGINS || env.FRONTEND_URL || 'http://localhost:3000';
  return raw.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);
};

/**
 * Express `trust proxy` from TRUST_PROXY: unset/false/0 = off (the safe default: a
 * client cannot forge X-Forwarded-For), a number = that many proxy hops, true = all,
 * anything else = a subnet/IP list ("loopback, 10.0.0.0/8").
 */
const trustProxySetting = (env = process.env) => {
  const v = (env.TRUST_PROXY || '').trim();
  if (v === '' || v === 'false' || v === '0') return false;
  if (v === 'true') return true;
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return v;
};

/**
 * `Secure` flag for the session cookie. Always on in production (browsers only
 * ever see https there, TLS usually ends at a proxy so req.secure is unreliable);
 * COOKIE_SECURE=false is the explicit opt-out for plain-http installs on a LAN.
 */
const cookieSecure = (env = process.env) => {
  if (env.COOKIE_SECURE === 'true') return true;
  if (env.COOKIE_SECURE === 'false') return false;
  return env.NODE_ENV === 'production';
};

module.exports = { validateConfig, assertConfig, corsOrigins, trustProxySetting, cookieSecure };
