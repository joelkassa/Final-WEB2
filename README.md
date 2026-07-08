# Handy-Manny

This is my final project for Web Programming II. It's a marketplace app where clients can find and book local service providers — plumbers, electricians, hairstylists, caterers, cleaners, freelancers, basically anyone who does paid work for people. Clients browse workers, filter by category/rating/location, and send booking requests. Workers set up their own profile, list their skills and prices, upload portfolio photos, and set time slots clients can book. Admin approves new workers before they go public, and handles reports if something goes wrong between a client and a worker.

## Tech stack

**Backend**
- Node.js + Express
- PostgreSQL — I used raw SQL with the `pg` package, no ORM
- JWT for auth (access token + refresh token)
- bcrypt for password hashing
- multer for handling portfolio image uploads
- express-rate-limit on the login/register routes
- helmet, cors, morgan, cookie-parser for the usual stuff

**Frontend**
- Plain HTML/CSS/JS, no framework
- Talks to the backend only through the REST API, nothing server-rendered

**Architecture**
- MVC — `models` do the SQL queries, `controllers` handle the actual logic, `routes` just wire endpoints to controller functions. The frontend is basically the "view" and it's a separate app that just calls the API.

## Folder structure

```
Final-WEB2/
  server/
    config/          db connection setup
    controllers/     route handler logic
    db/              schema.sql (the DDL) + seed files
    middleware/      auth, role checks, rate limiter, upload, error handler
    models/          SQL queries per table/resource
    routes/          express routers
    uploads/         where uploaded portfolio images actually get saved
    server.js
    .env             not committed, see setup steps below
  frontend/
    css/style.css
    js/              one JS file per page
    index.html, login.html, register.html, worker-profile.html,
    dashboard-client.html, dashboard-worker.html, dashboard-admin.html
  README.md
```

## How to run it

### What you need first
- Node.js (18+)
- PostgreSQL (13+)
- Something to serve the frontend statically — I used VS Code's Live Server extension

### 1. Install backend packages

```bash
cd server
npm install
```

### 2. Make the database

```bash
createdb servicehub
```

If that command isn't found, just open pgAdmin and create a database called `servicehub` there instead, or run:
```bash
psql -U postgres -c "CREATE DATABASE servicehub;"
```

### 3. Set up your `.env`

Make a `.env` file inside `server/`:

```env
PORT=5000
DB_NAME=servicehub
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
JWT_ACCESS_SECRET=some_long_random_string
JWT_REFRESH_SECRET=a_different_long_random_string
NODE_ENV=development
CLIENT_ORIGIN=http://127.0.0.1:5500
```

To generate a random secret instead of making one up:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Important: `CLIENT_ORIGIN` has to match exactly wherever your frontend is actually running (check your browser's address bar), or every request gets blocked by CORS.

### 4. Load the schema + demo data

```bash
psql -U postgres -d servicehub -f db/schema.sql
psql -U postgres -d servicehub -f db/seed.sql
node db/seedDemoData.js
```

The last one fills the database with fake clients/workers/bookings so the app isn't empty when you look at it. Every seeded account logs in with the password `password123`. One worker is left unapproved on purpose so you can actually see the admin approval flow do something.

### 5. Make yourself an admin account

There's no signup form for admin (that's intentional — admins shouldn't be able to just register themselves). Do it directly:

```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('yourpassword', 10).then(h => console.log(h));"
```

Then in psql:
```sql
INSERT INTO users (name, email, password_hash, role)
VALUES ('Platform Admin', 'admin@handymanny.com', 'PASTE_HASH_HERE', 'admin');
```

### 6. Start the server

```bash
node server.js
```

Go to `http://localhost:5000/api/health` in your browser — if you see `"status": "ok"` back, the backend is running and talking to the database.

### 7. Run the frontend

Open the `frontend` folder in VS Code, right click `index.html`, open with Live Server. Just make sure the port it opens on matches whatever you put in `CLIENT_ORIGIN`.

## Database schema

Full DDL is in [`server/db/schema.sql`](server/db/schema.sql). Quick rundown of the tables:

| Table | What it's for |
|---|---|
| `users` | every account — client, worker, or admin. hashed passwords, ban flag |
| `refresh_tokens` | hashed refresh tokens so sessions can renew without logging in again |
| `categories` | the predefined list of trades (plumbing, electrical, etc.) |
| `worker_profiles` | one per worker — bio, category, price range, service area, approved or not |
| `skills` | a worker can have multiple of these |
| `portfolio_images` | same, multiple per worker |
| `availability_slots` | the actual bookable time slots, with an is_booked flag |
| `bookings` | a client's request against a slot. status goes pending → accepted/declined → completed, or cancelled |
| `reviews` | one per completed booking, that's enforced by a unique constraint |
| `reports` | disputes tied to a specific booking, admin resolves these |

A couple of things I made sure to actually enforce in the schema, not just in code:
- `bookings.slot_id` is UNIQUE and the booking insert happens inside a `SELECT ... FOR UPDATE` transaction — this is what stops two people from booking the same slot if they both hit request at the same time.
- `reviews.booking_id` is UNIQUE, so you literally can't insert two reviews for the same booking even if the app logic somehow let it through.
- worker_profiles has a CHECK constraint that makes sure a worker has either a real category or a custom one, never nothing.
- everything uses UUIDs instead of normal auto-increment ids, so you can't just guess `/bookings/43` after seeing `/bookings/42`.

## Auth stuff

- passwords are hashed with bcrypt, never stored plain
- login gives you a short-lived JWT access token (15 min) plus a refresh token (7 days) that sits in an httpOnly cookie so JS can't touch it
- refresh tokens get hashed before going into the database, and every time you refresh, the old one gets deleted and a new one issued (rotation)
- every protected route checks the JWT first (`authenticate` middleware), then checks role if needed (`authorize`), then checks if you actually own the specific thing you're trying to touch — that last part happens right in the controller since it's different for every resource
- login/register/forgot-password are all rate limited so someone can't just spam guesses

## How each role actually uses the app

**Client:** browse workers, filter by category/rating/location, open a profile, pick an open time slot, send a booking request. Once accepted, the client is the one who marks it completed (not the worker) — then they can leave a review, or file a report if something went wrong.

**Worker:** sign up, fill out your profile (category, bio, pricing, service area) — profile sits pending until admin approves it, then it's public. add skills, portfolio photos, availability slots. accept or decline booking requests as they come in.

**Admin:** see overall stats, approve pending workers, manage every account (filter by role/category/banned status, ban/unban/delete), see every booking with filters and click one to expand full details, resolve or dismiss reports and ban someone straight from a report if needed.

