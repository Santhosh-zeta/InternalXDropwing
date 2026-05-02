require('dotenv').config();
const { pool } = require('./src/config/database');

async function migrate() {
  try {
    console.log('Adding 2FA and Password Reset fields to users table...');

    const queries = [
      `ALTER TABLE users 
       ADD COLUMN otp VARCHAR(10) NULL AFTER password_hash,
       ADD COLUMN otp_expires_at TIMESTAMP NULL AFTER otp,
       ADD COLUMN reset_password_token VARCHAR(255) NULL AFTER otp_expires_at,
       ADD COLUMN reset_password_expires_at TIMESTAMP NULL AFTER reset_password_token;`
    ];

    for (const query of queries) {
      await pool.query(query);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

migrate();
