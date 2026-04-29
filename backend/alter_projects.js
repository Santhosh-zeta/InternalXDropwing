require('dotenv').config();
const { pool } = require('./src/config/database');

async function alterProjects() {
  let conn;
  try {
    conn = await pool.getConnection();

    console.log('Creating projects table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('planning', 'active', 'completed', 'on-hold') DEFAULT 'planning',
        budget DECIMAL(15, 2) DEFAULT 0.00,
        venture_id INT,
        start_date DATE,
        end_date DATE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log('Adding project_id to tasks...');
    try {
      await conn.query('ALTER TABLE tasks ADD COLUMN project_id INT, ADD FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('project_id already exists in tasks.');
      else throw e;
    }

    console.log('Seeding initial projects...');
    const [ventures] = await conn.query('SELECT id, slug FROM ventures');
    const getVentureId = (slug) => ventures.find(v => v.slug === slug)?.id || null;

    const dummyProjects = [
      ['Website Redesign 2026', 'Complete overhaul of the Dropwing marketing site.', 'active', 15000.00, getVentureId('dropwing'), '2026-05-01', '2026-08-01', 1],
      ['SaaS Platform Alpha', 'Initial release of SerphoSoft analytics tool.', 'active', 45000.00, getVentureId('serphosoft'), '2026-03-01', '2026-11-15', 1],
      ['AI Model Training', 'Training the new NLP engine for PerSyniX.', 'planning', 22000.00, getVentureId('persynix'), '2026-06-01', '2026-12-31', 1],
      ['Q3 Marketing Push', 'Aggressive ad campaigns for Grovia clients.', 'planning', 8000.00, getVentureId('grovia'), '2026-07-01', '2026-09-30', 1],
    ];

    for (const p of dummyProjects) {
      const [existing] = await conn.query('SELECT id FROM projects WHERE name = ?', [p[0]]);
      if (!existing.length) {
        await conn.query(`
          INSERT INTO projects (name, description, status, budget, venture_id, start_date, end_date, created_by) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, p);
      }
    }

    console.log('Projects DB setup complete.');

  } catch (err) {
    console.error(err);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}
alterProjects();
