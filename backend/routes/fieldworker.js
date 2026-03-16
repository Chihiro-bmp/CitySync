const express = require('express');
const router = express.Router();
const pool = require('../db/config');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware(['field_worker']));

// ── GET My Assigned Jobs (Complaints) ──
router.get('/jobs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        comp.*,
        p.first_name as consumer_first_name,
        p.last_name as consumer_last_name,
        p.phone_number as consumer_phone,
        a.house_num,
        a.street_name,
        a.landmark,
        r.region_name,
        u.utility_name
      FROM complaint comp
      LEFT JOIN consumer c ON comp.consumer_id = c.person_id
      LEFT JOIN person p ON c.person_id = p.person_id
      LEFT JOIN address a ON p.address_id = a.address_id
      LEFT JOIN region r ON a.region_id = r.region_id
      LEFT JOIN utility_connection uc ON comp.connection_id = uc.connection_id
      LEFT JOIN tariff t ON uc.tariff_id = t.tariff_id
      LEFT JOIN utility u ON t.utility_id = u.utility_id
      WHERE comp.assigned_to = $1
      ORDER BY comp.complaint_date DESC
    `, [req.user.userId]);

    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ── PUT Update Job Status (resolve with remarks) ──
router.put('/jobs/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    const result = await pool.query(`
      UPDATE complaint
      SET 
        status = $1,
        remarks = COALESCE($2, remarks),
        resolution_date = CASE WHEN $1 = 'Resolved' THEN CURRENT_DATE ELSE resolution_date END
      WHERE complaint_id = $3 AND assigned_to = $4
      RETURNING *
    `, [status, remarks || null, id, req.user.userId]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Job not found or not assigned to you' });

    res.json({ message: 'Job status updated', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ── GET Connections for Meter Readings (field worker's region only) ──
router.get('/connections', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        uc.connection_id,
        uc.connection_status,
        uc.tariff_id,
        m.meter_id,
        m.meter_type,
        a.house_num,
        a.street_name,
        p.first_name as consumer_first_name,
        p.last_name as consumer_last_name,
        u.utility_name,
        u.unit_of_measurement
      FROM utility_connection uc
      JOIN meter m ON uc.meter_id = m.meter_id
      JOIN address a ON m.address_id = a.address_id
      JOIN consumer c ON uc.consumer_id = c.person_id
      JOIN person p ON c.person_id = p.person_id
      JOIN tariff t ON uc.tariff_id = t.tariff_id
      JOIN utility u ON t.utility_id = u.utility_id
      JOIN field_worker fw ON fw.assigned_region_id = a.region_id
      WHERE fw.person_id = $1
        AND uc.connection_status ILIKE 'Active'
      ORDER BY a.street_name, a.house_num
    `, [req.user.userId]);

    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ── POST Submit Meter Reading ──
router.post('/readings', async (req, res) => {
  const { meter_id, tariff_id, slab_num, time_from, time_to, units_logged } = req.body;

  if (!meter_id || !tariff_id || !slab_num || !time_from || !time_to || units_logged === undefined)
    return res.status(400).json({ error: 'Missing required fields: meter_id, tariff_id, slab_num, time_from, time_to, units_logged' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const readingResult = await client.query(`
      INSERT INTO meter_reading (meter_id, tariff_id, slab_num, field_worker_id, time_from, time_to, units_logged, reading_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING reading_id
    `, [meter_id, tariff_id, slab_num, req.user.userId, time_from, time_to, units_logged]);

    const readingId = readingResult.rows[0].reading_id;

    // Call stored proc: sets approved_by = field worker here, creates usage record
    await client.query(`SELECT create_usage_from_reading($1, $2)`, [readingId, req.user.userId]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Reading submitted and usage created', reading_id: readingId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to submit reading' });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  PROFILE
// ════════════════════════════════════════════════════════════════════════════

// GET /api/fieldworker/profile
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
        fw.expertise,
        fw.skillset,
        ar.region_name    AS assigned_region,
        -- Stats
        (SELECT COUNT(*) FROM complaint WHERE assigned_to = p.person_id)                          AS total_jobs,
        (SELECT COUNT(*) FROM complaint WHERE assigned_to = p.person_id AND status = 'Resolved')  AS resolved_jobs,
        (SELECT COUNT(*) FROM complaint WHERE assigned_to = p.person_id AND status != 'Resolved') AS pending_jobs,
        (SELECT COUNT(*) FROM meter_reading WHERE field_worker_id = p.person_id)                  AS total_readings
      FROM person p
      JOIN account     acc  ON acc.person_id       = p.person_id
      LEFT JOIN employee    e    ON e.person_id     = p.person_id
      LEFT JOIN field_worker fw  ON fw.person_id    = p.person_id
      JOIN address     addr ON p.address_id         = addr.address_id
      JOIN region      r    ON addr.region_id       = r.region_id
      LEFT JOIN region ar   ON fw.assigned_region_id = ar.region_id
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

// PUT /api/fieldworker/profile  (name, phone, gender only)
router.put('/profile', async (req, res) => {
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

// PUT /api/fieldworker/avatar
router.put('/avatar', async (req, res) => {
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

// PUT /api/fieldworker/password
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

module.exports = router;