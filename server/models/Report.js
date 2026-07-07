const pool = require('../config/db');

async function createReport(bookingId, reportedBy, reportedAgainst, reason, description) {
  const result = await pool.query(
    `INSERT INTO reports (booking_id, reported_by, reported_against, reason, description)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [bookingId, reportedBy, reportedAgainst, reason, description]
  );
  return result.rows[0].id;
}

async function getAllReports() {
  const result = await pool.query(
    `SELECT r.id, r.reason, r.description, r.status, r.created_at,
       rb.name AS reported_by_name,
       ra.name AS reported_against_name, ra.id AS reported_against_id,
       s.slot_date
     FROM reports r
     JOIN users rb ON rb.id = r.reported_by
     JOIN users ra ON ra.id = r.reported_against
     JOIN bookings b ON b.id = r.booking_id
     JOIN availability_slots s ON s.id = b.slot_id
     ORDER BY r.created_at DESC`
  );
  return result.rows;
}

async function updateReportStatus(id, status, resolvedBy) {
  await pool.query(
    'UPDATE reports SET status = $1, resolved_by = $2 WHERE id = $3',
    [status, resolvedBy, id]
  );
}

module.exports = { createReport, getAllReports, updateReportStatus };







