require('dotenv').config();
const { pool } = require('./src/config/database');

async function check() {
  try {
    const [cols] = await pool.query('DESCRIBE users');
    console.log('Users columns:', cols);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
