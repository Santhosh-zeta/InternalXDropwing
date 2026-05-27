require('dotenv').config();
const { pool } = require('./src/config/database');

async function clean() {
  try {
    const [result] = await pool.query("DELETE FROM users WHERE email LIKE 'dummy%@dropwing.com'");
    console.log('Deleted test users:', result.affectedRows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
clean();
