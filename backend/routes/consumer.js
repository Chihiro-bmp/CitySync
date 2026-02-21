const express = require('express');
const router  = express.Router();
const pool    = require('../db/config');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware(['consumer']));

// Normalize DB bill_status (UNPAID/PAID) → frontend values (Pending/Paid/Overdue)
// Overdue is determined by due_date, not stored in DB
const statusSQL = `
  CASE
    WHEN bd.bill_status = 'PAID' THEN 'Paid'
    WHEN bd.bill_status = 'UNPAID' AND bp.due_date < CURRENT_DATE THEN 'Overdue'
    ELSE 'Pending'
  END
`;

// ── GET /api/consumer/connections ─────────────────────────────────────────────
router.get('/connections', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        uc.connection_id,
        uc.connection_status,
        uc.connection_date,
        uc.payment_type,
        uc.connection_type,
        u.utility_name,
        u.unit_of_measurement,
        LOWER(u.utility_name)   AS utility_tag,
        t.tariff_name,
        t.billing_method,
        a.house_num,
        a.street_name,
        r.region_name,
        COALESCE((
          SELECT SUM(us.unit_used)
          FROM usage us
          WHERE us.meter_id = uc.meter_id
            AND us.time_to >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0) AS units_used
      FROM utility_connection uc
      JOIN tariff  t  ON uc.tariff_id  = t.tariff_id
      JOIN utility u  ON t.utility_id  = u.utility_id
      JOIN meter   m  ON uc.meter_id   = m.meter_id
      JOIN address a  ON m.address_id  = a.address_id
      JOIN region  r  ON a.region_id   = r.region_id
      WHERE uc.consumer_id = $1
      ORDER BY uc.connection_date DESC
    `, [req.user.userId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// ── GET /api/consumer/bills ───────────────────────────────────────────────────
router.get('/bills', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  try {
    const result = await pool.query(`
      SELECT
        bd.bill_document_id,
        bd.bill_type,
        bd.bill_generation_date,
        bd.unit_consumed,
        bd.energy_amount,
        bd.total_amount                        AS amount,
        ${statusSQL}                           AS status,
        bp.bill_period_start,
        bp.bill_period_end,
        bp.due_date,
        bp.remarks,
        u.utility_name,
        u.unit_of_measurement,
        LOWER(u.utility_name)                  AS utility_tag,
        TO_CHAR(bp.bill_period_start, 'Mon YYYY') AS period,
        uc.connection_id
      FROM bill_document bd
      JOIN utility_connection uc ON bd.connection_id     = uc.connection_id
      JOIN tariff  t              ON uc.tariff_id         = t.tariff_id
      JOIN utility u              ON t.utility_id         = u.utility_id
      LEFT JOIN bill_postpaid bp  ON bd.bill_document_id  = bp.bill_document_id
      WHERE uc.consumer_id = $1
      ORDER BY bd.bill_generation_date DESC
      LIMIT $2
    `, [req.user.userId, limit]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// ── GET /api/consumer/bills/:id ───────────────────────────────────────────────
router.get('/bills/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        bd.bill_document_id,
        bd.bill_type,
        bd.bill_generation_date,
        bd.unit_consumed,
        bd.energy_amount,
        bd.total_amount,
        ${statusSQL}                           AS status,
        bp.bill_period_start,
        bp.bill_period_end,
        bp.due_date,
        bp.remarks,
        u.utility_name,
        u.unit_of_measurement,
        LOWER(u.utility_name)                  AS utility_tag,
        TO_CHAR(bp.bill_period_start, 'Mon YYYY') AS period,
        t.tariff_name,
        t.billing_method,
        uc.connection_id,
        uc.payment_type
      FROM bill_document bd
      JOIN utility_connection uc ON bd.connection_id     = uc.connection_id
      JOIN tariff  t              ON uc.tariff_id         = t.tariff_id
      JOIN utility u              ON t.utility_id         = u.utility_id
      LEFT JOIN bill_postpaid bp  ON bd.bill_document_id  = bp.bill_document_id
      WHERE bd.bill_document_id = $1
        AND uc.consumer_id      = $2
    `, [req.params.id, req.user.userId]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Bill not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

// ── GET /api/consumer/usage ───────────────────────────────────────────────────
router.get('/usage', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        us.meter_id,
        us.usage_id,
        us.unit_used                        AS units_logged,
        us.time_from,
        us.time_to,
        us.tariff_id,
        us.slab_num,
        ts.rate_per_unit,
        ROUND(us.unit_used * ts.rate_per_unit, 2) AS cost,
        u.utility_name,
        u.unit_of_measurement,
        LOWER(u.utility_name)               AS utility_tag
      FROM usage us
      JOIN utility_connection uc ON us.meter_id  = uc.meter_id
      JOIN tariff  t              ON uc.tariff_id = t.tariff_id
      JOIN utility u              ON t.utility_id = u.utility_id
      JOIN tariff_slab ts         ON us.tariff_id = ts.tariff_id
                                 AND us.slab_num  = ts.slab_num
      WHERE uc.consumer_id = $1
      ORDER BY us.time_to DESC
      LIMIT 60
    `, [req.user.userId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

// ── GET /api/consumer/complaints ──────────────────────────────────────────────
router.get('/complaints', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.complaint_id,
        c.description,
        c.status,
        c.complaint_date,
        c.assignment_date,
        c.resolution_date,
        c.remarks,
        c.connection_id,
        u.utility_name,
        LOWER(u.utility_name) AS utility_tag
      FROM complaint c
      LEFT JOIN utility_connection uc ON c.connection_id = uc.connection_id
      LEFT JOIN tariff  t              ON uc.tariff_id   = t.tariff_id
      LEFT JOIN utility u              ON t.utility_id   = u.utility_id
      WHERE c.consumer_id = $1
      ORDER BY c.complaint_date DESC
    `, [req.user.userId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// ── POST /api/consumer/complaints ─────────────────────────────────────────────
router.post('/complaints', async (req, res) => {
  const { connection_id, description } = req.body;
  if (!description)
    return res.status(400).json({ error: 'Description is required' });

  try {
    const result = await pool.query(`
      INSERT INTO complaint (consumer_id, connection_id, description, status, complaint_date)
      VALUES ($1, $2, $3, 'Pending', CURRENT_TIMESTAMP)
      RETURNING *
    `, [req.user.userId, connection_id || null, description]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit complaint' });
  }
});

// ── POST /api/consumer/payments ───────────────────────────────────────────────
// payment_after_insert trigger handles setting bill_status = 'PAID' automatically
router.post('/payments', async (req, res) => {
  const { bill_document_id, payment_amount, payment_method, provider_name, phone_num, account_num } = req.body;

  if (!bill_document_id || !payment_amount || !payment_method)
    return res.status(400).json({ error: 'bill_document_id, payment_amount, and payment_method are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify bill belongs to this consumer and isn't already paid
    const billCheck = await client.query(`
      SELECT bd.bill_document_id, bd.bill_status, uc.consumer_id
      FROM bill_document bd
      JOIN utility_connection uc ON bd.connection_id = uc.connection_id
      WHERE bd.bill_document_id = $1 AND uc.consumer_id = $2
    `, [bill_document_id, req.user.userId]);

    if (billCheck.rows.length === 0)
      return res.status(404).json({ error: 'Bill not found' });
    if (billCheck.rows[0].bill_status === 'PAID')
      return res.status(400).json({ error: 'Bill already paid' });

    // Payment method
    const methodRes = await client.query(
      `INSERT INTO payment_method (method_name) VALUES ($1) RETURNING method_id`,
      [payment_method]
    );
    const methodId = methodRes.rows[0].method_id;

    if (payment_method === 'mobile_banking') {
      await client.query(
        `INSERT INTO mobile_banking (method_id, provider_name, phone_num) VALUES ($1, $2, $3)`,
        [methodId, provider_name || 'bKash', phone_num]
      );
    } else if (payment_method === 'bank') {
      await client.query(
        `INSERT INTO bank (method_id, bank_name, account_num) VALUES ($1, $2, $3)`,
        [methodId, provider_name || 'Unknown', account_num || phone_num]
      );
    }

    // Insert payment — trigger fires and sets bill_document.bill_status = 'PAID'
    const paymentRes = await client.query(`
      INSERT INTO payment (bill_document_id, method_id, payment_amount, payment_date, status)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'Completed')
      RETURNING payment_id
    `, [bill_document_id, methodId, payment_amount]);

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Payment successful',
      payment_id: paymentRes.rows[0].payment_id,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Payment failed' });
  } finally {
    client.release();
  }
});

module.exports = router;