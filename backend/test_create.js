require('dotenv').config();
const { pool } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function testCreate() {
  try {
    const full_name = 'Dummy';
    const email = 'dummy@dropwing.com';
    const password = 'InternalXUser123!';
    const access_level = 7;
    const venture_id = 1;
    const department = 'Design';
    const designation = 'Project Manager';

    const hash = await bcrypt.hash(password, 12);
    const employeeId = 'EMP' + Date.now().toString().slice(-6);

    console.log('Attempting insert...');
    const [result] = await pool.query(
      `INSERT INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, full_name, email, hash, access_level, venture_id || null, department || null, designation || null]
    );

    console.log('Insert success! ID:', result.insertId);
    process.exit(0);
  } catch (err) {
    console.error('Insert failed!');
    console.error(err);
    process.exit(1);
  }
}
testCreate();
