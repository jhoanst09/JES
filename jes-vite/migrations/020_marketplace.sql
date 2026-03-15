-- =====================================================
-- MARKETPLACE: Products, Escrow, Seller Verification
-- JES Marketplace with dual economy (FIAT + JES Coin)
-- =====================================================

-- 1. MARKETPLACE PRODUCTS
CREATE TABLE IF NOT EXISTS marketplace_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price_fiat DECIMAL(12, 2) NOT NULL DEFAULT 0,
    price_jes_coin DECIMAL(12, 2) DEFAULT NULL,
    stock INTEGER NOT NULL DEFAULT 1,
    category_tags JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'sold_out')),
    is_verified_seller BOOLEAN DEFAULT false,
    condition VARCHAR(20) DEFAULT 'new' CHECK (condition IN ('new', 'like_new', 'good', 'fair')),
    location VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_products_seller ON marketplace_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_mp_products_status ON marketplace_products(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_mp_products_created ON marketplace_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mp_products_category ON marketplace_products USING GIN(category_tags);
CREATE INDEX IF NOT EXISTS idx_mp_products_price ON marketplace_products(price_fiat);

-- Auto-update updated_at on product changes
CREATE OR REPLACE FUNCTION update_marketplace_product_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mp_product_updated ON marketplace_products;
CREATE TRIGGER trigger_mp_product_updated
BEFORE UPDATE ON marketplace_products
FOR EACH ROW EXECUTE FUNCTION update_marketplace_product_timestamp();


-- 2. TRANSACTIONS ESCROW
CREATE TABLE IF NOT EXISTS transactions_escrow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency_type VARCHAR(20) NOT NULL DEFAULT 'FIAT' CHECK (currency_type IN ('FIAT', 'JES_COIN', 'BTC')),
    escrow_status VARCHAR(30) NOT NULL DEFAULT 'pending_payment' CHECK (escrow_status IN ('pending_payment', 'held', 'completed', 'disputed', 'refunded', 'cancelled')),
    confirmation_code_hash VARCHAR(255),
    buyer_confirmed BOOLEAN DEFAULT false,
    seller_confirmed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_escrow_buyer ON transactions_escrow(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_seller ON transactions_escrow(seller_id);
CREATE INDEX IF NOT EXISTS idx_escrow_product ON transactions_escrow(product_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON transactions_escrow(escrow_status);
CREATE INDEX IF NOT EXISTS idx_escrow_created ON transactions_escrow(created_at DESC);

-- Auto-update updated_at on escrow changes
DROP TRIGGER IF EXISTS trigger_escrow_updated ON transactions_escrow;
CREATE TRIGGER trigger_escrow_updated
BEFORE UPDATE ON transactions_escrow
FOR EACH ROW EXECUTE FUNCTION update_marketplace_product_timestamp();


-- 3. SELLERS VERIFICATION
CREATE TABLE IF NOT EXISTS sellers_verification (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    document_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified', 'pending', 'verified', 'rejected')),
    rejection_reason TEXT,
    verification_date TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers_verification(status);


-- 4. Auto-set is_verified_seller on product creation/update
CREATE OR REPLACE FUNCTION sync_seller_verification()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_verified_seller = EXISTS (
        SELECT 1 FROM sellers_verification
        WHERE user_id = NEW.seller_id AND status = 'verified'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_seller_verified ON marketplace_products;
CREATE TRIGGER trigger_sync_seller_verified
BEFORE INSERT OR UPDATE ON marketplace_products
FOR EACH ROW EXECUTE FUNCTION sync_seller_verification();


-- 5. Auto-decrement stock when escrow is held
CREATE OR REPLACE FUNCTION escrow_stock_management()
RETURNS TRIGGER AS $$
BEGIN
    -- When escrow moves to 'held', decrement stock
    IF NEW.escrow_status = 'held' AND (OLD.escrow_status IS NULL OR OLD.escrow_status = 'pending_payment') THEN
        UPDATE marketplace_products
        SET stock = stock - 1
        WHERE id = NEW.product_id AND stock > 0;
        
        -- Auto-mark as sold_out if stock reaches 0
        UPDATE marketplace_products
        SET status = 'sold_out'
        WHERE id = NEW.product_id AND stock <= 0;
    END IF;
    
    -- When escrow is refunded/cancelled, restore stock
    IF NEW.escrow_status IN ('refunded', 'cancelled') AND OLD.escrow_status = 'held' THEN
        UPDATE marketplace_products
        SET stock = stock + 1,
            status = CASE WHEN status = 'sold_out' THEN 'active' ELSE status END
        WHERE id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_escrow_stock ON transactions_escrow;
CREATE TRIGGER trigger_escrow_stock
AFTER INSERT OR UPDATE ON transactions_escrow
FOR EACH ROW EXECUTE FUNCTION escrow_stock_management();
