require('dotenv').config();
const { pool } = require('./src/config/database');

async function check() {
  try {
    const [cols] = await pool.query('DESCRIBE users');
    cols.slice(0, 10).forEach(c => console.log(c));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
