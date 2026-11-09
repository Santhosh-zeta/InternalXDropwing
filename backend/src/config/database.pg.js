const { Pool } = require('pg');

const pgPool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
});

/**
 * A client sitting idle in the pool can still be dropped out from under it —
 * the database restarting, a network blip, a failover — and `pg` emits that
 * as an `'error'` event on the Pool rather than rejecting any in-flight
 * query (there isn't one; the client was idle). Node treats an `'error'`
 * event with no listener as fatal and crashes the whole process, which
 * would take down every request being served, not just the one connection
 * that had a problem. Active queries are unaffected either way — each one
 * already runs through a try/catch in its own controller — so logging and
 * carrying on is the correct response here, not `process.exit()`.
 */
pgPool.on('error', (err) => {
  console.error('Unexpected error on an idle PostgreSQL client (pool recovers automatically):', err.message);
});

const formatQuery = (text, values) => {
  let newText = text;
  let flatValues = [];
  
  if (values && Array.isArray(values)) {
    let index = 1;
    // Check for bulk insert VALUES ?
    if (values.length === 1 && Array.isArray(values[0]) && values[0].length > 0 && Array.isArray(values[0][0]) && newText.includes('VALUES ?')) {
      const rows = values[0];
      const rowStrings = [];
      for (const row of rows) {
        const placeholders = row.map(() => `$${index++}`).join(', ');
        rowStrings.push(`(${placeholders})`);
        flatValues.push(...row);
      }
      newText = newText.replace('VALUES ?', `VALUES ${rowStrings.join(', ')}`);
    } else {
      // Normal replacement of ?
      // Prevent replacing ? in situations where it's not a placeholder?
      // In raw SQL ? is mostly used as a placeholder.
      let i = 0;
      newText = newText.replace(/\?/g, () => `$${++i}`);
      flatValues = values;
    }
  } else {
    flatValues = values || [];
  }


  // Handle NOW()
  newText = newText.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');

  // Handle IFNULL -> COALESCE
  newText = newText.replace(/\bIFNULL\(/gi, 'COALESCE(');

  return { text: newText, values: flatValues };
};

const makeClientWrapper = (client) => {
  return {
    query: async (text, values) => {
      const { text: pgText, values: pgValues } = formatQuery(text, values);
      try {
        const result = await client.query(pgText, pgValues);
        const isSelect = pgText.trim().toUpperCase().startsWith('SELECT');
        
        if (isSelect || pgText.trim().toUpperCase().startsWith('WITH')) {
          return [result.rows, result.fields];
        } else {
          let insertId = null;
          if (result.rows && result.rows.length > 0) {
            insertId = result.rows[0].id || result.rows[0].insertId;
          }
          const resultSetHeader = {
            affectedRows: result.rowCount,
            insertId: insertId
          };
          return [resultSetHeader, result.fields];
        }
      } catch (err) {
        // Values are deliberately not logged: they can hold password hashes and OTP digests.
        console.error('Query execution error:', err.message, 'Query:', pgText);
        throw err;
      }
    },
    release: () => {
      if (typeof client.release === 'function') {
        client.release();
      }
    },
    commit: async () => await client.query('COMMIT'),
    rollback: async () => await client.query('ROLLBACK'),
    beginTransaction: async () => await client.query('BEGIN')
  };
};

const poolWrapper = {
  query: async (text, values) => {
    const { text: pgText, values: pgValues } = formatQuery(text, values);
    try {
      const result = await pgPool.query(pgText, pgValues);
      const isSelect = pgText.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect || pgText.trim().toUpperCase().startsWith('WITH')) {
        return [result.rows, result.fields];
      } else {
        let insertId = null;
        if (result.rows && result.rows.length > 0) {
          insertId = result.rows[0].id || result.rows[0].insertId;
        }
        const resultSetHeader = {
          affectedRows: result.rowCount,
          insertId: insertId
        };
        return [resultSetHeader, result.fields];
      }
    } catch (err) {
      // Values are deliberately not logged: they can hold password hashes and OTP digests.
        console.error('Query execution error:', err.message, 'Query:', pgText);
      throw err;
    }
  },
  getConnection: async () => {
    const client = await pgPool.connect();
    return makeClientWrapper(client);
  }
};

const testConnection = async () => {
  try {
    const client = await pgPool.connect();
    console.log('✅ PostgreSQL connected successfully to', process.env.DB_NAME);
    client.release();
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
  }
};

module.exports = { pool: poolWrapper, testConnection, pgPool };
