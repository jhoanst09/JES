-- =====================================================
-- MARKETPLACE EXPANSION: Services, Appointments, Reviews
-- =====================================================

-- Business Services (offered by sellers)
CREATE TABLE IF NOT EXISTS business_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL DEFAULT 60,
    price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'COP',
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_services_business ON business_services(business_id);
CREATE INDEX IF NOT EXISTS idx_business_services_active ON business_services(is_active, created_at DESC);

-- Service Appointments
CREATE TABLE IF NOT EXISTS service_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES business_services(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_service ON service_appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON service_appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_business ON service_appointments(business_id, start_time);

-- Marketplace Reviews (Steam-style: thumbs up/down)
CREATE TABLE IF NOT EXISTS marketplace_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES marketplace_products(id) ON DELETE CASCADE,
    service_id UUID REFERENCES business_services(id) ON DELETE CASCADE,
    recommended BOOLEAN NOT NULL, -- true = thumbs up, false = thumbs down
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Each user can only review each product/service once
    CONSTRAINT unique_product_review UNIQUE (user_id, product_id),
    CONSTRAINT unique_service_review UNIQUE (user_id, service_id),
    -- Must reference either a product or a service
    CONSTRAINT review_target CHECK (
        (product_id IS NOT NULL AND service_id IS NULL) OR
        (product_id IS NULL AND service_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON marketplace_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_service ON marketplace_reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON marketplace_reviews(user_id);

-- Auto-update updated_at triggers
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_services_updated_at
    BEFORE UPDATE ON business_services
    FOR EACH ROW EXECUTE FUNCTION update_services_updated_at();

CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON service_appointments
    FOR EACH ROW EXECUTE FUNCTION update_services_updated_at();
