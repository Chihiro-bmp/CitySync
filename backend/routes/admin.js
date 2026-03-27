const express = require('express');
const router = express.Router();
const pool = require('../db/config');

// ── Utility: row count helper ──────────────────────────────────────────────
const getTableStats = async (tableName) => {
  try {
    const r = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
    return parseInt(r.rows[0].count);
  } catch {
    return 0;
  }
};

// ════════════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════════════════════

router.get('/tables', async (req, res) => {
  try {
    const tables = [
      'region', 'address', 'person', 'account', 'consumer', 'employee',
      'field_worker', 'utility', 'electricity_utility', 'water_utility',
      'gas_utility', 'tariff', 'tariff_slab', 'utility_connection',
      'residential_connection', 'commercial_connection', 'meter',
      'meter_reading', 'usage', 'bill_document', 'bill_postpaid',
      'prepaid_statement', 'prepaid_account', 'balance_transaction',
      'payment_method', 'bank', 'mobile_banking', 'paypal',
      'payment', 'complaint'
    ];
    const tableStats = await Promise.all(
      tables.map(async (t) => ({ name: t, count: await getTableStats(t) }))
    );
    res.json({ tables: tableStats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch table stats' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  REGIONS
// ════════════════════════════════════════════════════════════════════════════

router.get('/regions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM region ORDER BY region_id');
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/regions', async (req, res) => {
  const { region_name, postal_code } = req.body;
  if (!region_name || !postal_code)
    return res.status(400).json({ error: 'region_name and postal_code are required' });
  try {
    const result = await pool.query(
      `INSERT INTO region (region_name, postal_code) VALUES ($1, $2) RETURNING *`,
      [region_name, postal_code]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.put('/regions/:id', async (req, res) => {
  const { id } = req.params;
  const { region_name, postal_code } = req.body;
  try {
    const result = await pool.query(
      `UPDATE region
       SET region_name = COALESCE($1, region_name),
           postal_code = COALESCE($2, postal_code)
       WHERE region_id = $3 RETURNING *`,
      [region_name, postal_code, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Region not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.delete('/regions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM region WHERE region_id = $1', [id]);
    res.json({ message: 'Region deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cannot delete — region may be in use', detail: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  READ-ONLY LOOKUPS
// ════════════════════════════════════════════════════════════════════════════

router.get('/addresses', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, r.region_name, r.postal_code
      FROM address a LEFT JOIN region r ON a.region_id = r.region_id
      ORDER BY a.address_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

router.get('/persons', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, a.house_num, a.street_name, a.landmark, r.region_name, r.postal_code
      FROM person p
      LEFT JOIN address a ON p.address_id = a.address_id
      LEFT JOIN region r ON a.region_id = r.region_id
      ORDER BY p.person_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

router.get('/utilities', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM utility ORDER BY utility_id');
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  CONSUMERS
// ════════════════════════════════════════════════════════════════════════════

router.get('/consumers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, p.first_name, p.last_name, p.phone_number, p.date_of_birth,
             acc.email, acc.is_active
      FROM consumer c
      JOIN person p ON c.person_id = p.person_id
      LEFT JOIN account acc ON p.person_id = acc.person_id
      ORDER BY c.person_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

router.put('/consumers/:id', async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, phone_number, email } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      UPDATE person
      SET first_name    = COALESCE($1, first_name),
          last_name     = COALESCE($2, last_name),
          phone_number  = COALESCE($3, phone_number)
      WHERE person_id = $4
    `, [first_name, last_name, phone_number, id]);
    if (email) {
      await client.query(`UPDATE account SET email = $1 WHERE person_id = $2`, [email, id]);
    }
    await client.query('COMMIT');
    res.json({ message: 'Consumer updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  EMPLOYEES & FIELD WORKERS
// ════════════════════════════════════════════════════════════════════════════

router.get('/employees', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, p.first_name, p.last_name, p.phone_number
      FROM employee e JOIN person p ON e.person_id = p.person_id
      ORDER BY e.person_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

router.get('/field-workers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT fw.*, p.first_name, p.last_name, p.phone_number, r.region_name
      FROM field_worker fw
      JOIN person p ON fw.person_id = p.person_id
      LEFT JOIN region r ON fw.assigned_region_id = r.region_id
      ORDER BY fw.person_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  TARIFFS
// ════════════════════════════════════════════════════════════════════════════

router.get('/tariffs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.utility_name, u.unit_of_measurement
      FROM tariff t LEFT JOIN utility u ON t.utility_id = u.utility_id
      ORDER BY t.tariff_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

router.post('/tariffs', async (req, res) => {
  const { tariff_name, utility_id, consumer_category, billing_method, effective_from, effective_to, is_active } = req.body;
  if (!tariff_name || !utility_id || !consumer_category || !billing_method || !effective_from)
    return res.status(400).json({ error: 'Missing required fields' });
  try {
    const result = await pool.query(`
      INSERT INTO tariff (tariff_name, utility_id, consumer_category, billing_method, effective_from, effective_to, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [tariff_name, utility_id, consumer_category, billing_method, effective_from, effective_to || null, is_active ?? true]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.put('/tariffs/:id', async (req, res) => {
  const { id } = req.params;
  const { tariff_name, consumer_category, billing_method, effective_from, effective_to, is_active } = req.body;
  try {
    const result = await pool.query(`
      UPDATE tariff
      SET tariff_name       = COALESCE($1, tariff_name),
          consumer_category = COALESCE($2, consumer_category),
          billing_method    = COALESCE($3, billing_method),
          effective_from    = COALESCE($4, effective_from),
          effective_to      = $5,
          is_active         = COALESCE($6, is_active)
      WHERE tariff_id = $7 RETURNING *
    `, [tariff_name, consumer_category, billing_method, effective_from, effective_to || null, is_active, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tariff not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ── Tariff Slabs ───────────────────────────────────────────────────────────

router.get('/tariffs/:id/slabs', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM tariff_slab WHERE tariff_id = $1 ORDER BY slab_num`,
      [id]
    );
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

router.post('/tariffs/:id/slabs', async (req, res) => {
  const { id } = req.params;
  const { charge_type, unit_from, unit_to, rate_per_unit } = req.body;
  if (unit_from === undefined || rate_per_unit === undefined)
    return res.status(400).json({ error: 'unit_from and rate_per_unit are required' });
  try {
    // Auto-increment slab_num
    const numResult = await pool.query(
      `SELECT COALESCE(MAX(slab_num), 0) + 1 AS next_num FROM tariff_slab WHERE tariff_id = $1`, [id]
    );
    const slab_num = numResult.rows[0].next_num;
    const result = await pool.query(`
      INSERT INTO tariff_slab (tariff_id, slab_num, charge_type, unit_from, unit_to, rate_per_unit)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [id, slab_num, charge_type || 'FLAT', unit_from, unit_to || null, rate_per_unit]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.put('/tariffs/:id/slabs/:slabNum', async (req, res) => {
  const { id, slabNum } = req.params;
  const { charge_type, unit_from, unit_to, rate_per_unit } = req.body;
  try {
    const result = await pool.query(`
      UPDATE tariff_slab
      SET charge_type    = COALESCE($1, charge_type),
          unit_from      = COALESCE($2, unit_from),
          unit_to        = $3,
          rate_per_unit  = COALESCE($4, rate_per_unit)
      WHERE tariff_id = $5 AND slab_num = $6 RETURNING *
    `, [charge_type, unit_from, unit_to || null, rate_per_unit, id, slabNum]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Slab not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

router.delete('/tariffs/:id/slabs/:slabNum', async (req, res) => {
  const { id, slabNum } = req.params;
  try {
    await pool.query(`DELETE FROM tariff_slab WHERE tariff_id = $1 AND slab_num = $2`, [id, slabNum]);
    res.json({ message: 'Slab deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Cannot delete slab — may be referenced by readings', detail: err.message });
  }
});

// ── Fixed Charges ──────────────────────────────────────────────────────────

router.get('/tariffs/:id/fixed-charges', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM fixed_charge WHERE tariff_id = $1 ORDER BY fixed_charge_id`, [id]
    );
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

router.post('/tariffs/:id/fixed-charges', async (req, res) => {
  const { id } = req.params;
  const { charge_name, charge_amount, charge_frequency, is_mandatory } = req.body;
  if (!charge_amount || !charge_frequency)
    return res.status(400).json({ error: 'charge_amount and charge_frequency are required' });
  try {
    const result = await pool.query(`
      INSERT INTO fixed_charge (tariff_id, charge_name, charge_amount, charge_frequency, is_mandatory)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [id, charge_name || null, charge_amount, charge_frequency, is_mandatory ?? false]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

router.delete('/tariffs/:id/fixed-charges/:fcId', async (req, res) => {
  const { fcId } = req.params;
  try {
    await pool.query(`DELETE FROM fixed_charge WHERE fixed_charge_id = $1`, [fcId]);
    res.json({ message: 'Fixed charge deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Cannot delete — may be applied to bills', detail: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  METERS
// ════════════════════════════════════════════════════════════════════════════

router.get('/meters', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, a.house_num, a.street_name, r.region_name,
             uc.connection_id, uc.connection_status
      FROM meter m
      LEFT JOIN address a ON m.address_id = a.address_id
      LEFT JOIN region r ON a.region_id = r.region_id
      LEFT JOIN utility_connection uc ON uc.meter_id = m.meter_id
      ORDER BY m.meter_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

router.post('/meters', async (req, res) => {
  const { address_id, meter_type } = req.body;
  if (!address_id || !meter_type)
    return res.status(400).json({ error: 'address_id and meter_type are required' });
  try {
    const result = await pool.query(
      `INSERT INTO meter (address_id, meter_type, is_active) VALUES ($1, $2, FALSE) RETURNING *`,
      [address_id, meter_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  CONNECTIONS
// ════════════════════════════════════════════════════════════════════════════

router.get('/connections', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        uc.*,
        p.first_name, p.last_name,
        u.utility_name,
        a.house_num, a.street_name,
        r.region_name,
        t.tariff_name
      FROM utility_connection uc
      LEFT JOIN consumer cons ON uc.consumer_id = cons.person_id
      LEFT JOIN person p ON cons.person_id = p.person_id
      LEFT JOIN tariff t ON uc.tariff_id = t.tariff_id
      LEFT JOIN utility u ON t.utility_id = u.utility_id
      LEFT JOIN meter m ON uc.meter_id = m.meter_id
      LEFT JOIN address a ON m.address_id = a.address_id
      LEFT JOIN region r ON a.region_id = r.region_id
      ORDER BY uc.connection_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

router.post('/connections', async (req, res) => {
  const {
    consumer_id, tariff_id, meter_id,
    payment_type, connection_type, load_requirement,
    // residential fields
    property_type, is_subsidized,
    // commercial fields
    business_name, operating_hours, tax_id
  } = req.body;

  if (!consumer_id || !tariff_id || !meter_id || !payment_type || !connection_type)
    return res.status(400).json({ error: 'consumer_id, tariff_id, meter_id, payment_type, connection_type are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create the base connection
    const connResult = await client.query(`
      INSERT INTO utility_connection
        (tariff_id, consumer_id, meter_id, payment_type, connection_type, connection_status, connection_date, load_requirement)
      VALUES ($1, $2, $3, $4, $5, 'Active', CURRENT_DATE, $6)
      RETURNING *
    `, [tariff_id, consumer_id, meter_id, payment_type, connection_type, load_requirement || null]);

    const connection_id = connResult.rows[0].connection_id;

    // Insert sub-type
    if (connection_type.toLowerCase() === 'residential') {
      await client.query(`
        INSERT INTO residential_connection (connection_id, property_type, is_subsidized)
        VALUES ($1, $2, $3)
      `, [connection_id, property_type || null, is_subsidized ?? false]);
    } else if (connection_type.toLowerCase() === 'commercial') {
      await client.query(`
        INSERT INTO commercial_connection (connection_id, business_name, operating_hours, tax_id)
        VALUES ($1, $2, $3, $4)
      `, [connection_id, business_name || null, operating_hours || null, tax_id || null]);
    }

    // Activate the meter
    await client.query(`UPDATE meter SET is_active = TRUE WHERE meter_id = $1`, [meter_id]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Connection created', connection_id, data: connResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create connection' });
  } finally {
    client.release();
  }
});

router.put('/connections/:id/status', async (req, res) => {
  const { id } = req.params;
  const { connection_status } = req.body;
  if (!connection_status) return res.status(400).json({ error: 'connection_status is required' });
  try {
    const result = await pool.query(`
      UPDATE utility_connection SET connection_status = $1 WHERE connection_id = $2 RETURNING *
    `, [connection_status, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Connection not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  APPLICATIONS
// ════════════════════════════════════════════════════════════════════════════

router.get('/applications', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ca.*,
        p.first_name as consumer_first_name,
        p.last_name as consumer_last_name,
        p.phone_number as consumer_phone,
        e.first_name as reviewer_first_name,
        e.last_name as reviewer_last_name
      FROM connection_application ca
      JOIN consumer c ON ca.consumer_id = c.person_id
      JOIN person p ON c.person_id = p.person_id
      LEFT JOIN employee emp ON ca.reviewed_by = emp.person_id
      LEFT JOIN person e ON emp.person_id = e.person_id
      ORDER BY ca.application_date DESC
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

router.put('/applications/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, reviewed_by } = req.body;
  if (!status) return res.status(400).json({ error: 'status is required' });
  try {
    const result = await pool.query(`
      UPDATE connection_application
      SET status        = $1,
          reviewed_by   = $2,
          review_date   = CURRENT_DATE
          ${status === 'Approved' ? ', approval_date = CURRENT_DATE' : ''}
      WHERE application_id = $3 RETURNING *
    `, [status, reviewed_by || null, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  COMPLAINTS
// ════════════════════════════════════════════════════════════════════════════

router.get('/complaints', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        comp.*,
        p.first_name  as consumer_first_name,
        p.last_name   as consumer_last_name,
        p.phone_number as consumer_phone,
        e1.first_name as assigned_by_name,
        fw_p.first_name || ' ' || fw_p.last_name as assigned_to_name
      FROM complaint comp
      LEFT JOIN consumer c ON comp.consumer_id = c.person_id
      LEFT JOIN person p ON c.person_id = p.person_id
      LEFT JOIN employee emp1 ON comp.assigned_by = emp1.person_id
      LEFT JOIN person e1 ON emp1.person_id = e1.person_id
      LEFT JOIN field_worker fw ON comp.assigned_to = fw.person_id
      LEFT JOIN person fw_p ON fw.person_id = fw_p.person_id
      ORDER BY comp.complaint_id DESC
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

router.put('/complaints/:id/assign', async (req, res) => {
  const { id } = req.params;
  const { assigned_to, assigned_by } = req.body;
  if (!assigned_to) return res.status(400).json({ error: 'assigned_to is required' });
  try {
    const result = await pool.query(`
      UPDATE complaint
      SET assigned_to = $1, assigned_by = $2, assignment_date = CURRENT_DATE, status = 'In Progress'
      WHERE complaint_id = $3 RETURNING *
    `, [assigned_to, assigned_by || null, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

router.put('/complaints/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  if (!status) return res.status(400).json({ error: 'status is required' });
  try {
    const result = await pool.query(`
      UPDATE complaint
      SET status = $1,
          remarks = COALESCE($2, remarks)
          ${status === 'Resolved' ? ', resolution_date = CURRENT_DATE' : ''}
      WHERE complaint_id = $3 RETURNING *
    `, [status, remarks || null, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  BILLING
// ════════════════════════════════════════════════════════════════════════════

router.get('/bills', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        bd.*,
        p.first_name, p.last_name,
        u.utility_name,
        bp.bill_period_start, bp.bill_period_end, bp.due_date, bp.remarks,
        uc.payment_type
      FROM bill_document bd
      LEFT JOIN utility_connection uc ON bd.connection_id = uc.connection_id
      LEFT JOIN consumer cons ON uc.consumer_id = cons.person_id
      LEFT JOIN person p ON cons.person_id = p.person_id
      LEFT JOIN tariff t ON uc.tariff_id = t.tariff_id
      LEFT JOIN utility u ON t.utility_id = u.utility_id
      LEFT JOIN bill_postpaid bp ON bd.bill_document_id = bp.bill_document_id
      ORDER BY bd.bill_document_id DESC
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// Generate a postpaid bill for a connection
router.post('/bills/generate', async (req, res) => {
  const { connection_id, bill_period_start, bill_period_end, due_date } = req.body;

  if (!connection_id || !bill_period_start || !bill_period_end || !due_date)
    return res.status(400).json({ error: 'connection_id, bill_period_start, bill_period_end, due_date are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify the connection is postpaid
    const connCheck = await client.query(
      `SELECT payment_type, tariff_id FROM utility_connection WHERE connection_id = $1`, [connection_id]
    );
    if (connCheck.rows.length === 0)
      return res.status(404).json({ error: 'Connection not found' });
    if (connCheck.rows[0].payment_type.toUpperCase() !== 'POSTPAID')
      return res.status(400).json({ error: 'Bill generation only applies to postpaid connections' });

    const tariff_id = connCheck.rows[0].tariff_id;

    // Check no existing unpaid bill overlapping this period
    const dupCheck = await client.query(`
      SELECT bill_document_id FROM bill_postpaid
      WHERE bill_document_id IN (
        SELECT bill_document_id FROM bill_document WHERE connection_id = $1 AND bill_status = 'UNPAID'
      )
      AND bill_period_start <= $3 AND bill_period_end >= $2
    `, [connection_id, bill_period_start, bill_period_end]);
    if (dupCheck.rows.length > 0)
      return res.status(409).json({ error: 'An unpaid bill already exists for this period' });

    // Calculate energy amount via stored function
    const energyResult = await client.query(
      `SELECT calculate_energy_amount($1, $2, $3) AS energy_amount`,
      [connection_id, bill_period_start, bill_period_end]
    );
    const energy_amount = parseFloat(energyResult.rows[0].energy_amount) || 0;

    // Get total units consumed in the period
    const usageResult = await client.query(`
      SELECT COALESCE(SUM(u.unit_used), 0) AS total_units
      FROM usage u
      JOIN utility_connection uc ON u.meter_id = uc.meter_id
      WHERE uc.connection_id = $1
        AND u.time_to::date BETWEEN $2 AND $3
    `, [connection_id, bill_period_start, bill_period_end]);
    const unit_consumed = parseFloat(usageResult.rows[0].total_units) || 0;

    // Sum mandatory fixed charges for this tariff
    const fcResult = await client.query(`
      SELECT COALESCE(SUM(charge_amount), 0) AS fixed_total,
             array_agg(fixed_charge_id) AS charge_ids
      FROM fixed_charge
      WHERE tariff_id = $1 AND is_mandatory = TRUE
    `, [tariff_id]);
    const fixed_total = parseFloat(fcResult.rows[0].fixed_total) || 0;
    const charge_ids  = fcResult.rows[0].charge_ids || [];

    const total_amount = energy_amount + fixed_total;

    // Create BILL_DOCUMENT
    const billResult = await client.query(`
      INSERT INTO bill_document (connection_id, bill_type, unit_consumed, energy_amount, total_amount, bill_status)
      VALUES ($1, 'POSTPAID', $2, $3, $4, 'UNPAID')
      RETURNING bill_document_id
    `, [connection_id, unit_consumed, energy_amount, total_amount]);
    const bill_document_id = billResult.rows[0].bill_document_id;

    // Create BILL_POSTPAID
    await client.query(`
      INSERT INTO bill_postpaid (bill_document_id, bill_period_start, bill_period_end, due_date)
      VALUES ($1, $2, $3, $4)
    `, [bill_document_id, bill_period_start, bill_period_end, due_date]);

    // Record which fixed charges were applied
    const timeframe = `${bill_period_start} to ${bill_period_end}`;
    for (const fc_id of charge_ids) {
      await client.query(`
        INSERT INTO fixed_charge_applied (fixed_charge_id, bill_document_id, timeframe)
        VALUES ($1, $2, $3)
      `, [fc_id, bill_document_id, timeframe]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Bill generated successfully',
      bill_document_id,
      unit_consumed,
      energy_amount,
      fixed_charges: fixed_total,
      total_amount
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to generate bill' });
  } finally {
    client.release();
  }
});

// Manually mark a bill as paid (admin override)
router.put('/bills/:id/status', async (req, res) => {
  const { id } = req.params;
  const { bill_status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE bill_document SET bill_status = $1 WHERE bill_document_id = $2 RETURNING *`,
      [bill_status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  PAYMENTS
// ════════════════════════════════════════════════════════════════════════════

router.get('/payments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, pm.method_name, bd.total_amount as bill_total, bd.connection_id
      FROM payment p
      LEFT JOIN payment_method pm ON p.method_id = pm.method_id
      LEFT JOIN bill_document bd ON p.bill_document_id = bd.bill_document_id
      ORDER BY p.payment_id DESC
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  GENERIC TABLE ACCESS (debug / admin tools)
// ════════════════════════════════════════════════════════════════════════════

const ALLOWED_TABLES = {
  region: 'region_id', address: 'address_id', person: 'person_id',
  account: 'account_id', consumer: 'person_id', employee: 'person_id',
  utility: 'utility_id', utility_connection: 'connection_id',
  meter: 'meter_id', bill_document: 'bill_document_id',
  payment: 'payment_id', complaint: 'complaint_id',
  tariff: 'tariff_id'
};

router.get('/table/:tableName', async (req, res) => {
  const { tableName } = req.params;
  if (!ALLOWED_TABLES[tableName])
    return res.status(400).json({ error: 'Invalid table name' });
  try {
    const result = await pool.query(`SELECT * FROM ${tableName}`);
    res.json({ table: tableName, count: result.rows.length, data: result.rows });
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

router.delete('/table/:tableName/:id', async (req, res) => {
  const { tableName, id } = req.params;
  if (!ALLOWED_TABLES[tableName])
    return res.status(400).json({ error: 'Invalid table name' });
  const idColumn = ALLOWED_TABLES[tableName];
  try {
    await pool.query(`DELETE FROM ${tableName} WHERE ${idColumn} = $1`, [id]);
    res.json({ message: `Deleted from ${tableName}`, id });
  } catch (err) {
    res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE PROFILE  (auth-protected — uses token to identify the caller)
// ════════════════════════════════════════════════════════════════════════════
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/admin/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.person_id,
        p.first_name,
        p.last_name,
        p.phone_number,
        p.national_id,
        p.date_of_birth,
        p.gender,
        acc.email,
        acc.account_type  AS role,
        acc.created_at,
        acc.avatar_url,
        addr.house_num,
        addr.street_name,
        addr.landmark,
        r.region_name,
        r.postal_code,
        e.role            AS job_role,
        e.employee_num,
        e.hire_date,
        e.employment_status,
        -- Stats
        (SELECT COUNT(*) FROM connection_application WHERE reviewed_by = p.person_id)             AS applications_reviewed,
        (SELECT COUNT(*) FROM complaint        WHERE assigned_by = p.person_id)                   AS complaints_assigned,
        (SELECT COUNT(*) FROM bill_document bd
          JOIN utility_connection uc ON bd.connection_id = uc.connection_id
          WHERE uc.consumer_id IS NOT NULL)                                                        AS total_bills_in_system
      FROM person p
      JOIN account  acc  ON acc.person_id     = p.person_id
      JOIN employee e    ON e.person_id       = p.person_id
      JOIN address  addr ON p.address_id      = addr.address_id
      JOIN region   r    ON addr.region_id    = r.region_id
      WHERE p.person_id = $1
    `, [req.user.userId]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Profile not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/admin/profile
router.put('/profile', authMiddleware, async (req, res) => {
  const { first_name, last_name, phone_number, gender } = req.body;
  if (!first_name || !last_name || !phone_number)
    return res.status(400).json({ error: 'first_name, last_name and phone_number are required' });
  try {
    await pool.query(
      `UPDATE person SET first_name=$1, last_name=$2, phone_number=$3, gender=$4 WHERE person_id=$5`,
      [first_name, last_name, phone_number, gender || null, req.user.userId]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/admin/avatar
router.put('/avatar', authMiddleware, async (req, res) => {
  const { avatar_url } = req.body;
  if (!avatar_url) return res.status(400).json({ error: 'avatar_url is required' });
  if (avatar_url.length > 2_800_000)
    return res.status(400).json({ error: 'Image too large. Max 2MB.' });
  try {
    await pool.query(
      `UPDATE account SET avatar_url = $1 WHERE person_id = $2`,
      [avatar_url, req.user.userId]
    );
    res.json({ message: 'Avatar updated', avatar_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// DELETE /api/admin/avatar
router.delete('/avatar', async (req, res) => {
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  try {
    const result = await pool.query(
      `SELECT avatar_url FROM account WHERE person_id = $1`,
      [req.user.userId]
    );
    const currentUrl = result.rows[0]?.avatar_url;
    if (currentUrl && currentUrl.includes('cloudinary.com')) {
      const match = currentUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-z]+$/i);
      if (match) {
        await cloudinary.uploader.destroy(match[1]).catch(err =>
          console.warn('Cloudinary delete warning:', err.message)
        );
      }
    }
    await pool.query(
      `UPDATE account SET avatar_url = NULL WHERE person_id = $1`,
      [req.user.userId]
    );
    res.json({ message: 'Avatar removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove avatar' });
  }
});

// PUT /api/admin/password
router.put('/password', authMiddleware, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'current_password and new_password are required' });
  if (new_password.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters' });

  const bcrypt = require('bcrypt');
  try {
    const result = await pool.query(
      `SELECT password_hashed FROM account WHERE person_id = $1`,
      [req.user.userId]
    );
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hashed);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query(
      `UPDATE account SET password_hashed = $1 WHERE person_id = $2`,
      [hashed, req.user.userId]
    );
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;