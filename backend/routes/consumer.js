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

// ── GET /api/consumer/applications ───────────────────────────────────────────
router.get('/applications', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ca.application_id,
        ca.utility_type,
        ca.application_date,
        ca.status,
        ca.requested_connection_type,
        ca.address,
        ca.review_date,
        ca.approval_date,
        ca.priority,
        p.first_name || ' ' || p.last_name AS reviewed_by_name
      FROM connection_application ca
      LEFT JOIN employee e  ON ca.reviewed_by = e.person_id
      LEFT JOIN person   p  ON e.person_id    = p.person_id
      WHERE ca.consumer_id = $1
      ORDER BY ca.application_date DESC
    `, [req.user.userId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// ── POST /api/consumer/applications ──────────────────────────────────────────
router.post('/applications', async (req, res) => {
  const { utility_type, requested_connection_type, address, priority } = req.body;

  if (!utility_type || !requested_connection_type || !address)
    return res.status(400).json({ error: 'utility_type, requested_connection_type and address are required' });

  try {
    const result = await pool.query(`
      INSERT INTO connection_application
        (consumer_id, utility_type, requested_connection_type, address, priority, status, application_date)
      VALUES ($1, $2, $3, $4, $5, 'Pending', CURRENT_DATE)
      RETURNING *
    `, [req.user.userId, utility_type, requested_connection_type, address, priority || 'Normal']);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// ── GET /api/consumer/profile ─────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
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
        a.email,
        a.account_type   AS role,
        a.created_at,
        a.avatar_b64,
        c.consumer_type,
        c.registration_date,
        addr.house_num,
        addr.street_name,
        addr.landmark,
        r.region_name,
        r.postal_code,
        -- Stats
        (SELECT COUNT(*) FROM utility_connection uc WHERE uc.consumer_id = p.person_id)               AS total_connections,
        (SELECT COUNT(*) FROM utility_connection uc
          JOIN bill_document bd ON bd.connection_id = uc.connection_id
          WHERE uc.consumer_id = p.person_id)                                                          AS total_bills,
        (SELECT COALESCE(SUM(bd.total_amount),0) FROM utility_connection uc
          JOIN bill_document bd ON bd.connection_id = uc.connection_id
          WHERE uc.consumer_id = p.person_id AND bd.bill_status = 'PAID')                              AS total_paid,
        (SELECT COALESCE(SUM(bd.total_amount),0) FROM utility_connection uc
          JOIN bill_document bd ON bd.connection_id = uc.connection_id
          WHERE uc.consumer_id = p.person_id AND bd.bill_status = 'UNPAID')                            AS total_outstanding,
        (SELECT COUNT(*) FROM complaint WHERE consumer_id = p.person_id)                               AS total_complaints,
        (SELECT COUNT(*) FROM connection_application WHERE consumer_id = p.person_id)                  AS total_applications
      FROM person p
      JOIN account  a    ON a.person_id    = p.person_id
      JOIN consumer c    ON c.person_id    = p.person_id
      JOIN address  addr ON p.address_id   = addr.address_id
      JOIN region   r    ON addr.region_id = r.region_id
      WHERE p.person_id = $1
    `, [req.user.userId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── PUT /api/consumer/profile ─────────────────────────────────────────────────
router.put('/profile', async (req, res) => {
  const { first_name, last_name, phone_number, gender } = req.body;
  if (!first_name || !last_name || !phone_number)
    return res.status(400).json({ error: 'first_name, last_name and phone_number are required' });

  try {
    await pool.query(`
      UPDATE person SET first_name=$1, last_name=$2, phone_number=$3, gender=$4
      WHERE person_id=$5
    `, [first_name, last_name, phone_number, gender || null, req.user.userId]);

    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── PUT /api/consumer/avatar ──────────────────────────────────────────────────
router.put('/avatar', async (req, res) => {
  const { avatar_b64 } = req.body;
  if (!avatar_b64) return res.status(400).json({ error: 'avatar_b64 is required' });
  // Limit to ~2MB base64
  if (avatar_b64.length > 2_800_000)
    return res.status(400).json({ error: 'Image too large. Max 2MB.' });

  try {
    await pool.query(
      `UPDATE account SET avatar_b64 = $1 WHERE person_id = $2`,
      [avatar_b64, req.user.userId]
    );
    res.json({ message: 'Avatar updated', avatar_b64 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// ── PUT /api/consumer/password ────────────────────────────────────────────────
router.put('/password', async (req, res) => {
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

// ── PUT /api/consumer/deactivate ──────────────────────────────────────────────
router.put('/deactivate', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password confirmation required' });

  const bcrypt = require('bcrypt');
  try {
    const result = await pool.query(
      `SELECT password_hashed FROM account WHERE person_id = $1`,
      [req.user.userId]
    );
    const valid = await bcrypt.compare(password, result.rows[0].password_hashed);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    await pool.query(
      `UPDATE account SET is_active = FALSE WHERE person_id = $1`,
      [req.user.userId]
    );
    res.json({ message: 'Account deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to deactivate account' });
  }
});