const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'us-east-1',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'us-west-1',
  'us-west-2',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ca-central-1',
  'sa-east-1'
];
const project = 'flwfsoygyqyjjislixwy';
const pass = 'f48KsUH8gFwcd6ER';

async function run() {
  let activeClient = null;

  for (const region of regions) {
    console.log(`Trying region ${region}...`);
    const connectionString = `postgresql://postgres.${project}:${pass}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });
    
    try {
      await client.connect();
      console.log(`Success! Connected to region ${region}`);
      activeClient = client;
      break;
    } catch (e) {
      console.log(`Failed for region ${region}`);
      await client.end().catch(()=>{}).finally(()=>{});
    }
  }

  if (activeClient) {
    try {
      const rootPath = path.join(__dirname, '..');
      const files = ['supabase_schema.sql', 'onboarding_schema.sql', 'fix_rls.sql'];

      for (const file of files) {
        console.log(`Applying ${file}...`);
        const filePath = path.join(rootPath, file);
        if (fs.existsSync(filePath)) {
          const sql = fs.readFileSync(filePath, 'utf8');
          await activeClient.query(sql);
          console.log(`${file} applied successfully.`);
        } else {
          console.log(`${file} not found.`);
        }
      }
    } catch (err) {
      console.error('Error applying schemas:', err);
    } finally {
      await activeClient.end();
    }
  } else {
    console.log('Could not connect to any region.');
  }
}

run();
