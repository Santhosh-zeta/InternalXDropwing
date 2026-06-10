require('dotenv').config();
const { pgPool } = require('./src/config/database.pg');
const fs = require('fs');

async function runSeedSql() {
  const sql = fs.readFileSync('./postgres_migration/postgres_seed.sql', 'utf8');
  let client;
  try {
    client = await pgPool.connect();
    await client.query(sql);
    console.log('✅ Executed postgres_seed.sql successfully');
  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    if (client) client.release();
    process.exit(0);
  }
}

runSeedSql();
