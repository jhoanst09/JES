-- =====================================================
-- ADD SHIPPING ADDRESS FIELDS TO PROFILES
-- Stores user shipping address for gift delivery
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'shipping_address'
    ) THEN
        ALTER TABLE profiles ADD COLUMN shipping_address JSONB DEFAULT NULL;
    END IF;
END $$;

-- Also check users table (some setups use users instead of profiles)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'shipping_address'
    ) THEN
        ALTER TABLE users ADD COLUMN shipping_address JSONB DEFAULT NULL;
    END IF;
END $$;

-- Also add shipping_address to gifts table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'gifts' AND column_name = 'shipping_address'
    ) THEN
        ALTER TABLE gifts ADD COLUMN shipping_address JSONB DEFAULT NULL;
    END IF;
END $$;
