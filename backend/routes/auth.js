const express = require('express');
const router = express.Router();
const pool = require('../db/config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Register
router.post('/register', async (req, res) => {
  const { 
    // Required fields
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
    // Optional fields
    dateOfBirth,
    gender,
    landmark,
  } = req.body;

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if region exists or create it
    let regionResult = await client.query(
      'SELECT region_id FROM region WHERE postal_code = $1',
      [postalCode]
    );

    let regionId;
    if (regionResult.rows.length === 0) {
      const newRegion = await client.query(
        `INSERT INTO region (postal_code, region_name) 
         VALUES ($1, $2) RETURNING region_id`,
        [postalCode, regionName]
      );
      regionId = newRegion.rows[0].region_id;
    } else {
      regionId = regionResult.rows[0].region_id;
    }

    // Create address
    const addressResult = await client.query(
      `INSERT INTO address (region_id, house_num, street_name, landmark) 
       VALUES ($1, $2, $3, $4) RETURNING address_id`,
      [regionId, houseNum, streetName, landmark || null]
    );

    const addressId = addressResult.rows[0].address_id;

    // Insert into PERSON table
    const personResult = await client.query(
      `INSERT INTO person (
        first_name, last_name, phone_number, national_id, address_id, 
        date_of_birth, gender
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING person_id`,
      [
        firstName, 
        lastName, 
        phoneNumber, 
        nationalId, 
        addressId,
        dateOfBirth || null,
        gender || null
      ]
    );

    const personId = personResult.rows[0].person_id;

    // Insert into ACCOUNT table with correct column names
    await client.query(
      `INSERT INTO account (person_id, email, password_hashed, account_type, is_active) 
       VALUES ($1, $2, $3, $4, $5)`,
      [personId, email, hashedPassword, 'user', true]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Registration error:', err);
    
    if (err.code === '23505') {
      // Unique constraint violation
      if (err.detail && err.detail.includes('email')) {
        res.status(400).json({ error: 'Email already exists' });
      } else if (err.detail && err.detail.includes('national_id')) {
        res.status(400).json({ error: 'National ID already registered' });
      } else if (err.detail && err.detail.includes('phone_number')) {
        res.status(400).json({ error: 'Phone number already registered' });
      } else {
        res.status(400).json({ error: 'Duplicate entry detected' });
      }
    } else {
      res.status(500).json({ error: err.message || 'Registration failed' });
    }
  } finally {
    client.release();
  }
});

// Login - accepts email OR phone number
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;

  try {
    // Check if identifier is email or phone
    const isEmail = identifier.includes('@');
    
    let query;
    if (isEmail) {
      query = `SELECT a.*, p.first_name, p.last_name, p.person_id 
               FROM account a 
               JOIN person p ON a.person_id = p.person_id 
               WHERE a.email = $1 AND a.is_active = true`;
    } else {
      query = `SELECT a.*, p.first_name, p.last_name, p.person_id 
               FROM account a 
               JOIN person p ON a.person_id = p.person_id 
               WHERE p.phone_number = $1 AND a.is_active = true`;
    }

    const result = await pool.query(query, [identifier]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hashed);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.person_id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.person_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;