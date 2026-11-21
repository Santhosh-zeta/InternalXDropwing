const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const { hashOTP } = require('../src/utils/otp');

async function primeDevOtp() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'internalx',
    port: process.env.DB_PORT || 5432
  });

  const future = new Date(Date.now() + 24 * 3600 * 1000);
  const hash = hashOTP('123456');
  const res = await pool.query(
    'UPDATE users SET otp = $1, otp_attempts = 0, otp_locked_until = NULL, otp_expires_at = $2 WHERE email = $3 RETURNING id, email, otp, otp_attempts, otp_expires_at',
    [hash, future, 'admin@dropwinggroups.com']
  );
  console.log('Primed admin OTP 123456 ready:', res.rows[0]);
  await pool.end();
}

primeDevOtp().catch(console.error);
