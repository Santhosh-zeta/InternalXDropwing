/**
 * Once per `npm test`: wipe the test database's public schema and apply the
 * real deployment/postgres/init/*.sql, so tests run against exactly the schema
 * production gets.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { parseDbConfig } = require('./dbConfig');

module.exports = async () => {
  const client = new Client(parseDbConfig());
  await client.connect();
  try {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    const dir = path.join(__dirname, '../../../deployment/postgres/init');
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) {
      await client.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    }
  } finally {
    await client.end();
  }
};
