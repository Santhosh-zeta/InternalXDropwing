const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { checkAdminPassword } = require('../utils/passwordPolicy');

/**
 * First-run bootstrap: the repo ships NO user accounts (it is public, so any
 * seeded credential would be a standing backdoor). If the database has no
 * Super Admin (L1), one is created from BOOTSTRAP_ADMIN_EMAIL and
 * BOOTSTRAP_ADMIN_PASSWORD. Once an L1 exists this does nothing, so the env
 * vars can (and should) be removed after the first successful boot.
 *
 * Never throws on bad configuration: it is logged and the server still starts,
 * so an operator can fix it with `npm run create-admin`.
 *
 * Returns 'exists' | 'created' | 'skipped' (for tests and logging).
 */
const bootstrapAdmin = async (log = console) => {
  const [existing] = await pool.query('SELECT id FROM users WHERE access_level = 1 LIMIT 1');
  if (existing.length > 0) return 'exists';

  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';

  if (!email || !password) {
    log.warn('[bootstrap] No Super Admin (L1) exists and BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD are not set. ' +
      'Nobody can log in. Set both and restart, or run `npm run create-admin` in backend/.');
    return 'skipped';
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    log.warn('[bootstrap] BOOTSTRAP_ADMIN_EMAIL is not a valid email address; no admin created.');
    return 'skipped';
  }
  const problem = checkAdminPassword(password);
  if (problem) {
    log.warn(`[bootstrap] BOOTSTRAP_ADMIN_PASSWORD refused: ${problem}. No admin created.`);
    return 'skipped';
  }

  // Never silently promote an existing lower-level account.
  const [dupe] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (dupe.length > 0) {
    log.warn(`[bootstrap] ${email} already exists as a non-L1 user; refusing to promote it automatically. Use \`npm run create-admin\`.`);
    return 'skipped';
  }

  const hash = await bcrypt.hash(password, 12);
  const employeeId = 'SA-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  await pool.query(
    `INSERT INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation, is_verified, is_active)
     VALUES (?, 'Super Admin', ?, ?, 1, NULL, 'Executive', 'Super Administrator', TRUE, TRUE)`,
    [employeeId, email, hash]
  );
  log.info(`[bootstrap] Created the first Super Admin (${email}). Remove BOOTSTRAP_ADMIN_PASSWORD from the environment now.`);
  return 'created';
};

module.exports = { bootstrapAdmin };
