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
    if (!env.FRONTEND_URL) warnings.push('FRONTEND_URL is not set; CORS falls back to http://localhost:3000');
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

module.exports = { validateConfig, assertConfig };
