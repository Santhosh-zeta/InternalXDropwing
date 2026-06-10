require('dotenv').config({ path: '../DGOS-PRODUCTION/.env' });
const { pgPool } = require('./src/config/database.pg.js');

async function seed() {
  const users = [
    {
      employee_id: 'DG-MG-001',
      full_name: 'Manager Dropwing',
      email: 'mg@dropwing.in',
      password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku',
      access_level: 5,
      venture_id: 1, // Dropwing Design Studio
      department: 'Management',
      designation: 'Manager',
      is_verified: true
    },
    {
      employee_id: 'DG-IN-001',
      full_name: 'Intern Dropwing',
      email: 'in@dropwing.in',
      password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiEkw2/dz/m.S5W2rFpj8Hkf1Xku',
      access_level: 8,
      venture_id: 1, // Dropwing Design Studio
      department: 'Design',
      designation: 'Intern',
      is_verified: true
    }
  ];

  for (let u of users) {
    try {
      await pgPool.query(`
        INSERT INTO users (employee_id, full_name, email, password_hash, access_level, venture_id, department, designation, is_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (email) DO NOTHING
      `, [u.employee_id, u.full_name, u.email, u.password_hash, u.access_level, u.venture_id, u.department, u.designation, u.is_verified]);
      console.log('Inserted ' + u.email);
    } catch (e) {
      console.error('Error inserting ' + u.email, e);
    }
  }
  process.exit(0);
}
seed();
