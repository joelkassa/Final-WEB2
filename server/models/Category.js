const pool = require('../config/db');

async function getAllCategories() {
  const result = await pool.query('SELECT id, name FROM categories ORDER BY name');
  return result.rows;
}

module.exports = { getAllCategories };


