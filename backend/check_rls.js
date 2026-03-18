const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const { rows } = await pool.query(`
    select tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public' and tablename in ('user_roles', 'ventures');
  `);
  console.log(JSON.stringify(rows, null, 2));
  pool.end();
})();
