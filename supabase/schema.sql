-- ==============================================================================
-- MYSHELTER — Supabase (PostgreSQL) Database Schema
-- Run this complete script in the Supabase Dashboard -> SQL Editor -> New query
-- ==============================================================================

-- 1. Enable UUID generation extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Users Table
-- Stores registered users with securely hashed passwords
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index on email for fast lookups during authentication
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 3. Bookings Table
-- Stores hotel room bookings linked to registered users or guest bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  room_id TEXT,
  hotel TEXT NOT NULL,
  room_type TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT,
  check_in DATE NOT NULL,
  nights INTEGER NOT NULL DEFAULT 1,
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  tariff NUMERIC(10, 2),
  taxes TEXT,
  discount NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  coupon TEXT,
  status TEXT DEFAULT 'confirmed' NOT NULL,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON public.bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);

-- 4. User Preferences Table
-- Stores search filters and preferences per user to tailor their stay recommendations
CREATE TABLE IF NOT EXISTS public.preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  preferred_city TEXT,
  preferred_type TEXT,
  query TEXT,
  free_cancellation BOOLEAN DEFAULT false,
  breakfast BOOLEAN DEFAULT false,
  pool BOOLEAN DEFAULT false,
  parking BOOLEAN DEFAULT false,
  sort TEXT,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index on user_id
CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON public.preferences(user_id);

-- Optional: Enable Row Level Security (RLS)
-- Because our Vercel Serverless Functions use SUPABASE_SERVICE_ROLE_KEY,
-- the backend can securely read and write all tables regardless of RLS settings.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;

-- Allow service role full access to all tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Service role full access on users'
  ) THEN
    CREATE POLICY "Service role full access on users" ON public.users FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bookings' AND policyname = 'Service role full access on bookings'
  ) THEN
    CREATE POLICY "Service role full access on bookings" ON public.bookings FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'preferences' AND policyname = 'Service role full access on preferences'
  ) THEN
    CREATE POLICY "Service role full access on preferences" ON public.preferences FOR ALL USING (true);
  END IF;
END
$$;

