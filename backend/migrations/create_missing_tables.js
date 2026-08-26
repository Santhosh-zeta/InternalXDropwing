require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pgPool } = require('../src/config/database.pg');

async function runMigrations() {
  const client = await pgPool.connect();
  try {
    console.log('Running migrations...');

    // 1. announcements
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        venture_id INTEGER REFERENCES ventures(id),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ announcements table OK');

    // 2. okrs
    await client.query(`
      CREATE TABLE IF NOT EXISTS okrs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        venture_id INTEGER REFERENCES ventures(id),
        owner_id INTEGER REFERENCES users(id),
        progress INTEGER DEFAULT 0,
        quarter VARCHAR(10),
        year INTEGER,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ okrs table OK');

    // 3. key_results
    await client.query(`
      CREATE TABLE IF NOT EXISTS key_results (
        id SERIAL PRIMARY KEY,
        okr_id INTEGER REFERENCES okrs(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        target_value NUMERIC(10,2),
        current_value NUMERIC(10,2) DEFAULT 0,
        unit VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ key_results table OK');

    // 4. strategic_risks
    await client.query(`
      CREATE TABLE IF NOT EXISTS strategic_risks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        severity VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'open',
        venture_id INTEGER REFERENCES ventures(id),
        owner_id INTEGER REFERENCES users(id),
        mitigation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ strategic_risks table OK');

    // 5. project_milestones
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_milestones (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date DATE,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ project_milestones table OK');

    // Add tags column to projects if not exists
    await client.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '[]'
    `);
    console.log('✅ projects.tags column OK');

    console.log('\n✅ All migrations completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pgPool.end();
  }
}

runMigrations();
