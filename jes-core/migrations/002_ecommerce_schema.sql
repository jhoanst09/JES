-- =====================================================
-- JES Core — E-Commerce Schema FINAL
-- Migration 002: Products, Variants, Inventory,
--                Orders, Customers, Payments (Wompi)
-- =====================================================
-- Run against PostgreSQL 15+ (RDS)
-- Depends on: 001_media_assets.sql
-- 
-- EXECUTION:
--   psql -h your-rds-endpoint.amazonaws.com -U jes_admin -d jes_db -f 002_ecommerce_schema.sql
-- =====================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search on products

-- =====================================================
-- 1. CUSTOMERS — Sistema de usuarios con prefijo &
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- JES username system: stored WITHOUT the & prefix
    -- Frontend always renders as &username (e.g., &jhoanst09)
    username VARCHAR(50) UNIQUE NOT NULL
        CHECK (username ~ '^[a-zA-Z0-9_]{3,50}$'),

    -- Display name generated automatically: &username
    display_name VARCHAR(60) GENERATED ALWAYS AS ('&' || username) STORED,

    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    phone VARCHAR(20),
    phone_country_code VARCHAR(5) DEFAULT '+57',

    -- Profile
    full_name VARCHAR(200),
    avatar_url TEXT,
    bio TEXT,

    -- Auth provider (Firebase / Google / Apple)
    external_auth_id VARCHAR(255) UNIQUE,
    auth_provider VARCHAR(50) DEFAULT 'firebase',

    -- Shipping address (JSONB for flexibility)
    shipping_address JSONB DEFAULT '{}',

    -- Roles & Status
    role VARCHAR(20) NOT NULL DEFAULT 'buyer'
        CHECK (role IN ('buyer', 'seller', 'admin', 'business')),
    is_verified_seller BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Wallet (COP centavos — avoids floating point)
    wallet_balance BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_username ON customers(username);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_external_auth ON customers(external_auth_id);
-- Trigram index for fuzzy username search (e.g., autocomplete @mentions)
CREATE INDEX IF NOT EXISTS idx_customers_username_trgm ON customers USING GIN (username gin_trgm_ops);

-- =====================================================
-- 2. PRODUCTS — Catálogo propio JES
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES customers(id) ON DELETE SET NULL,

    title VARCHAR(500) NOT NULL,
    handle VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    description_html TEXT,

    -- Classification
    product_type VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    category VARCHAR(100),
    brand VARCHAR(200),

    -- Media (references media_assets from migration 001)
    images UUID[] DEFAULT '{}',
    thumbnail_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,

    -- Pricing (COP centavos)
    base_price BIGINT NOT NULL DEFAULT 0,
    compare_at_price BIGINT,
    currency VARCHAR(3) NOT NULL DEFAULT 'COP',

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'archived', 'deleted')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,

    -- SEO
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),

    -- Analytics
    view_count INTEGER NOT NULL DEFAULT 0,
    purchase_count INTEGER NOT NULL DEFAULT 0,

    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_handle ON products(handle);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN (tags);
-- Trigram index for product title search
CREATE INDEX IF NOT EXISTS idx_products_title_trgm ON products USING GIN (title gin_trgm_ops);

-- =====================================================
-- 3. VARIANTS — Tallas, Colores, etc.
-- =====================================================
CREATE TABLE IF NOT EXISTS variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    title VARCHAR(200) NOT NULL DEFAULT 'Default',
    sku VARCHAR(100) UNIQUE,

    -- Options (flexible key-value)
    option1_name VARCHAR(50),
    option1_value VARCHAR(100),
    option2_name VARCHAR(50),
    option2_value VARCHAR(100),
    option3_name VARCHAR(50),
    option3_value VARCHAR(100),

    -- Pricing (COP centavos — overrides product base_price)
    price BIGINT NOT NULL DEFAULT 0,
    compare_at_price BIGINT,

    -- Media
    image_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,

    -- Weight for shipping (grams)
    weight_grams INTEGER DEFAULT 0,

    -- Status
    available_for_sale BOOLEAN NOT NULL DEFAULT TRUE,
    position INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON variants(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_variants_available ON variants(available_for_sale) WHERE available_for_sale = TRUE;

-- =====================================================
-- 4. INVENTORY — Stock por variante y ubicación
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,

    location_name VARCHAR(100) NOT NULL DEFAULT 'Bodega Principal',
    location_code VARCHAR(20) NOT NULL DEFAULT 'BOG-01',

    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),

    -- Computed: available = quantity - reserved
    available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,

    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    last_restock_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(variant_id, location_code)
);

CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(quantity) WHERE quantity <= 5;
-- Index for inventory checks during checkout
CREATE INDEX IF NOT EXISTS idx_inventory_available ON inventory((quantity - reserved_quantity)) WHERE (quantity - reserved_quantity) > 0;

