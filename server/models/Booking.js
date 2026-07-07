const pool = require('../config/db');

async function createBooking(clientId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const slotResult = await client.query(
      'SELECT is_booked, worker_profile_id FROM availability_slots WHERE id = $1 FOR UPDATE',
      [data.slotId]
    );

    if (slotResult.rows.length === 0) {
      throw { statusCode: 404, message: 'Time slot not found.' };
    }
    if (slotResult.rows[0].is_booked) {
      throw { statusCode: 409, message: 'That time slot is no longer available.' };
    }
    if (slotResult.rows[0].worker_profile_id !== data.workerProfileId) {
      throw { statusCode: 400, message: 'Slot does not belong to this professional.' };
    }

    const bookingResult = await client.query(
      `INSERT INTO bookings (client_id, worker_profile_id, slot_id, description, budget, agreement_notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [clientId, data.workerProfileId, data.slotId, data.description, data.budget || null, data.agreementNotes || null]
    );

    await client.query(
      'UPDATE availability_slots SET is_booked = true WHERE id = $1',
      [data.slotId]
    );

    await client.query('COMMIT');
    return bookingResult.rows[0].id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getBookingRaw(id) {
  const result = await pool.query(
    `SELECT b.*, wp.user_id AS worker_user_id
     FROM bookings b
     JOIN worker_profiles wp ON wp.id = b.worker_profile_id
     WHERE b.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getBookingsForClient(clientId) {
  const result = await pool.query(
    `SELECT b.id, b.description, b.budget, b.agreement_notes, b.status, b.created_at,
       u.name AS worker_name,
       s.slot_date, s.start_time, s.end_time,
       EXISTS(SELECT 1 FROM reviews r WHERE r.booking_id = b.id) AS has_review
     FROM bookings b
     JOIN worker_profiles wp ON wp.id = b.worker_profile_id
     JOIN users u ON u.id = wp.user_id
     JOIN availability_slots s ON s.id = b.slot_id
     WHERE b.client_id = $1
     ORDER BY b.created_at DESC`,
    [clientId]
  );
  return result.rows;
}

async function getBookingsForWorker(workerUserId) {
  const result = await pool.query(
    `SELECT b.id, b.description, b.budget, b.agreement_notes, b.status, b.created_at,
       cu.name AS client_name,
       s.slot_date, s.start_time, s.end_time
     FROM bookings b
     JOIN worker_profiles wp ON wp.id = b.worker_profile_id
     JOIN users cu ON cu.id = b.client_id
     JOIN availability_slots s ON s.id = b.slot_id
     WHERE wp.user_id = $1
     ORDER BY b.created_at DESC`,
    [workerUserId]
  );
  return result.rows;
}

async function updateStatus(id, status) {
  await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, id]);
}

async function freeSlot(slotId) {
  await pool.query('UPDATE availability_slots SET is_booked = false WHERE id = $1', [slotId]);
}

module.exports = {
  createBooking,
  getBookingRaw,
  getBookingsForClient,
  getBookingsForWorker,
  updateStatus,
  freeSlot
};













