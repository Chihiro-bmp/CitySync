require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function createUsers() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const addressRes = await client.query('SELECT address_id FROM address LIMIT 1');
    if (addressRes.rows.length === 0) throw new Error("No addresses found in DB to link person");
    const addressId = addressRes.rows[0].address_id;

    // Create Employee
    const empRes = await client.query(`
      INSERT INTO person (first_name, last_name, phone_number, national_id, date_of_birth, gender, address_id)
      VALUES ('Admin', 'User', '1234567890', 'EMP001', '1980-01-01', 'Male', $1)
      RETURNING person_id
    `, [addressId]);
    const empId = empRes.rows[0].person_id;
    
    const adminHashed = await bcrypt.hash('admin123', 10);
    await client.query(
      `
      INSERT INTO account (person_id, account_type, email, password_hashed)
      VALUES ($1, 'employee', 'admin@citysync.com', $2)
      `,
      [empId, adminHashed]
    );
    
    await client.query(
      `
      INSERT INTO employee (person_id, role, employee_num, hire_date, employment_status)
      VALUES ($1, 'System Administrator', 'EMP001', CURRENT_DATE, 'active')
      `,
      [empId]
    );

    // Create Field Worker
    const fwRes = await client.query(`
      INSERT INTO person (first_name, last_name, phone_number, national_id, date_of_birth, gender, address_id)
      VALUES ('Field', 'Worker', '0987654321', 'FW001', '1990-01-01', 'Male', $1)
      RETURNING person_id
    `, [addressId]);
    const fwId = fwRes.rows[0].person_id;
    
    const workerHashed = await bcrypt.hash('worker123', 10);
    await client.query(
      `
      INSERT INTO account (person_id, account_type, email, password_hashed)
      VALUES ($1, 'field_worker', 'worker@citysync.com', $2)
      `,
      [fwId, workerHashed]
    );
    
    // Assign to region 1 if exists, else null
    const regionRes = await client.query('SELECT region_id FROM region LIMIT 1');
    const regionId = regionRes.rows.length > 0 ? regionRes.rows[0].region_id : null;

    await client.query(
      `
      INSERT INTO field_worker (person_id, assigned_region_id, expertise)
      VALUES ($1, $2, 'General')
      `,
      [fwId, regionId]
    );

    await client.query('COMMIT');
    console.log('Created test users: admin@citysync.com / admin123 and worker@citysync.com / worker123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

createUsers();
