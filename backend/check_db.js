require('dotenv').config();
const { pool } = require('./src/config/database');

async function check() {
  try {
    const [ventures] = await pool.query('SELECT id, name FROM ventures');
    console.log('Ventures:', ventures);
    const [levels] = await pool.query('SELECT level_number, level_name FROM access_levels');
    console.log('Access Levels:', levels);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
