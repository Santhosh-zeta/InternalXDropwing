require('dotenv').config();
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runSqlViaApi(sql) {
  const url = `${SUPABASE_URL}/pg-meta/default/query`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ApiKey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to run SQL: ${response.status} ${text}`);
  }
  return text;
}

async function run() {
  try {
    const file = path.join(__dirname, '..', '..', 'missing_tables_2.sql');
    console.log(`Applying missing_tables.sql...`);
    const sql = fs.readFileSync(file, 'utf8');
    
    const res = await runSqlViaApi(sql);
    console.log(`missing_tables.sql applied successfully.`);
  } catch (error) {
    console.error('Error applying missing schemas:', error);
  }
}

run();
