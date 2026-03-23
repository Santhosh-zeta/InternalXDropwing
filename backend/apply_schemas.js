const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:f48KsUH8gFwcd6ER@db.flwfsoygyqyjjislixwy.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to database!');

    const rootPath = path.join(__dirname, '..');
    const files = ['supabase_schema.sql', 'onboarding_schema.sql', 'fix_rls.sql'];

    for (const file of files) {
      console.log(`Applying ${file}...`);
      const filePath = path.join(rootPath, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
      console.log(`${file} applied successfully.`);
    }
  } catch (error) {
    console.error('Error applying schemas:', error);
  } finally {
    await client.end();
  }
}

run();
