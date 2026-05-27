require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'internalx'
};

async function migrate() {
  const connection = await mysql.createConnection(dbConfig);
  console.log('Connected to MySQL.');

  try {
    // 1. OKRs Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS okrs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        venture_id INT,
        objective VARCHAR(255) NOT NULL,
        progress INT DEFAULT 0,
        color VARCHAR(20) DEFAULT '#8b5cf6',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "okrs" created.');

    // 2. Key Results Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS key_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        okr_id INT,
        text TEXT NOT NULL,
        is_done BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (okr_id) REFERENCES okrs(id) ON DELETE CASCADE
      )
    `);
    console.log('Table "key_results" created.');

    // 3. Strategic Risks Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS strategic_risks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        venture_id INT,
        risk_name VARCHAR(255) NOT NULL,
        severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
        mitigation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table "strategic_risks" created.');

    // Seed some initial data if empty
    const [okrs] = await connection.query('SELECT count(*) as count FROM okrs');
    if (okrs[0].count === 0) {
      // Get venture IDs
      const [ventures] = await connection.query('SELECT id, name, slug, primary_color FROM ventures');
      
      for (const v of ventures) {
        let obj = '';
        if (v.slug === 'fenixa') obj = 'Accelerate Enterprise AI Adoption';
        else if (v.slug === 'dropwing') obj = 'Establish Global Brand Presence';
        else if (v.slug === 'persynix') obj = 'Optimize Supply Chain Analytics';
        else obj = `Expand ${v.name} Market Reach`;

        const [res] = await connection.query(
          'INSERT INTO okrs (venture_id, objective, progress, color) VALUES (?, ?, ?, ?)',
          [v.id, obj, Math.floor(Math.random() * 50) + 30, v.primary_color || '#8b5cf6']
        );
        
        const okrId = res.insertId;
        await connection.query('INSERT INTO key_results (okr_id, text, is_done) VALUES (?, ?, ?)', [okrId, 'Deploy new core engine', true]);
        await connection.query('INSERT INTO key_results (okr_id, text, is_done) VALUES (?, ?, ?)', [okrId, 'Acquire 10 enterprise clients', false]);
      }

      await connection.query(
        'INSERT INTO strategic_risks (venture_id, risk_name, severity, mitigation) VALUES (?, ?, ?, ?)',
        [null, 'Talent Retention (Engineering)', 'HIGH', 'Revamping ESOP structure by Q3; initiating bi-annual market salary adjustments.']
      );
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
