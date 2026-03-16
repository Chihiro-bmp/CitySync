require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function getSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'person';
    `);
    const cols = res.rows.map(r => r.column_name).join(', ');
    console.log('Person Columns:', cols);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

getSchema();
