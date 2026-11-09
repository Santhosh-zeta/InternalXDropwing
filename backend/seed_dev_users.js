/**
 * DEVELOPMENT ONLY. Creates one demo account per level per venture so the UI
 * can be exercised locally. Every account shares one well-known password, so
 * this refuses to run when NODE_ENV=production. Never point it at a database
 * that anyone but you can reach.
 *
 *   npm run seed:dev            (password: DEV_SEED_PASSWORD, default "Test@1234")
 */
require('dotenv').config();
if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo users: NODE_ENV=production.');
  process.exit(1);
}
const { pgPool } = require('./src/config/database.pg');
const bcrypt = require('bcryptjs');

async function run() {
  try {
    const hash = await bcrypt.hash(process.env.DEV_SEED_PASSWORD || 'Test@1234', 12);
    const res = await pgPool.query('SELECT id, slug FROM ventures');
    const ventureMap = {};
    res.rows.forEach(r => ventureMap[r.slug] = r.id);
    if (!ventureMap.dropwing) throw new Error('Ventures missing: apply deployment/postgres/init/*.sql first');

    const users = [
      // Global
      ['DG-SA-001', 'Super Admin',      'sa@dropwinggroups.com', hash, 1, null, 'Executive', 'Super Administrator'],
      ['DG-MD-001', 'Managing Director','md@dropwinggroups.com', hash, 2, null, 'Executive', 'Managing Director'],
      // Dropwing
      ['DW-AD-009', 'Admin Dropwing',   'ad@dropwing.in',   hash, 3, ventureMap['dropwing'], 'Operations', 'Administrator'],
      ['DW-CX-013', 'CXO Dropwing',   'cx@dropwing.in',   hash, 4, ventureMap['dropwing'], 'Executive', 'Chief Technology Officer'],
      ['DW-MG-017', 'Manager Dropwing',   'mg@dropwing.in',   hash, 5, ventureMap['dropwing'], 'Product', 'Product Manager'],
      ['DW-ES-021', 'Executive Staff Dropwing',   'es@dropwing.in',   hash, 6, ventureMap['dropwing'], 'Operations', 'Executive Officer'],
      ['DW-ST-025', 'Staff Dropwing',   'st@dropwing.in',   hash, 7, ventureMap['dropwing'], 'Design', 'Senior Designer'],
      ['DW-IN-029', 'Intern Dropwing',   'in@dropwing.in',   hash, 8, ventureMap['dropwing'], 'Engineering', 'Software Intern'],
      ['DW-CL-033', 'Client Dropwing',   'cl@dropwing.in',   hash, 9, ventureMap['dropwing'], 'External', 'Client'],
      // Fenixa
      ['FS-AD-010', 'Admin Fenixa Solutions',  'ad@fenixa.com', hash, 3, ventureMap['fenixa'], 'Operations', 'Administrator'],
      ['FS-CX-014', 'CXO Fenixa Solutions',  'cx@fenixa.com', hash, 4, ventureMap['fenixa'], 'Executive', 'Chief Technology Officer'],
      ['FS-MG-018', 'Manager Fenixa Solutions',  'mg@fenixa.com', hash, 5, ventureMap['fenixa'], 'Product', 'Product Manager'],
      ['FS-ES-022', 'Executive Staff Fenixa Solutions',  'es@fenixa.com', hash, 6, ventureMap['fenixa'], 'Operations', 'Executive Officer'],
      ['FS-ST-026', 'Staff Fenixa Solutions',  'st@fenixa.com', hash, 7, ventureMap['fenixa'], 'Design', 'Senior Designer'],
      ['FS-IN-030', 'Intern Fenixa Solutions',  'in@fenixa.com', hash, 8, ventureMap['fenixa'], 'Engineering', 'Software Intern'],
      ['FS-CL-034', 'Client Fenixa Solutions',  'cl@fenixa.com', hash, 9, ventureMap['fenixa'], 'External', 'Client'],
      // PerSyniX
      ['PX-AD-011', 'Admin PerSyniX',    'ad@persynix.com',  hash, 3, ventureMap['persynix'], 'Operations', 'Administrator'],
      ['PX-CX-015', 'CXO PerSyniX',    'cx@persynix.com',  hash, 4, ventureMap['persynix'], 'Executive', 'Chief Technology Officer'],
      ['PX-MG-019', 'Manager PerSyniX',    'mg@persynix.com',  hash, 5, ventureMap['persynix'], 'Product', 'Product Manager'],
      ['PX-ES-023', 'Executive Staff PerSyniX',    'es@persynix.com',  hash, 6, ventureMap['persynix'], 'Operations', 'Executive Officer'],
      ['PX-ST-027', 'Staff PerSyniX',    'st@persynix.com',  hash, 7, ventureMap['persynix'], 'Design', 'Senior Designer'],
      ['PX-IN-031', 'Intern PerSyniX',    'in@persynix.com',  hash, 8, ventureMap['persynix'], 'Engineering', 'Software Intern'],
      ['PX-CL-035', 'Client PerSyniX',    'cl@persynix.com',  hash, 9, ventureMap['persynix'], 'External', 'Client'],
      // Grovia
      ['GV-AD-012', 'Admin Grovia',      'ad@grovia.in',     hash, 3, ventureMap['grovia'], 'Operations', 'Administrator'],
      ['GV-CX-016', 'CXO Grovia',      'cx@grovia.in',     hash, 4, ventureMap['grovia'], 'Executive', 'Chief Technology Officer'],
      ['GV-MG-020', 'Manager Grovia',      'mg@grovia.in',     hash, 5, ventureMap['grovia'], 'Product', 'Product Manager'],
      ['GV-ES-024', 'Executive Staff Grovia',      'es@grovia.in',     hash, 6, ventureMap['grovia'], 'Operations', 'Executive Officer'],
      ['GV-ST-028', 'Staff Grovia',      'st@grovia.in',     hash, 7, ventureMap['grovia'], 'Design', 'Senior Designer'],
      ['GV-IN-032', 'Intern Grovia',      'in@grovia.in',     hash, 8, ventureMap['grovia'], 'Engineering', 'Software Intern'],
      ['GV-CL-036', 'Client Grovia',      'cl@grovia.in',     hash, 9, ventureMap['grovia'], 'External', 'Client'],
    ];

    for (const [eid, name, email, pwd, level, vid, dept, desig] of users) {
      await pgPool.query(
        `INSERT INTO users
          (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         ON CONFLICT (email) DO NOTHING`,
        [eid, name, email, pwd, level, vid, dept, desig]
      );
      console.log(`  L${level} ${email}`);
    }
    console.log('Dev users ready (DEV ONLY).');
  } catch (err) {
    console.error('seed:dev failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pgPool.end();
  }
}
run();
