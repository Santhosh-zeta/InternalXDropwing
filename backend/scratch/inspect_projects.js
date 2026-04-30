require('dotenv').config();
const { pool } = require('../src/config/database');

async function check() {
  try {
    console.log('--- PROJECTS ---');
    const [projects] = await pool.query('DESCRIBE projects');
    console.log(projects);

    console.log('--- PROJECT_MEMBERS ---');
    const [members] = await pool.query('SHOW TABLES LIKE "project_members"');
    if (members.length === 0) {
      console.log('project_members table NOT FOUND.');
    } else {
      const [mcols] = await pool.query('DESCRIBE project_members');
      console.log(mcols);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
