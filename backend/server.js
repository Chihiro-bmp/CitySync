const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db/config');
const apiRoutes      = require('./routes/api');
const authRoutes     = require('./routes/auth');
const adminRoutes    = require('./routes/admin');
const consumerRoutes = require('./routes/consumer');
const aiRoutes       = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api',          apiRoutes);
app.use('/api/auth',     authRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/consumer', consumerRoutes);
app.use('/api/ai',       aiRoutes);

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});