#!/usr/bin/env node
/**
 * DEVELOPMENT ONLY (used by scripts/dev.sh). Makes sure a Super Admin exists:
 * if no L1 user exists, creates one with a random password and prints it ONCE.
 * Does nothing when an L1 already exists. Refuses to run in production.
 *
 *   node scripts/dev-admin.js [--email admin@internalx.local]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

if (process.env.NODE_ENV === 'production') {
  console.error('dev-admin refuses to run in production. Use BOOTSTRAP_ADMIN_* or `npm run create-admin`.');
  process.exit(1);
}

const { pgPool } = require('../src/config/database.pg');

const i = process.argv.indexOf('--email');
const email = ((i > -1 && process.argv[i + 1]) || 'admin@internalx.local').toLowerCase();

(async () => {
  try {
    const { rows } = await pgPool.query('SELECT email FROM users WHERE access_level = 1 LIMIT 1');
    if (rows.length) {
      console.log(`A Super Admin already exists (${rows[0].email}); nothing to do. Reset it with: npm run create-admin -- --email ${rows[0].email}`);
      return;
    }
    // base64url gives letters + digits; the suffix guarantees every character class the policy wants.
    const password = `${crypto.randomBytes(12).toString('base64url')}-Aa9!`;
    const hash = await bcrypt.hash(password, 12);
    await pgPool.query(
      `INSERT INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation, is_verified, is_active)
       VALUES ($1, 'Dev Super Admin', $2, $3, 1, NULL, 'Executive', 'Super Administrator', TRUE, TRUE)`,
      ['SA-' + crypto.randomBytes(3).toString('hex').toUpperCase(), email, hash]
    );
    console.log('\n  Dev Super Admin created (shown once, development only):');
    console.log(`    email:    ${email}`);
    console.log(`    password: ${password}\n`);
  } catch (err) {
    console.error(`dev-admin failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await pgPool.end();
  }
})();