-- =====================================================
-- 5. ORDERS — Pedidos con integración Wompi
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number SERIAL UNIQUE,

    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_username VARCHAR(50),

    -- Financial (COP centavos)
    subtotal BIGINT NOT NULL DEFAULT 0,
    shipping_cost BIGINT NOT NULL DEFAULT 0,
    tax_amount BIGINT NOT NULL DEFAULT 0,
    discount_amount BIGINT NOT NULL DEFAULT 0,
    total BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'COP',

    -- Shipping
    shipping_address JSONB NOT NULL DEFAULT '{}',
    shipping_method VARCHAR(100) DEFAULT 'Standard',
    tracking_number VARCHAR(200),
    tracking_url TEXT,

    -- Order lifecycle
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending', 'paid', 'processing', 'shipped',
            'delivered', 'cancelled', 'refunded', 'failed'
        )),

    -- Wompi integration
    wompi_transaction_id VARCHAR(100) UNIQUE,
    wompi_reference VARCHAR(100),
    wompi_payment_method VARCHAR(50),
    wompi_status VARCHAR(50),

    customer_notes TEXT,
    internal_notes TEXT,

    paid_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_wompi_tx ON orders(wompi_transaction_id) WHERE wompi_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_wompi_ref ON orders(wompi_reference) WHERE wompi_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
-- Composite index for order lookup by customer + status
CREATE INDEX IF NOT EXISTS idx_orders_customer_status ON orders(customer_id, status);

-- =====================================================
-- 6. ORDER ITEMS — Líneas de pedido
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,

    -- Snapshot at order time (immutable)
    product_title VARCHAR(500) NOT NULL,
    variant_title VARCHAR(200),
    sku VARCHAR(100),
    image_url TEXT,

    unit_price BIGINT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    line_total BIGINT NOT NULL,

    is_gift BOOLEAN NOT NULL DEFAULT FALSE,
    gift_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
-- FK constraint to inventory: order_items.variant_id → variants → inventory
-- This chain ensures referential integrity for stock management

-- =====================================================
-- 7. CART — Server-side cart (replaces Shopify cart)
-- =====================================================
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    is_gift BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(customer_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_customer ON cart_items(customer_id);

-- =====================================================
-- 8. WOMPI WEBHOOKS LOG — Audit trail
-- =====================================================
CREATE TABLE IF NOT EXISTS wompi_webhook_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    transaction_id VARCHAR(100),
    reference VARCHAR(100),
    status VARCHAR(50),
    amount BIGINT,
    currency VARCHAR(3),
    payment_method VARCHAR(50),
    raw_payload JSONB NOT NULL,
    signature VARCHAR(256),
    signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_log_tx ON wompi_webhook_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_webhook_log_ref ON wompi_webhook_log(reference);
CREATE INDEX IF NOT EXISTS idx_webhook_log_unprocessed ON wompi_webhook_log(processed) WHERE processed = FALSE;

-- =====================================================
-- 9. FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at on any row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_variants_updated BEFORE UPDATE ON variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_cart_updated BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- 10. INVENTORY CHECK FUNCTION (used during checkout)
-- =====================================================
-- Validates that all items have enough available stock
CREATE OR REPLACE FUNCTION check_inventory_availability(
    p_variant_ids UUID[],
    p_quantities INTEGER[]
) RETURNS TABLE(variant_id UUID, available INTEGER, requested INTEGER, is_available BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT
        inv.variant_id,
        (inv.quantity - inv.reserved_quantity) AS available,
        p_quantities[array_position(p_variant_ids, inv.variant_id)] AS requested,
        (inv.quantity - inv.reserved_quantity) >= p_quantities[array_position(p_variant_ids, inv.variant_id)] AS is_available
    FROM inventory inv
    WHERE inv.variant_id = ANY(p_variant_ids);
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 11. RESERVE INVENTORY (atomic, prevents overselling)
-- =====================================================
CREATE OR REPLACE FUNCTION reserve_inventory(
    p_variant_id UUID,
    p_quantity INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_available INTEGER;
BEGIN
    -- Lock the row to prevent race conditions
    SELECT (quantity - reserved_quantity) INTO v_available
    FROM inventory
    WHERE variant_id = p_variant_id
    FOR UPDATE;

    IF v_available IS NULL OR v_available < p_quantity THEN
        RETURN FALSE;
    END IF;

    UPDATE inventory
    SET reserved_quantity = reserved_quantity + p_quantity
    WHERE variant_id = p_variant_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. RELEASE INVENTORY (on cancelled/failed orders)
-- =====================================================
CREATE OR REPLACE FUNCTION release_order_inventory(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE inventory i
    SET reserved_quantity = GREATEST(0, reserved_quantity - oi.quantity)
    FROM order_items oi
    WHERE oi.order_id = p_order_id
        AND oi.variant_id = i.variant_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. CONFIRM INVENTORY (on payment approved)
-- =====================================================
CREATE OR REPLACE FUNCTION confirm_order_inventory(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE inventory i
    SET
        quantity = GREATEST(0, quantity - oi.quantity),
        reserved_quantity = GREATEST(0, reserved_quantity - oi.quantity)
    FROM order_items oi
    WHERE oi.order_id = p_order_id
        AND oi.variant_id = i.variant_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
