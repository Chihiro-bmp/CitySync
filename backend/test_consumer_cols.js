require('dotenv').config({ path: __dirname + '/.env' });
const pool = require('./db/config');

pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'consumer'")
  .then(res => { console.log(res.rows); process.exit(0); });
