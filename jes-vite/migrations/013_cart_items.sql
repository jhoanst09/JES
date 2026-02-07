-- =====================================================
-- CART ITEMS TABLE MIGRATION
-- Run on AWS RDS PostgreSQL (Ohio)
-- =====================================================

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_handle VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one entry per user per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_user_product 
ON cart_items(user_id, product_handle);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_cart_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cart_timestamp ON cart_items;
CREATE TRIGGER trigger_cart_timestamp
BEFORE UPDATE ON cart_items
FOR EACH ROW
EXECUTE FUNCTION update_cart_timestamp();

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- DROP TABLE IF EXISTS cart_items CASCADE;
