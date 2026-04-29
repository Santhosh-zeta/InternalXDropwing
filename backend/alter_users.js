require('dotenv').config();
const { pool } = require('./src/config/database');

async function alterUsers() {
  let conn;
  try {
    conn = await pool.getConnection();

    console.log('Adding notification_preferences to users table...');
    try {
      await conn.query('ALTER TABLE users ADD COLUMN notification_preferences JSON;');
      console.log('Column added.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('notification_preferences already exists.');
      else throw e;
    }

    console.log('Users DB setup complete.');

  } catch (err) {
    console.error(err);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}
alterUsers();
