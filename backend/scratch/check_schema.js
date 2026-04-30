const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  const [rows] = await connection.query('DESCRIBE audit_logs');
  console.log('audit_logs:', JSON.stringify(rows, null, 2));
  const [rows2] = await connection.query('DESCRIBE announcements');
  console.log('announcements:', JSON.stringify(rows2, null, 2));
  const [rows4] = await connection.query('DESCRIBE projects');
  console.log('projects:', JSON.stringify(rows4, null, 2));
}
check();
