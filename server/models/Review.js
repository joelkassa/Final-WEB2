const pool = require('../config/db');

async function createReview(bookingId, rating, comment) {
  const result = await pool.query(
    'INSERT INTO reviews (booking_id, rating, comment) VALUES ($1, $2, $3) RETURNING id',
    [bookingId, rating, comment || null]
  );
  return result.rows[0].id;
}

async function reviewExistsForBooking(bookingId) {
  const result = await pool.query('SELECT id FROM reviews WHERE booking_id = $1', [bookingId]);
  return result.rows.length > 0;
}

module.exports = { createReview, reviewExistsForBooking };



