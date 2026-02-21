const express = require('express');
const router = express.Router();
const pool = require('../db/config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');

// ─── REGISTER (creates a consumer account) ────────────────────────────────────
router.post('/register', async (req, res) => {
  const {
    firstName,
    lastName,
    nationalId,
    phoneNumber,
    email,
    password,
    houseNum,
    streetName,
    regionName,
    postalCode,
    dateOfBirth,
    gender,
    landmark,
    consumerType, // 'Residential' or 'Commercial'
  } = req.body;

  // Basic validation
  if (!firstName || !lastName || !nationalId || !phoneNumber || !email || !password || !houseNum || !streetName || !regionName || !postalCode) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if region exists, create if not
    let regionResult = await client.query(
      'SELECT region_id FROM region WHERE postal_code = $1',
      [postalCode]
    );

    let regionId;
    if (regionResult.rows.length === 0) {
      const newRegion = await client.query(
        'INSERT INTO region (postal_code, region_name) VALUES ($1, $2) RETURNING region_id',
        [postalCode, regionName]
      );
      regionId = newRegion.rows[0].region_id;
    } else {
      regionId = regionResult.rows[0].region_id;
    }

    // Create address
    const addressResult = await client.query(
      'INSERT INTO address (region_id, house_num, street_name, landmark) VALUES ($1, $2, $3, $4) RETURNING address_id',
      [regionId, houseNum, streetName, landmark || null]
    );
    const addressId = addressResult.rows[0].address_id;

    // Create person
    const personResult = await client.query(
      `INSERT INTO person (first_name, last_name, phone_number, national_id, address_id, date_of_birth, gender)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING person_id`,
      [firstName, lastName, phoneNumber, nationalId, addressId, dateOfBirth || null, gender || null]
    );
    const personId = personResult.rows[0].person_id;

    // Create account — role is 'consumer' for all self-registrations
    await client.query(
      `INSERT INTO account (person_id, email, password_hashed, account_type, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
      [personId, email, hashedPassword, 'consumer', true]
    );

    // ✅ FIXED: Insert into CONSUMER table
    await client.query(
      `INSERT INTO consumer (person_id, consumer_type, registration_date)
       VALUES ($1, $2, CURRENT_DATE)`,
      [personId, consumerType || 'Residential']
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Account created successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Registration error:', err);

    if (err.code === '23505') {
      if (err.detail?.includes('email')) return res.status(400).json({ error: 'Email already registered' });
      if (err.detail?.includes('national_id')) return res.status(400).json({ error: 'National ID already registered' });
      if (err.detail?.includes('phone_number')) return res.status(400).json({ error: 'Phone number already registered' });
      return res.status(400).json({ error: 'Duplicate entry detected' });
    }

    res.status(500).json({ error: err.message || 'Registration failed' });
  } finally {
    client.release();
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password are required' });
  }

  try {
    const isEmail = identifier.includes('@');
    const whereClause = isEmail
      ? 'a.email = $1'
      : 'p.phone_number = $1';

    const result = await pool.query(
      `SELECT 
          a.account_id,
          a.account_type,
          a.password_hashed,
          a.is_active,
          p.person_id,
          p.first_name,
          p.last_name
       FROM account a
       JOIN person p ON a.person_id = p.person_id
       WHERE ${whereClause} AND a.is_active = true`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hashed);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ✅ FIXED: JWT now includes role
    const token = jwt.sign(
      {
        userId: user.person_id,
        accountId: user.account_id,
        role: user.account_type,   // 'consumer' | 'employee' | 'field_worker' | 'admin'
      },
      process.env.JWT_SECRET || 'change-this-secret-in-production',
      { expiresIn: '24h' }
    );

    // ✅ FIXED: Response includes role so frontend can route correctly
    res.json({
      token,
      user: {
        id: user.person_id,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.account_type,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── GET CURRENT USER (/api/auth/me) ─────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          p.person_id,
          p.first_name,
          p.last_name,
          p.phone_number,
          p.national_id,
          p.date_of_birth,
          p.gender,
          a.email,
          a.account_type AS role,
          a.created_at
       FROM person p
       JOIN account a ON a.person_id = p.person_id
       WHERE p.person_id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;