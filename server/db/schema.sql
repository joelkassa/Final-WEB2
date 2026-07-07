-- ServiceHub database schema
-- Run with: psql -d servicehub -f schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('client', 'worker', 'admin')),
    is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Refresh tokens live in their own table so we can revoke/rotate them
-- without touching the users table, and so a stolen token can be invalidated.
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- =========================
-- CATEGORIES
-- =========================
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE
);

-- =========================
-- WORKER PROFILES
-- =========================
CREATE TABLE worker_profiles (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    category_id           UUID REFERENCES categories(id) ON DELETE SET NULL,
    custom_category       VARCHAR(100),
    bio                   TEXT,
    price_min             NUMERIC(10, 2),
    price_max             NUMERIC(10, 2),
    service_area          VARCHAR(255),
    availability_status   VARCHAR(20) NOT NULL DEFAULT 'available'
                          CHECK (availability_status IN ('available', 'unavailable')),
    photo_url             TEXT,
    is_approved           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- A worker must have EITHER a predefined category OR a custom one, never neither.
    CONSTRAINT chk_category_present CHECK (category_id IS NOT NULL OR custom_category IS NOT NULL),
    -- Sanity check on the price range itself.
    CONSTRAINT chk_price_range CHECK (price_max IS NULL OR price_min IS NULL OR price_max >= price_min)
);
CREATE INDEX idx_worker_profiles_category_id ON worker_profiles(category_id);
CREATE INDEX idx_worker_profiles_is_approved ON worker_profiles(is_approved);

-- =========================
-- SKILLS
-- =========================
CREATE TABLE skills (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_profile_id   UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    skill_name          VARCHAR(150) NOT NULL
);
CREATE INDEX idx_skills_worker_profile_id ON skills(worker_profile_id);

-- =========================
-- PORTFOLIO IMAGES
-- =========================
CREATE TABLE portfolio_images (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_profile_id   UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    image_url           TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_portfolio_images_worker_profile_id ON portfolio_images(worker_profile_id);

-- =========================
-- AVAILABILITY SLOTS
-- =========================
CREATE TABLE availability_slots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_profile_id   UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    slot_date           DATE NOT NULL,
    start_time          TIME NOT NULL,
    end_time            TIME NOT NULL,
    is_booked           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_slot_time_order CHECK (end_time > start_time),
    -- Prevents a worker from creating the exact same slot twice.
    CONSTRAINT uq_worker_slot UNIQUE (worker_profile_id, slot_date, start_time)
);
CREATE INDEX idx_availability_slots_worker_profile_id ON availability_slots(worker_profile_id);
CREATE INDEX idx_availability_slots_is_booked ON availability_slots(is_booked);

-- =========================
-- BOOKINGS
-- =========================
CREATE TABLE bookings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_profile_id   UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
    -- UNIQUE here is what actually prevents double-booking a slot at the DB level,
    -- not just in application logic.
    slot_id             UUID NOT NULL UNIQUE REFERENCES availability_slots(id) ON DELETE CASCADE,
    description         TEXT NOT NULL,
    budget              NUMERIC(10, 2),
    agreement_notes     TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_client_id ON bookings(client_id);
CREATE INDEX idx_bookings_worker_profile_id ON bookings(worker_profile_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Keep updated_at accurate whenever a booking's status changes.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- REVIEWS
-- =========================
CREATE TABLE reviews (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- UNIQUE booking_id is what enforces "one review per completed booking" at the DB level.
    booking_id    UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT,
    is_hidden     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- REPORTS (disputes / moderation)
-- =========================
CREATE TABLE reports (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id           UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reported_by          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_against      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason               VARCHAR(100) NOT NULL,
    description          TEXT NOT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open', 'resolved', 'dismissed')),
    resolved_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_booking_id ON reports(booking_id);





















