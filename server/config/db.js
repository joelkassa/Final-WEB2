const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Failed to connect to PostgreSQL:', err.message);
    return;
  }
  console.log('Connected to PostgreSQL');
  release();
});

module.exports = pool;












