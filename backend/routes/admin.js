const express = require('express');
const router = express.Router();
const pool = require('../db/config');

// Middleware to get table statistics
const getTableStats = async (tableName) => {
  try {
    const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
    return parseInt(countResult.rows[0].count);
  } catch (err) {
    return 0;
  }
};

// GET all tables overview
router.get('/tables', async (req, res) => {
  try {
    const tables = [
      'region', 'address', 'person', 'account', 'consumer', 'employee',
      'field_worker', 'utility', 'electricity_utility', 'water_utility',
      'gas_utility', 'tariff', 'tariff_slab', 'connection',
      'residential_connection', 'commercial_connection', 'meter',
      'meter_reading', 'usage', 'bill_document', 'bill_postpaid',
      'prepaid_statement', 'prepaid_account', 'transaction',
      'payment_method', 'bank', 'mobile_banking', 'paypal',
      'payment', 'complaint'
    ];

    const tableStats = await Promise.all(
      tables.map(async (table) => ({
        name: table,
        count: await getTableStats(table)
      }))
    );

    res.json({ tables: tableStats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch table stats' });
  }
});

// GET all regions
router.get('/regions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM region ORDER BY region_id');
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET all addresses
router.get('/addresses', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, r.region_name, r.postal_code 
      FROM address a 
      LEFT JOIN region r ON a.region_id = r.region_id
      ORDER BY a.address_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET all persons with their addresses
router.get('/persons', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        a.house_num,
        a.street_name,
        a.landmark,
        r.region_name,
        r.postal_code
      FROM person p
      LEFT JOIN address a ON p.address_id = a.address_id
      LEFT JOIN region r ON a.region_id = r.region_id
      ORDER BY p.person_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET all accounts with person info
router.get('/accounts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.*,
        p.first_name,
        p.last_name,
        p.phone_number,
        p.national_id
      FROM account a
      JOIN person p ON a.person_id = p.person_id
      ORDER BY a.account_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET all consumers
router.get('/consumers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        p.first_name,
        p.last_name,
        p.phone_number,
        p.email
      FROM consumer c
      JOIN person p ON c.person_id = p.person_id
      LEFT JOIN account acc ON p.person_id = acc.person_id
      ORDER BY c.person_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET all employees
router.get('/employees', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.*,
        p.first_name,
        p.last_name,
        p.phone_number
      FROM employee e
      JOIN person p ON e.person_id = p.person_id
      ORDER BY e.person_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET all field workers
router.get('/field-workers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        fw.*,
        p.first_name,
        p.last_name,
        p.phone_number,
        r.region_name
      FROM field_worker fw
      JOIN person p ON fw.person_id = p.person_id
      LEFT JOIN region r ON fw.assigned_region_id = r.region_id
      ORDER BY fw.person_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET all utilities
router.get('/utilities', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM utility ORDER BY utility_id');
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET all connections with details
router.get('/connections', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        p.first_name,
        p.last_name,
        u.utility_name,
        a.house_num,
        a.street_name,
        r.region_name
      FROM connection c
      LEFT JOIN consumer cons ON c.consumer_id = cons.person_id
      LEFT JOIN person p ON cons.person_id = p.person_id
      LEFT JOIN utility u ON c.utility_id = u.utility_id
      LEFT JOIN address a ON c.address_id = a.address_id
      LEFT JOIN region r ON a.region_id = r.region_id
      ORDER BY c.connection_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET all meters
router.get('/meters', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, c.connection_id, c.connection_status
      FROM meter m
      LEFT JOIN connection c ON m.connection_id = c.connection_id
      ORDER BY m.meter_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET all bills
router.get('/bills', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.*,
        c.connection_id,
        p.first_name,
        p.last_name,
        u.utility_name
      FROM bill_document b
      LEFT JOIN connection c ON b.connection_id = c.connection_id
      LEFT JOIN consumer cons ON c.consumer_id = cons.person_id
      LEFT JOIN person p ON cons.person_id = p.person_id
      LEFT JOIN utility u ON c.utility_id = u.utility_id
      ORDER BY b.bill_document_id DESC
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET all payments
router.get('/payments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        pm.method_name,
        b.total_amount as bill_amount
      FROM payment p
      LEFT JOIN payment_method pm ON p.method_id = pm.method_id
      LEFT JOIN bill_document b ON p.bill_document_id = b.bill_document_id
      ORDER BY p.payment_id DESC
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET all complaints
router.get('/complaints', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        comp.*,
        p.first_name as consumer_first_name,
        p.last_name as consumer_last_name,
        p.phone_number as consumer_phone,
        e1.first_name as assigned_by_name,
        e2.first_name as assigned_to_name
      FROM complaint comp
      LEFT JOIN consumer c ON comp.consumer_id = c.person_id
      LEFT JOIN person p ON c.person_id = p.person_id
      LEFT JOIN employee emp1 ON comp.assigned_by = emp1.person_id
      LEFT JOIN person e1 ON emp1.person_id = e1.person_id
      LEFT JOIN employee emp2 ON comp.assigned_to = emp2.person_id
      LEFT JOIN person e2 ON emp2.person_id = e2.person_id
      ORDER BY comp.complaint_id DESC
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET specific table by name
router.get('/table/:tableName', async (req, res) => {
  const { tableName } = req.params;
  
  // Whitelist of allowed tables for security
  const allowedTables = [
    'region', 'address', 'person', 'account', 'consumer', 'employee',
    'field_worker', 'utility', 'electricity_utility', 'water_utility',
    'gas_utility', 'tariff', 'tariff_slab', 'connection',
    'residential_connection', 'commercial_connection', 'meter',
    'meter_reading', 'usage', 'bill_document', 'bill_postpaid',
    'prepaid_statement', 'prepaid_account', 'transaction',
    'payment_method', 'bank', 'mobile_banking', 'paypal',
    'payment', 'complaint'
  ];

  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  try {
    const result = await pool.query(`SELECT * FROM ${tableName}`);
    res.json({ 
      table: tableName,
      count: result.rows.length, 
      data: result.rows 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE specific entry by table and ID (for testing)
router.delete('/table/:tableName/:id', async (req, res) => {
  const { tableName, id } = req.params;
  
  // Whitelist of allowed tables
  const allowedTables = {
    'region': 'region_id',
    'address': 'address_id',
    'person': 'person_id',
    'account': 'account_id',
    'consumer': 'person_id',
    'employee': 'person_id',
    'utility': 'utility_id',
    'connection': 'connection_id',
    'meter': 'meter_id',
    'bill_document': 'bill_document_id',
    'payment': 'payment_id',
    'complaint': 'complaint_id'
  };

  if (!allowedTables[tableName]) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  const idColumn = allowedTables[tableName];

  try {
    await pool.query(`DELETE FROM ${tableName} WHERE ${idColumn} = $1`, [id]);
    res.json({ message: `Deleted from ${tableName}`, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

module.exports = router;