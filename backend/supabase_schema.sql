-- ================================================================
-- Smart Diet Planner — Supabase Database Schema
-- Run this in your Supabase SQL Editor (one time setup)
-- ================================================================

-- ── Users table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  phone           TEXT PRIMARY KEY,
  mobile          TEXT,
  country_code    TEXT DEFAULT '+91',
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  diet_preference TEXT DEFAULT 'vegan',
  age             INTEGER,
  age_group       TEXT,
  diabetic        BOOLEAN DEFAULT FALSE,
  profile_key     TEXT,
  password_hash   TEXT NOT NULL,
  signup_date     TIMESTAMPTZ DEFAULT NOW(),
  last_login      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sessions table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  phone       TEXT PRIMARY KEY REFERENCES users(phone) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Meal logs table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_logs (
  id           BIGSERIAL PRIMARY KEY,
  phone        TEXT REFERENCES users(phone) ON DELETE CASCADE,
  full_name    TEXT,
  day          TEXT,
  meal_type    TEXT,
  food_name    TEXT,
  calories     NUMERIC(8,1) DEFAULT 0,
  protein      NUMERIC(6,1) DEFAULT 0,
  fat          NUMERIC(6,1) DEFAULT 0,
  carbs        NUMERIC(6,1) DEFAULT 0,
  fiber        NUMERIC(6,1) DEFAULT 0,
  sugar        NUMERIC(6,1) DEFAULT 0,
  skipped      BOOLEAN DEFAULT FALSE,
  logged_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Meal plans table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meal_plans (
  id                   BIGSERIAL PRIMARY KEY,
  phone                TEXT REFERENCES users(phone) ON DELETE CASCADE,
  full_name            TEXT,
  day                  TEXT,
  meal_type            TEXT,
  food_name            TEXT,
  calories             NUMERIC(8,1) DEFAULT 0,
  protein              NUMERIC(6,1) DEFAULT 0,
  fat                  NUMERIC(6,1) DEFAULT 0,
  carbs                NUMERIC(6,1) DEFAULT 0,
  fiber                NUMERIC(6,1) DEFAULT 0,
  sugar                NUMERIC(6,1) DEFAULT 0,
  compensation_active  BOOLEAN DEFAULT FALSE,
  generated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes for fast lookups ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_meal_logs_phone ON meal_logs(phone);
CREATE INDEX IF NOT EXISTS idx_meal_plans_phone ON meal_plans(phone);

-- ── Row Level Security (RLS) — enable security ───────────────────
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Allow all operations via service role key (used by our API)
CREATE POLICY "service_all_users"      ON users      FOR ALL USING (true);
CREATE POLICY "service_all_sessions"   ON sessions   FOR ALL USING (true);
CREATE POLICY "service_all_meal_logs"  ON meal_logs  FOR ALL USING (true);
CREATE POLICY "service_all_meal_plans" ON meal_plans FOR ALL USING (true);

