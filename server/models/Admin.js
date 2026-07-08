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

async function unbanUserById(id) {
  const result = await pool.query(
    'UPDATE users SET is_banned = false WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows.length > 0;
}

async function deleteUserById(id) {
  const result = await pool.query(
    'DELETE FROM users WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows.length > 0;
}

async function getAllUsers(filters) {
  const conditions = [];
  const params = [];

  if (filters.role) {
    params.push(filters.role);
    conditions.push(`u.role = $${params.length}`);
  }
  if (filters.category) {
    params.push(filters.category);
    conditions.push(`wp.category_id = $${params.length}`);
  }
  if (filters.isBanned !== null) {
    params.push(filters.isBanned);
    conditions.push(`u.is_banned = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT u.id, u.name, u.email, u.role, u.is_banned, u.created_at,
      wp.id AS worker_profile_id, wp.is_approved, wp.service_area,
      c.name AS category_name, wp.custom_category
    FROM users u
    LEFT JOIN worker_profiles wp ON wp.user_id = u.id
    LEFT JOIN categories c ON c.id = wp.category_id
    ${whereClause}
    ORDER BY u.created_at DESC
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

async function getAllBookings(filters) {
  const conditions = [];
  const params = [];

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`b.status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT b.id, b.description, b.budget, b.agreement_notes, b.status, b.created_at,
      cu.name AS client_name, cu.email AS client_email,
      wu.name AS worker_name, wu.email AS worker_email,
      s.slot_date, s.start_time, s.end_time
    FROM bookings b
    JOIN users cu ON cu.id = b.client_id
    JOIN worker_profiles wp ON wp.id = b.worker_profile_id
    JOIN users wu ON wu.id = wp.user_id
    JOIN availability_slots s ON s.id = b.slot_id
    ${whereClause}
    ORDER BY b.created_at DESC
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

module.exports = {
  getDashboardStats,
  getPendingWorkers,
  approveWorkerProfile,
  banUserById,
  unbanUserById,
  deleteUserById,
  getAllUsers,
  getAllBookings
};