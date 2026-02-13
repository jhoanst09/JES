-- =====================================================
-- 018: Username System
-- Adds unique username column to profiles table
-- =====================================================

-- Add username column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'username'
    ) THEN
        ALTER TABLE profiles ADD COLUMN username VARCHAR(100);
    END IF;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    END IF;
END $$;

-- Add check constraint: no spaces allowed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_no_spaces'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_username_no_spaces
            CHECK (username !~ '\s');
    END IF;
END $$;

-- Index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
