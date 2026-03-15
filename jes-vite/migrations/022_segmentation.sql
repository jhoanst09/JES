-- =====================================================
-- SEGMENTATION: User interests for personalized feed
-- Adds occupation and interest_tags to profiles
-- =====================================================

-- Add occupation column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'occupation'
    ) THEN
        ALTER TABLE profiles ADD COLUMN occupation VARCHAR(100);
    END IF;
END $$;

-- Add interest_tags JSONB column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'interest_tags'
    ) THEN
        ALTER TABLE profiles ADD COLUMN interest_tags JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- GIN index for fast overlap queries on interest_tags
CREATE INDEX IF NOT EXISTS idx_profiles_interest_tags ON profiles USING GIN(interest_tags);
