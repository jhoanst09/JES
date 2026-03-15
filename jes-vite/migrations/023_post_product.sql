-- =====================================================
-- ADD PRODUCT DATA TO SOCIAL POSTS
-- Stores tagged product info (Shopify or marketplace) as JSONB
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'social_posts' AND column_name = 'product_data'
    ) THEN
        ALTER TABLE social_posts ADD COLUMN product_data JSONB DEFAULT NULL;
    END IF;
END $$;
