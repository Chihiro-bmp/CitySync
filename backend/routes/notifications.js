const express = require('express');
const router = express.Router();
const pool = require('../db/config');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Get current notifications for logged-in user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notification WHERE person_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all as read
router.post('/mark-read', async (req, res) => {
  try {
    await pool.query(
      `UPDATE notification SET is_read = TRUE WHERE person_id = $1`,
      [req.user.userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
