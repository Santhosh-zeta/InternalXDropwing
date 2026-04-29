require('dotenv').config();
const { pool } = require('./src/config/database');

async function alterTasks() {
  let conn;
  try {
    conn = await pool.getConnection();

    console.log('Adding parent_task_id to tasks...');
    try {
      await conn.query('ALTER TABLE tasks ADD COLUMN parent_task_id INT, ADD FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE;');
      console.log('Added parent_task_id successfully.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('parent_task_id already exists in tasks.');
      else throw e;
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

alterTasks();
