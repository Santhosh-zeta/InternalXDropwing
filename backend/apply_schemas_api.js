const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://flwfsoygyqyjjislixwy.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsd2Zzb3lneXF5amppc2xpeHd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI2OTU5MSwiZXhwIjoyMDg5ODQ1NTkxfQ.JvlEbdBJc6_fOgM18e2CZw6-mQl57diH8nNo-X6S75s';

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
    const rootPath = path.join(__dirname, '..');
    const files = ['supabase_schema.sql', 'onboarding_schema.sql', 'fix_rls.sql'];

    for (const file of files) {
      console.log(`Applying ${file}...`);
      const filePath = path.join(rootPath, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      const res = await runSqlViaApi(sql);
      console.log(`${file} applied successfully. Response:`, res.substring(0, 100));
    }
  } catch (error) {
    console.error('Error applying schemas:', error);
  }
}

run();
