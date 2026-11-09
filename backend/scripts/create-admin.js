#!/usr/bin/env node
/**
 * Create (or reset) a Super Admin (L1) or Managing Director (L2).
 *
 *   npm run create-admin -- --email you@company.com [--name "Full Name"] [--level 1|2]
 *
 * The password is read from the CREATE_ADMIN_PASSWORD env var, or prompted for
 * (hidden) when attached to a terminal. It is never accepted as an argument, so
 * it does not end up in shell history or the process list.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const readline = require('readline');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pgPool } = require('../src/config/database.pg');
const { checkAdminPassword } = require('../src/utils/passwordPolicy');

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const ask = (question, hidden = false) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
  }
  rl.question(question, (answer) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(answer); });
});

(async () => {
  try {
    const email = (arg('email') || (process.stdin.isTTY ? await ask('Email: ') : '')).toLowerCase().trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('A valid --email is required');
    const name = arg('name') || 'Super Admin';
    const level = parseInt(arg('level') || '1', 10);
    if (![1, 2].includes(level)) throw new Error('--level must be 1 or 2');

    let password = process.env.CREATE_ADMIN_PASSWORD;
    if (!password && process.stdin.isTTY) {
      password = await ask('Password (min 12 chars): ', true);
      const again = await ask('Repeat password: ', true);
      if (password !== again) throw new Error('Passwords do not match');
    }
    const problem = checkAdminPassword(password);
    if (problem) throw new Error(problem);

    const hash = await bcrypt.hash(password, 12);
    const employeeId = (level === 1 ? 'SA-' : 'MD-') + crypto.randomBytes(3).toString('hex').toUpperCase();
    const existing = await pgPool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      // Explicit, operator-driven promotion/reset is the point of this script.
      await pgPool.query(
        `UPDATE users SET password_hash = $1, access_level = $2, venture_id = NULL, is_active = TRUE,
                is_verified = TRUE, otp = NULL, otp_expires_at = NULL WHERE id = $3`,
        [hash, level, existing.rows[0].id]
      );
      await pgPool.query('DELETE FROM sessions WHERE user_id = $1', [existing.rows[0].id]);
      console.log(`Updated existing user ${email}: now level ${level}, password reset, sessions revoked.`);
    } else {
      await pgPool.query(
        `INSERT INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation, is_verified, is_active)
         VALUES ($1, $2, $3, $4, $5, NULL, 'Executive', $6, TRUE, TRUE)`,
        [employeeId, name, email, hash, level, level === 1 ? 'Super Administrator' : 'Managing Director']
      );
      console.log(`Created level ${level} user ${email}.`);
    }
  } catch (err) {
    console.error(`create-admin failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await pgPool.end();
  }
})();
