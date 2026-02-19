const express = require('express');
const router = express.Router();
const pool = require('../db/config');

// Example: Get all regions
router.get('/regions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM REGION');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Example: Create a new region
router.post('/regions', async (req, res) => {
  const { region_name, postal_code } = req.body;
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

// Example: Get all consumers
router.get('/consumers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, p.FIRST_NAME, p.LAST_NAME, p.PHONE_NUMBER 
      FROM CONSUMER c 
      JOIN PERSON p ON c.PERSON_ID = p.PERSON_ID
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update region
router.put('/regions/:id', async (req, res) => {
  const { id } = req.params;
  const { region_name, postal_code } = req.body;
  try {
    const result = await pool.query(
      'UPDATE region SET region_name = $1, postal_code = $2 WHERE region_id = $4 RETURNING *',
      [region_name, postal_code, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete region
router.delete('/regions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM REGION WHERE REGION_ID = $1', [id]);
    res.json({ message: 'Region deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add more routes as needed...

module.exports = router;