/**
 * Demo / test data: 4 ventures, a user at every level per venture, clients,
 * projects with members, tasks, timesheets (with hourly rates), documents,
 * chat messages, OKRs, learning items.
 *
 *   node scripts/seed-demo.js            # DEMO_PASSWORD=... to choose the password
 *
 * DEVELOPMENT ONLY - refuses to run when NODE_ENV=production.
 * Everything it creates is tagged (users: *@demo.internalx.test, projects /
 * tasks / documents: "[demo] " prefix) and is removed again on the next run, so
 * it is idempotent and never touches other data. No password is stored in the
 * repo: pass DEMO_PASSWORD or a random one is generated and printed once.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DOMAIN = 'demo.internalx.test';
const TAG = '[demo] ';
const VENTURES = [
  { key: 'dd', slug: 'dropwing', name: 'Dropwing Design Studio' },
  { key: 'fx', slug: 'fenixa', name: 'Fenixa Solutions' },
  { key: 'px', slug: 'persynix', name: 'PerSyniX' },
  { key: 'gr', slug: 'grovia', name: 'Grovia' },
];
// level -> hourly rate (fx.l8 is deliberately left without a rate to exercise "rate missing")
const RATES = { 3: 90, 4: 120, 5: 80, 6: 60, 7: 45, 8: 20 };

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/** Seed into `pool` (a pg Pool). Returns ids by key so tests can address everything. */
const seedDemo = async (pool, { password, quiet = true } = {}) => {
  if (process.env.NODE_ENV === 'production') throw new Error('seed-demo refuses to run in production');
  const q = async (text, params) => (await pool.query(text, params)).rows;
  const log = (...a) => { if (!quiet) console.log(...a); };
  const hash = await bcrypt.hash(password, 10);

  // ── clean up a previous run (children cascade from users / projects) ──
  await q("DELETE FROM tasks WHERE title LIKE $1", [`${TAG}%`]);
  await q("DELETE FROM projects WHERE name LIKE $1", [`${TAG}%`]);
  await q("DELETE FROM documents WHERE original_name LIKE $1", [`${TAG}%`]);
  await q("DELETE FROM users WHERE email LIKE $1", [`%@${DOMAIN}`]);
  await q("DELETE FROM okrs WHERE objective LIKE $1", [`${TAG}%`]);
  await q("DELETE FROM strategic_risks WHERE risk_name LIKE $1", [`${TAG}%`]);
  await q("DELETE FROM learning_checklist_items WHERE title LIKE $1", [`${TAG}%`]);
  await q("DELETE FROM announcements WHERE title LIKE $1", [`${TAG}%`]);

  // ── ventures / levels must exist (init scripts create them; be forgiving) ──
  const ventureId = {};
  for (const v of VENTURES) {
    await q('INSERT INTO ventures (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING', [v.name, v.slug]);
    ventureId[v.key] = (await q('SELECT id FROM ventures WHERE slug = $1', [v.slug]))[0].id;
  }

  // ── users ──
  const users = {};
  const addUser = async (key, name, level, vKey, rate, extra = {}) => {
    const rows = await q(
      `INSERT INTO users (full_name, email, password_hash, access_level, venture_id, designation, department, is_active, is_verified, hourly_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, TRUE, $8) RETURNING id`,
      [name, `${key}@${DOMAIN}`, hash, level, vKey ? ventureId[vKey] : null,
        extra.designation || `Level ${level}`, extra.department || 'Delivery', rate ?? null]
    );
    users[key] = rows[0].id;
  };
  await addUser('l1', 'Demo Super Admin', 1, null, null);
  await addUser('l2', 'Demo Managing Director', 2, null, null);
  for (const v of VENTURES) {
    for (const level of [3, 4, 5, 6, 7, 8]) {
      const rate = v.key === 'fx' && level === 8 ? null : RATES[level];
      await addUser(`${v.key}.l${level}`, `${v.name.split(' ')[0]} L${level}`, level, v.key, rate);
    }
    await addUser(`${v.key}.l7b`, `${v.name.split(' ')[0]} L7 (not on projects)`, 7, v.key, RATES[7]);
    await addUser(`${v.key}.client`, `${v.name.split(' ')[0]} Client`, 9, v.key, null);
  }
  await addUser('client.other', 'Client without projects', 9, null, null);

  // ── projects, members, tasks ──
  const projects = {};
  const tasks = {};
  for (const v of VENTURES) {
    const vid = ventureId[v.key];
    const creator = users[`${v.key}.l5`];
    for (const [pKey, pName, budget] of [['p1', 'Alpha', 50000], ['p2', 'Beta', 20000]]) {
      const [p] = await q(
        `INSERT INTO projects (name, description, status, venture_id, budget, created_by, client_name)
         VALUES ($1, $2, 'active', $3, $4, $5, $6) RETURNING id`,
        [`${TAG}${v.name} ${pName}`, `${pName} for ${v.name}`, vid, budget, creator, `${v.name} Client`]
      );
      projects[`${v.key}.${pKey}`] = p.id;
    }
    const p1 = projects[`${v.key}.p1`];
    const p2 = projects[`${v.key}.p2`];
    for (const who of ['l5', 'l6', 'l7', 'l8', 'client']) {
      await q('INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)', [p1, users[`${v.key}.${who}`], who === 'client' ? 'Client' : 'Contributor']);
    }
    await q('INSERT INTO project_members (project_id, user_id, role, rate) VALUES ($1, $2, $3, 95)', [p2, users[`${v.key}.l5`], 'Lead']); // per-project rate override

    const mkTask = async (key, title, project, assignee, status = 'pending') => {
      const [t] = await q(
        `INSERT INTO tasks (title, status, assigned_to, assigned_by, venture_id, project_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [`${TAG}${title}`, status, assignee, creator, vid, project]
      );
      await q('INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)', [t.id, assignee]);
      tasks[`${v.key}.${key}`] = t.id;
    };
    await mkTask('t_l7', `${v.key} build feature`, p1, users[`${v.key}.l7`], 'in-progress');
    await mkTask('t_l6', `${v.key} review designs`, p1, users[`${v.key}.l6`], 'completed');
    await mkTask('t_l8', `${v.key} write notes`, p1, users[`${v.key}.l8`]);
    await mkTask('t_client', `${v.key} client deliverable`, p1, users[`${v.key}.client`]);
    await mkTask('t_p2', `${v.key} beta planning`, p2, users[`${v.key}.l5`]);
    await mkTask('t_l7b', `${v.key} internal chore`, null, users[`${v.key}.l7b`]);

    // ── timesheets: approved + pending, spread over recent months ──
    const sheets = [
      ['l5', 'p1', 't_l7', 6, 'approved', 40], ['l6', 'p1', 't_l6', 5, 'approved', 35],
      ['l7', 'p1', 't_l7', 8, 'approved', 20], ['l7', 'p1', 't_l7', 4, 'pending', 3],
      ['l8', 'p1', 't_l8', 6, 'approved', 10], ['l8', 'p1', 't_l8', 3, 'pending', 2],
      ['l5', 'p2', 't_p2', 4, 'approved', 65], ['l7b', null, 't_l7b', 5, 'approved', 15],
    ];
    for (const [who, pKey, tKey, hours, status, ago] of sheets) {
      const [ts] = await q(
        `INSERT INTO timesheets (user_id, task_id, project_id, venture_id, hours_worked, date, notes, status, approved_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [users[`${v.key}.${who}`], tasks[`${v.key}.${tKey}`], pKey ? projects[`${v.key}.${pKey}`] : null, vid, hours,
          daysAgo(ago), `${TAG}work`, status, status === 'approved' ? users[`${v.key}.l4`] : null]
      );
      tasks[`${v.key}.ts.${who}.${status}.${ago}`] = ts.id; // addressable by tests
    }
  }

  // ── documents (small real files so downloads work in dev) ──
  const uploadRoot = path.join(__dirname, '../uploads');
  fs.mkdirSync(uploadRoot, { recursive: true });
  const documents = {};
  const addDoc = async (key, vKey, pKey, uploader, name, clientVisible) => {
    const stored = `${crypto.randomBytes(16).toString('hex')}.txt`;
    fs.writeFileSync(path.join(uploadRoot, stored), `demo document: ${name}\n`);
    const [d] = await q(
      `INSERT INTO documents (file_name, original_name, mime_type, size, path, venture_id, project_id, uploaded_by, client_visible)
       VALUES ($1, $2, 'text/plain', 30, $1, $3, $4, $5, $6) RETURNING id`,
      [stored, `${TAG}${name}`, ventureId[vKey], pKey ? projects[`${vKey}.${pKey}`] : null, uploader, clientVisible]
    );
    documents[key] = { id: d.id, path: stored };
  };
  for (const v of VENTURES) {
    await addDoc(`${v.key}.client`, v.key, 'p1', users[`${v.key}.l5`], `${v.key}-shared-with-client.txt`, true);
    await addDoc(`${v.key}.internal`, v.key, 'p1', users[`${v.key}.l5`], `${v.key}-internal-p1.txt`, false);
    await addDoc(`${v.key}.p2`, v.key, 'p2', users[`${v.key}.l5`], `${v.key}-p2-only.txt`, false);
    await addDoc(`${v.key}.venture`, v.key, null, users[`${v.key}.l3`], `${v.key}-venture-wide.txt`, false);
  }

  // ── chat ──
  const messages = {};
  const addMsg = async (key, sender, content, { venture, receiver } = {}) => {
    const [m] = await q('INSERT INTO messages (sender_id, receiver_id, venture_id, content) VALUES ($1, $2, $3, $4) RETURNING id',
      [sender, receiver || null, venture ? ventureId[venture] : null, content]);
    messages[key] = m.id;
  };
  await addMsg('global', users.l2, `${TAG}Welcome to Global HQ`);
  for (const v of VENTURES) {
    await addMsg(`${v.key}.venture`, users[`${v.key}.l5`], `${TAG}${v.name} team channel`, { venture: v.key });
    await addMsg(`${v.key}.dm`, users[`${v.key}.l5`], `${TAG}private note to l7`, { receiver: users[`${v.key}.l7`] });
  }

  // ── strategy / learning / announcements ──
  for (const v of VENTURES) {
    const [o] = await q('INSERT INTO okrs (venture_id, objective, progress) VALUES ($1, $2, 40) RETURNING id', [ventureId[v.key], `${TAG}${v.name} grow revenue`]);
    await q('INSERT INTO key_results (okr_id, text) VALUES ($1, $2)', [o.id, 'Ship two projects']);
    await q("INSERT INTO strategic_risks (venture_id, risk_name, severity) VALUES ($1, $2, 'MEDIUM')", [ventureId[v.key], `${TAG}${v.name} key person risk`]);
    await q('INSERT INTO learning_checklist_items (title, venture_id) VALUES ($1, $2)', [`${TAG}${v.name} onboarding`, ventureId[v.key]]);
    await q('INSERT INTO announcements (title, content, venture_id) VALUES ($1, $2, $3)', [`${TAG}${v.name} update`, 'Venture-only news', ventureId[v.key]]);
  }
  await q('INSERT INTO announcements (title, content) VALUES ($1, $2)', [`${TAG}Company all-hands`, 'Everyone is invited']);

  log(`Seeded ${Object.keys(users).length} users, ${Object.keys(projects).length} projects.`);
  return { ventureId, users, projects, tasks, documents, messages, domain: DOMAIN };
};

module.exports = { seedDemo, DOMAIN, TAG, VENTURES };

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  if (process.env.NODE_ENV === 'production') {
    console.error('seed-demo refuses to run in production.');
    process.exit(1);
  }
  const { pgPool } = require('../src/config/database.pg');
  const generated = !process.env.DEMO_PASSWORD;
  const password = process.env.DEMO_PASSWORD || crypto.randomBytes(9).toString('base64url');
  seedDemo(pgPool, { password, quiet: false })
    .then(() => {
      console.log(`Database: ${process.env.DB_NAME}. Log in as <key>@${DOMAIN}, e.g. l1@${DOMAIN}, dd.l5@${DOMAIN}, fx.client@${DOMAIN}`);
      console.log(generated ? `Generated password (shown once): ${password}` : 'Password: the value of DEMO_PASSWORD');
      return pgPool.end();
    })
    .catch((err) => { console.error(err); process.exit(1); });
}
