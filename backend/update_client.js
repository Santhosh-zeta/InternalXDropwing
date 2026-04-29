require('dotenv').config();
const { pool } = require('./src/config/database');

async function updateClient() {
  try {
    await pool.query("UPDATE users SET venture_id = 1 WHERE employee_id = 'CL-001'");
    console.log("Client updated successfully to venture 1");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateClient();
