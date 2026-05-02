require('dotenv').config();
const { pool } = require('./src/config/database');

async function migrate() {
  try {
    console.log('Adding is_verified field to users table...');

    await pool.query(
      `ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE AFTER is_active;`
    );

    console.log('Migration completed successfully!');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists.');
    } else {
      console.error('Migration failed:', error);
    }
  } finally {
    process.exit();
  }
}

migrate();
