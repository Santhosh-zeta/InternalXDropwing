/**
 * Runs before every test file (jest `setupFiles`). Points the app's pg pool at
 * the test database BEFORE any app module is required, and sets safe test env.
 *
 * Database: TEST_DATABASE_URL (postgres://user:pass@host:port/db) or, failing
 * that, the usual DB_* vars. Tests TRUNCATE tables, and the global setup drops
 * and recreates the `public` schema, so NEVER point this at real data.
 */
const { parseDbConfig } = require('./dbConfig');

const cfg = parseDbConfig();
process.env.DB_HOST = cfg.host;
process.env.DB_PORT = String(cfg.port);
process.env.DB_NAME = cfg.database;
process.env.DB_USER = cfg.user;
process.env.DB_PASSWORD = cfg.password;

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.SESSION_CACHE_TTL_MS = '0';
process.env.ALLOWED_EMAIL_DOMAINS = 'dropwinggroups.com,dropwing.in,fenixa.com,persynix.com,grovia.in';
delete process.env.BOOTSTRAP_ADMIN_EMAIL;
delete process.env.BOOTSTRAP_ADMIN_PASSWORD;

// A developer's local, git-ignored backend/.env (written by scripts/dev.sh) is loaded by the server;
// pin the settings the tests depend on so results do not vary by machine.
process.env.FRONTEND_URL = 'http://localhost:3000';
for (const k of ['CORS_ORIGINS', 'TRUST_PROXY', 'SMTP_HOST', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'AI_PROVIDER', 'ENABLE_SCHEDULER']) {
  process.env[k] = '';
}
