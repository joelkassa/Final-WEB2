require('dotenv').config();
const pool = require('../config/db');
const bcrypt = require('bcrypt');

async function run() {
  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash('password123', 10);

    const categoriesResult = await client.query('SELECT id, name FROM categories');
    const categories = {};
    categoriesResult.rows.forEach(c => { categories[c.name] = c.id; });

    const clientsData = [
      { name: 'Bethlehem Tadesse', email: 'bethlehem@example.com' },
      { name: 'Yonas Girma', email: 'yonas@example.com' }
    ];
    const clientIds = [];
    for (const c of clientsData) {
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'client')
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [c.name, c.email, passwordHash]
      );
      clientIds.push(result.rows[0].id);
    }

    const workersData = [
      { name: 'Dawit Bekele', email: 'dawit.plumber@example.com', category: 'Plumbing', bio: 'Licensed plumber with 8 years of experience in residential repair and installation.', priceMin: 300, priceMax: 1200, area: 'Bole, Addis Ababa', skills: ['Pipe fitting', 'Leak repair', 'Water heater installation'], approved: true },
      { name: 'Selamawit Assefa', email: 'selam.hair@example.com', category: 'Hairstyling', bio: 'Professional hairstylist specializing in braiding and natural hair care.', priceMin: 200, priceMax: 800, area: 'Kazanchis, Addis Ababa', skills: ['Braiding', 'Natural hair care', 'Bridal styling'], approved: true },
      { name: 'Michael Tesfaye', email: 'michael.electric@example.com', category: 'Electrical', bio: 'Certified electrician for home and small business wiring.', priceMin: 400, priceMax: 1500, area: 'Piassa, Addis Ababa', skills: ['Wiring', 'Circuit breaker repair', 'Lighting installation'], approved: true },
      { name: 'Hana Worku', email: 'hana.catering@example.com', category: 'Catering', bio: 'Event caterer for weddings, corporate events, and private parties.', priceMin: 1000, priceMax: 5000, area: 'CMC, Addis Ababa', skills: ['Ethiopian cuisine', 'Buffet setup', 'Event coordination'], approved: false }
    ];

    const workerProfileIds = {};
    for (const w of workersData) {
      const userResult = await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'worker')
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [w.name, w.email, passwordHash]
      );
      const userId = userResult.rows[0].id;

      const profileResult = await client.query(
        `INSERT INTO worker_profiles (user_id, category_id, bio, price_min, price_max, service_area, is_approved, availability_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'available')
         ON CONFLICT (user_id) DO UPDATE SET bio = EXCLUDED.bio
         RETURNING id`,
        [userId, categories[w.category], w.bio, w.priceMin, w.priceMax, w.area, w.approved]
      );
      const profileId = profileResult.rows[0].id;
      workerProfileIds[w.email] = profileId;

      for (const skillName of w.skills) {
        await client.query(
          `INSERT INTO skills (worker_profile_id, skill_name)
           SELECT $1::uuid, $2::varchar(150) WHERE NOT EXISTS (
             SELECT 1 FROM skills WHERE worker_profile_id = $1::uuid AND skill_name = $2::varchar(150)
           )`,
          [profileId, skillName]
        );
      }

      const slotDates = ['2026-07-12', '2026-07-13', '2026-07-14'];
      for (const date of slotDates) {
        await client.query(
          `INSERT INTO availability_slots (worker_profile_id, slot_date, start_time, end_time)
           VALUES ($1, $2, '10:00', '12:00')
           ON CONFLICT (worker_profile_id, slot_date, start_time) DO NOTHING`,
          [profileId, date]
        );
      }
    }

    const dawitProfileId = workerProfileIds['dawit.plumber@example.com'];
    const selamProfileId = workerProfileIds['selam.hair@example.com'];

    const pastSlotResult = await client.query(
      `INSERT INTO availability_slots (worker_profile_id, slot_date, start_time, end_time, is_booked)
       VALUES ($1, '2026-07-01', '14:00', '16:00', true)
       ON CONFLICT (worker_profile_id, slot_date, start_time) DO UPDATE SET is_booked = true
       RETURNING id`,
      [dawitProfileId]
    );
    const completedSlotId = pastSlotResult.rows[0].id;

    const existingBooking = await client.query(
      'SELECT id FROM bookings WHERE slot_id = $1',
      [completedSlotId]
    );
    let completedBookingId;
    if (existingBooking.rows.length === 0) {
      const bookingResult = await client.query(
        `INSERT INTO bookings (client_id, worker_profile_id, slot_id, description, budget, status)
         VALUES ($1, $2, $3, 'Fix leaking kitchen sink pipe', 600, 'completed')
         RETURNING id`,
        [clientIds[0], dawitProfileId, completedSlotId]
      );
      completedBookingId = bookingResult.rows[0].id;

      await client.query(
        `INSERT INTO reviews (booking_id, rating, comment)
         VALUES ($1, 5, 'Dawit arrived on time and fixed the issue quickly. Very professional.')`,
        [completedBookingId]
      );
    }

    const pendingSlotResult = await client.query(
      `INSERT INTO availability_slots (worker_profile_id, slot_date, start_time, end_time, is_booked)
       VALUES ($1, '2026-07-15', '09:00', '11:00', true)
       ON CONFLICT (worker_profile_id, slot_date, start_time) DO UPDATE SET is_booked = true
       RETURNING id`,
      [selamProfileId]
    );
    const pendingSlotId = pendingSlotResult.rows[0].id;

    const existingPending = await client.query(
      'SELECT id FROM bookings WHERE slot_id = $1',
      [pendingSlotId]
    );
    if (existingPending.rows.length === 0) {
      await client.query(
        `INSERT INTO bookings (client_id, worker_profile_id, slot_id, description, budget, status)
         VALUES ($1, $2, $3, 'Braiding for a wedding on the 15th', 500, 'pending')`,
        [clientIds[1], selamProfileId, pendingSlotId]
      );
    }

    console.log('Demo data seeded successfully.');
    console.log('Login credentials for all seeded accounts: password123');
    console.log('Clients:', clientsData.map(c => c.email).join(', '));
    console.log('Workers:', workersData.map(w => w.email).join(', '));
    console.log('One worker (Hana Worku, hana.catering@example.com) is left unapproved for you to test the approval flow.');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();