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

// ── GET /api/consumer/payment-methods ────────────────────────────────────────
router.get('/payment-methods', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        pm.method_id, pm.method_name, pm.is_default,
        b.bank_name,   b.account_num,
        mb.provider_name, mb.phone_num AS mb_phone,
        gp.google_account_email, gp.phone_num AS gp_phone
      FROM payment_method pm
      LEFT JOIN bank          b  ON pm.method_id = b.method_id
      LEFT JOIN mobile_banking mb ON pm.method_id = mb.method_id
      LEFT JOIN google_pay    gp ON pm.method_id = gp.method_id
      WHERE pm.consumer_id = $1
      ORDER BY pm.is_default DESC, pm.method_id ASC
    `, [req.user.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// ── POST /api/consumer/payment-methods ───────────────────────────────────────
router.post('/payment-methods', async (req, res) => {
  const { method_name, bank_name, account_num, provider_name, phone_num, google_account_email, set_default } = req.body;
  if (!method_name) return res.status(400).json({ error: 'method_name is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // If setting as default, unset existing default
    if (set_default) {
      await client.query(
        `UPDATE payment_method SET is_default = FALSE WHERE consumer_id = $1`,
        [req.user.userId]
      );
    }

    const methodRes = await client.query(
      `INSERT INTO payment_method (method_name, consumer_id, is_default) VALUES ($1, $2, $3) RETURNING method_id`,
      [method_name, req.user.userId, set_default || false]
    );
    const methodId = methodRes.rows[0].method_id;

    if (method_name === 'bank') {
      if (!bank_name || !account_num) throw new Error('bank_name and account_num are required');
      await client.query(
        `INSERT INTO bank (method_id, bank_name, account_num) VALUES ($1, $2, $3)`,
        [methodId, bank_name, account_num]
      );
    } else if (method_name === 'mobile_banking') {
      if (!provider_name || !phone_num) throw new Error('provider_name and phone_num are required');
      await client.query(
        `INSERT INTO mobile_banking (method_id, provider_name, phone_num) VALUES ($1, $2, $3)`,
        [methodId, provider_name, phone_num]
      );
    } else if (method_name === 'google_pay') {
      if (!google_account_email) throw new Error('google_account_email is required');
      await client.query(
        `INSERT INTO google_pay (method_id, google_account_email, phone_num) VALUES ($1, $2, $3)`,
        [methodId, google_account_email, phone_num || null]
      );
    } else {
      throw new Error('Invalid method_name');
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Payment method added', method_id: methodId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to add payment method' });
  } finally {
    client.release();
  }
});

// ── PUT /api/consumer/payment-methods/:id/default ─────────────────────────────
router.put('/payment-methods/:id/default', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE payment_method SET is_default = FALSE WHERE consumer_id = $1`,
      [req.user.userId]
    );
    await client.query(
      `UPDATE payment_method SET is_default = TRUE WHERE method_id = $1 AND consumer_id = $2`,
      [req.params.id, req.user.userId]
    );
    await client.query('COMMIT');
    res.json({ message: 'Default updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to update default' });
  } finally {
    client.release();
  }
});

// ── DELETE /api/consumer/payment-methods/:id ──────────────────────────────────
router.delete('/payment-methods/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM payment_method WHERE method_id = $1 AND consumer_id = $2 RETURNING method_id`,
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Payment method not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// ── GET /api/consumer/payment-history ────────────────────────────────────────
router.get('/payment-history', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.payment_id, p.payment_amount, p.payment_date, p.status,
        pm.method_name, pm.is_default,
        b.bank_name,   b.account_num,
        mb.provider_name, mb.phone_num AS mb_phone,
        gp.google_account_email,
        bd.total_amount, bd.bill_generation_date,
        LOWER(u.utility_name) AS utility_name
      FROM payment p
      JOIN payment_method   pm ON p.method_id       = pm.method_id
      JOIN bill_document    bd ON p.bill_document_id = bd.bill_document_id
      JOIN utility_connection uc ON bd.connection_id = uc.connection_id
      JOIN tariff           t  ON uc.tariff_id       = t.tariff_id
      JOIN utility          u  ON t.utility_id       = u.utility_id
      LEFT JOIN bank          b  ON pm.method_id = b.method_id
      LEFT JOIN mobile_banking mb ON pm.method_id = mb.method_id
      LEFT JOIN google_pay    gp ON pm.method_id = gp.method_id
      WHERE uc.consumer_id = $1
      ORDER BY p.payment_date DESC
      LIMIT 50
    `, [req.user.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// ── POST /api/consumer/payments ───────────────────────────────────────────────
// Pays a bill using a saved or new payment method
// payment_after_insert trigger sets bill_status = 'PAID' automatically
router.post('/payments', async (req, res) => {
  const { bill_document_id, payment_amount, method_id } = req.body;

  if (!bill_document_id || !payment_amount || !method_id)
    return res.status(400).json({ error: 'bill_document_id, payment_amount, and method_id are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify bill belongs to this consumer and is unpaid
    const billCheck = await client.query(`
      SELECT bd.bill_document_id, bd.bill_status
      FROM bill_document bd
      JOIN utility_connection uc ON bd.connection_id = uc.connection_id
      WHERE bd.bill_document_id = $1 AND uc.consumer_id = $2
    `, [bill_document_id, req.user.userId]);

    if (billCheck.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
    if (billCheck.rows[0].bill_status === 'PAID') return res.status(400).json({ error: 'Bill already paid' });

    // Verify method belongs to this consumer
    const methodCheck = await pool.query(
      `SELECT method_id FROM payment_method WHERE method_id = $1 AND consumer_id = $2`,
      [method_id, req.user.userId]
    );
    if (methodCheck.rows.length === 0) return res.status(404).json({ error: 'Payment method not found' });

    // Insert payment — trigger fires and sets bill_status = 'PAID'
    const paymentRes = await client.query(`
      INSERT INTO payment (bill_document_id, method_id, payment_amount, payment_date, status)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'Completed')
      RETURNING payment_id
    `, [bill_document_id, method_id, payment_amount]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Payment successful', payment_id: paymentRes.rows[0].payment_id });
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