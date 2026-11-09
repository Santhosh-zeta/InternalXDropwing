/**
 * DEVELOPMENT ONLY: print a session token for demo users, to exercise the API with curl.
 *
 *   node scripts/dev-token.js dd.l5 fx.client     ->  {"dd.l5":"<jwt>", ...}
 *   curl -H "Authorization: Bearer <jwt>" localhost:5000/api/projects
 *
 * Keys are the demo user names from scripts/seed-demo.js (<key>@demo.internalx.test).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
if (process.env.NODE_ENV === 'production') {
  console.error('dev-token refuses to run in production.');
  process.exit(1);
}
const jwt = require('jsonwebtoken');
const { pgPool } = require('../src/config/database.pg');
const { createSession } = require('../src/services/session.service');
const { DOMAIN } = require('./seed-demo');

(async () => {
  const out = {};
  for (const key of process.argv.slice(2)) {
    const { rows } = await pgPool.query('SELECT id, email, access_level, venture_id FROM users WHERE email = $1', [`${key}@${DOMAIN}`]);
    if (!rows[0]) throw new Error(`no demo user ${key} (run scripts/seed-demo.js first)`);
    const u = rows[0];
    const token = jwt.sign({ id: u.id, email: u.email, accessLevel: u.access_level, ventureId: u.venture_id }, process.env.JWT_SECRET, { expiresIn: '2h' });
    await createSession(u.id, token, new Date(Date.now() + 2 * 3600 * 1000));
    out[key] = token;
  }
  console.log(JSON.stringify(out));
  await pgPool.end();
})().catch((err) => { console.error(err.message); process.exit(1); });
