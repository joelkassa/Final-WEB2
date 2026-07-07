const pool = require('../config/db');

async function createProfile(userId, data) {
  const result = await pool.query(
    `INSERT INTO worker_profiles
      (user_id, category_id, custom_category, bio, price_min, price_max, service_area, availability_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      userId,
      data.categoryId || null,
      data.customCategory || null,
      data.bio || null,
      data.priceMin || null,
      data.priceMax || null,
      data.serviceArea || null,
      data.availabilityStatus || 'available'
    ]
  );
  return result.rows[0].id;
}

async function getRawById(id) {
  const result = await pool.query('SELECT * FROM worker_profiles WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getIdByUserId(userId) {
  const result = await pool.query('SELECT id FROM worker_profiles WHERE user_id = $1', [userId]);
  return result.rows[0] ? result.rows[0].id : null;
}

async function updateProfile(id, data) {
  await pool.query(
    `UPDATE worker_profiles SET
      category_id = $1,
      custom_category = $2,
      bio = $3,
      price_min = $4,
      price_max = $5,
      service_area = $6,
      availability_status = $7
     WHERE id = $8`,
    [
      data.categoryId || null,
      data.customCategory || null,
      data.bio || null,
      data.priceMin || null,
      data.priceMax || null,
      data.serviceArea || null,
      data.availabilityStatus || 'available',
      id
    ]
  );
}

async function getFullProfile(id, includeSlots) {
  const profileResult = await pool.query(
    `SELECT wp.*, u.name AS user_name, c.name AS category_name,
       COALESCE(AVG(r.rating), 0)::float AS avg_rating,
       COUNT(DISTINCT r.id)::int AS review_count
     FROM worker_profiles wp
     JOIN users u ON u.id = wp.user_id
     LEFT JOIN categories c ON c.id = wp.category_id
     LEFT JOIN bookings b ON b.worker_profile_id = wp.id
     LEFT JOIN reviews r ON r.booking_id = b.id AND r.is_hidden = false
     WHERE wp.id = $1
     GROUP BY wp.id, u.name, c.name`,
    [id]
  );

  if (profileResult.rows.length === 0) return null;
  const profile = profileResult.rows[0];

  const skillsResult = await pool.query(
    'SELECT id, skill_name FROM skills WHERE worker_profile_id = $1',
    [id]
  );
  const portfolioResult = await pool.query(
    'SELECT id, image_url FROM portfolio_images WHERE worker_profile_id = $1',
    [id]
  );

  let slots = [];
  if (includeSlots) {
    const slotsResult = await pool.query(
      'SELECT id, slot_date, start_time, end_time, is_booked FROM availability_slots WHERE worker_profile_id = $1 ORDER BY slot_date, start_time',
      [id]
    );
    slots = slotsResult.rows;
  }

  return { profile, skills: skillsResult.rows, portfolio: portfolioResult.rows, slots };
}

async function listWorkers(filters) {
  const conditions = ['wp.is_approved = true'];
  const params = [];

  if (filters.category) {
    params.push(filters.category);
    conditions.push(`wp.category_id = $${params.length}`);
  }
  if (filters.name) {
    params.push(`%${filters.name}%`);
    conditions.push(`u.name ILIKE $${params.length}`);
  }
  if (filters.location) {
    params.push(`%${filters.location}%`);
    conditions.push(`wp.service_area ILIKE $${params.length}`);
  }

  let havingClause = '';
  if (filters.minRating) {
    params.push(filters.minRating);
    havingClause = `HAVING COALESCE(AVG(r.rating), 0) >= $${params.length}`;
  }

  const query = `
    SELECT wp.id, u.name AS user_name, wp.category_id, c.name AS category_name,
      wp.custom_category, wp.availability_status, wp.photo_url,
      wp.price_min, wp.price_max, wp.service_area,
      COALESCE(AVG(r.rating), 0)::float AS avg_rating,
      COUNT(DISTINCT r.id)::int AS review_count
    FROM worker_profiles wp
    JOIN users u ON u.id = wp.user_id
    LEFT JOIN categories c ON c.id = wp.category_id
    LEFT JOIN bookings b ON b.worker_profile_id = wp.id
    LEFT JOIN reviews r ON r.booking_id = b.id AND r.is_hidden = false
    WHERE ${conditions.join(' AND ')}
    GROUP BY wp.id, u.name, c.name
    ${havingClause}
    ORDER BY wp.created_at DESC
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

async function addSkill(workerProfileId, skillName) {
  const result = await pool.query(
    'INSERT INTO skills (worker_profile_id, skill_name) VALUES ($1, $2) RETURNING id',
    [workerProfileId, skillName]
  );
  return result.rows[0].id;
}

async function getSkillOwnerId(skillId) {
  const result = await pool.query(
    `SELECT wp.user_id FROM skills s
     JOIN worker_profiles wp ON wp.id = s.worker_profile_id
     WHERE s.id = $1`,
    [skillId]
  );
  return result.rows[0] ? result.rows[0].user_id : null;
}

async function removeSkill(skillId) {
  await pool.query('DELETE FROM skills WHERE id = $1', [skillId]);
}

async function addPortfolioImage(workerProfileId, imageUrl) {
  const result = await pool.query(
    'INSERT INTO portfolio_images (worker_profile_id, image_url) VALUES ($1, $2) RETURNING id',
    [workerProfileId, imageUrl]
  );
  return result.rows[0].id;
}

async function addAvailabilitySlot(workerProfileId, data) {
  const result = await pool.query(
    `INSERT INTO availability_slots (worker_profile_id, slot_date, start_time, end_time)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [workerProfileId, data.slotDate, data.startTime, data.endTime]
  );
  return result.rows[0].id;
}

async function getSlotOwnerAndStatus(slotId) {
  const result = await pool.query(
    `SELECT wp.user_id, s.is_booked FROM availability_slots s
     JOIN worker_profiles wp ON wp.id = s.worker_profile_id
     WHERE s.id = $1`,
    [slotId]
  );
  return result.rows[0] || null;
}

async function removeAvailabilitySlot(slotId) {
  await pool.query('DELETE FROM availability_slots WHERE id = $1', [slotId]);
}

async function getOpenAvailability(workerProfileId) {
  const result = await pool.query(
    `SELECT id, slot_date, start_time, end_time FROM availability_slots
     WHERE worker_profile_id = $1 AND is_booked = false AND slot_date >= CURRENT_DATE
     ORDER BY slot_date, start_time`,
    [workerProfileId]
  );
  return result.rows;
}

async function getReviewsForWorker(workerProfileId) {
  const result = await pool.query(
    `SELECT r.id, r.rating, r.comment, r.created_at FROM reviews r
     JOIN bookings b ON b.id = r.booking_id
     WHERE b.worker_profile_id = $1 AND r.is_hidden = false
     ORDER BY r.created_at DESC`,
    [workerProfileId]
  );
  return result.rows;
}

module.exports = {
  createProfile,
  getRawById,
  getIdByUserId,
  updateProfile,
  getFullProfile,
  listWorkers,
  addSkill,
  getSkillOwnerId,
  removeSkill,
  addPortfolioImage,
  addAvailabilitySlot,
  getSlotOwnerAndStatus,
  removeAvailabilitySlot,
  getOpenAvailability,
  getReviewsForWorker
};

























