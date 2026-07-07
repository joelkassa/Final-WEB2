require('dotenv').config();
const express = require('express');
const pool = require('./config/db');

const app = express();
app.use(express.json());

// Temporary test route — we'll remove this once real routes exist.
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', dbTime: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));







