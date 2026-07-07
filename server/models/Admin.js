const pool = require('../config/db');

async function getDashboardStats() {
  const usersResult = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  const approvedResult = await pool.query('SELECT COUNT(*)::int AS count FROM worker_profiles WHERE is_approved = true');
  const pendingResult = await pool.query('SELECT COUNT(*)::int AS count FROM worker_profiles WHERE is_approved = false');
  const bookingsResult = await pool.query('SELECT COUNT(*)::int AS count FROM bookings');
  const reportsResult = await pool.query("SELECT COUNT(*)::int AS count FROM reports WHERE status = 'open'");

  return {
    totalUsers: usersResult.rows[0].count,
    approvedWorkers: approvedResult.rows[0].count,
    pendingWorkers: pendingResult.rows[0].count,
    totalBookings: bookingsResult.rows[0].count,
    openReports: reportsResult.rows[0].count
  };
}

async function getPendingWorkers() {
  const result = await pool.query(
    `SELECT wp.id, u.name, c.name AS category_name, wp.custom_category,
       wp.service_area, wp.created_at
     FROM worker_profiles wp
     JOIN users u ON u.id = wp.user_id
     LEFT JOIN categories c ON c.id = wp.category_id
     WHERE wp.is_approved = false
     ORDER BY wp.created_at ASC`
  );
  return result.rows;
}

async function approveWorkerProfile(id) {
  const result = await pool.query(
    'UPDATE worker_profiles SET is_approved = true WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows.length > 0;
}

async function banUserById(id) {
  const result = await pool.query(
    'UPDATE users SET is_banned = true WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows.length > 0;
}

module.exports = { getDashboardStats, getPendingWorkers, approveWorkerProfile, banUserById };



