-- =====================================================
-- BAGS (Vacas) - Shared Shopping Bags
-- Cleaned from supabase/010_bags.sql for AWS RDS
-- =====================================================

-- Shared shopping bag
CREATE TABLE IF NOT EXISTS bags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    goal_amount DECIMAL(12,2) NOT NULL,
    current_amount DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'COP',
    shopify_product_handle VARCHAR(255),
    shopify_product_id VARCHAR(255),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled', 'expired')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Bag participants
CREATE TABLE IF NOT EXISTS bag_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bag_id UUID NOT NULL REFERENCES bags(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    UNIQUE(bag_id, user_id)
);

-- Contributions
CREATE TABLE IF NOT EXISTS bag_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bag_id UUID NOT NULL REFERENCES bags(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'COP',
    message TEXT,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bags_creator ON bags(creator_id);
CREATE INDEX IF NOT EXISTS idx_bags_status ON bags(status);
CREATE INDEX IF NOT EXISTS idx_bag_participants_user ON bag_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_bag_participants_bag ON bag_participants(bag_id);
CREATE INDEX IF NOT EXISTS idx_bag_contributions_bag ON bag_contributions(bag_id);
CREATE INDEX IF NOT EXISTS idx_bag_contributions_user ON bag_contributions(user_id);

-- Auto-update bag total on contribution
CREATE OR REPLACE FUNCTION update_bag_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE bags
    SET 
        current_amount = (
            SELECT COALESCE(SUM(amount), 0)
            FROM bag_contributions
            WHERE bag_id = NEW.bag_id
            AND payment_status = 'completed'
        ),
        updated_at = NOW()
    WHERE id = NEW.bag_id;
    
    UPDATE bags
    SET 
        status = 'completed',
        completed_at = NOW()
    WHERE id = NEW.bag_id
    AND current_amount >= goal_amount
    AND status = 'open';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bag_total ON bag_contributions;
CREATE TRIGGER trigger_update_bag_total
AFTER INSERT OR UPDATE ON bag_contributions
FOR EACH ROW
EXECUTE FUNCTION update_bag_total();
