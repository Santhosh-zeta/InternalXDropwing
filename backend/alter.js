require('dotenv').config();
const { pool } = require('./src/config/database');

async function alter() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('ALTER TABLE users ADD COLUMN personal_email VARCHAR(150), ADD COLUMN emergency_contact VARCHAR(50);');
    console.log('Added personal_email and emergency_contact columns to users table.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Columns already exist.');
    } else {
      console.error(err);
    }
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}
alter();
