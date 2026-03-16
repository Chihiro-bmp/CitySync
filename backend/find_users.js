require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function findUsers() {
  try {
    const emp = await pool.query('SELECT p.first_name, a.email FROM person p JOIN account a ON p.person_id = a.person_id JOIN employee e ON p.person_id = e.person_id LIMIT 1;');
    console.log('Employee:', emp.rows[0]);
    
    const fw = await pool.query('SELECT p.first_name, a.email FROM person p JOIN account a ON p.person_id = a.person_id JOIN field_worker f ON p.person_id = f.person_id LIMIT 1;');
    console.log('Field Worker:', fw.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findUsers();
