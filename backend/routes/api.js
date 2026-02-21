const express = require('express');
const router = express.Router();
const pool = require('../db/config');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// ─── REGIONS ──────────────────────────────────────────────────────────────────

// GET all regions
router.get('/regions', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM region ORDER BY region_id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET single region
router.get('/regions/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM region WHERE region_id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Region not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST create region
router.post('/regions', authMiddleware, roleMiddleware(['employee']), async (req, res) => {
  const { region_name, postal_code } = req.body;
  if (!region_name || !postal_code) {
    return res.status(400).json({ error: 'region_name and postal_code are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO region (region_name, postal_code) VALUES ($1, $2) RETURNING *',
      [region_name, postal_code]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT update region — FIXED: was $4, now correctly $3
router.put('/regions/:id', authMiddleware, roleMiddleware(['employee']), async (req, res) => {
  const { id } = req.params;
  const { region_name, postal_code } = req.body;
  try {
    const result = await pool.query(
      'UPDATE region SET region_name = $1, postal_code = $2 WHERE region_id = $3 RETURNING *',
      [region_name, postal_code, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Region not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE region
router.delete('/regions/:id', authMiddleware, roleMiddleware(['employee']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM region WHERE region_id = $1 RETURNING region_id',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Region not found' });
    res.json({ message: 'Region deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ─── CONSUMERS ────────────────────────────────────────────────────────────────

// GET all consumers (admin/employee only)
router.get('/consumers', authMiddleware, roleMiddleware(['employee']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.person_id,
        c.consumer_type,
        c.registration_date,
        p.first_name,
        p.last_name,
        p.phone_number,
        p.national_id,
        a.email
      FROM consumer c
      JOIN person p ON c.person_id = p.person_id
      JOIN account a ON a.person_id = p.person_id
      ORDER BY c.registration_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET single consumer profile (consumer can view their own)
router.get('/consumers/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { userId, role } = req.user;

  // Consumers can only view their own profile
  if (role === 'consumer' && parseInt(id) !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        c.person_id,
        c.consumer_type,
        c.registration_date,
        p.first_name,
        p.last_name,
        p.phone_number,
        p.national_id,
        p.date_of_birth,
        p.gender,
        a.email,
        addr.house_num,
        addr.street_name,
        addr.landmark,
        r.region_name,
        r.postal_code
      FROM consumer c
      JOIN person p ON c.person_id = p.person_id
      JOIN account a ON a.person_id = p.person_id
      JOIN address addr ON p.address_id = addr.address_id
      JOIN region r ON addr.region_id = r.region_id
      WHERE c.person_id = $1
    `, [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Consumer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;