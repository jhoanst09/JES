-- ==========================================
-- BOLSAS DE COMPRA COMPARTIDAS (VACAS)
-- Social Commerce Feature
-- ==========================================

-- Bags table (the shared shopping bag)
CREATE TABLE IF NOT EXISTS bags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT, -- S3 URL
    
    -- Goal
    goal_amount DECIMAL(12,2) NOT NULL,
    current_amount DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'COP',
    
    -- Shopify product link (optional)
    shopify_product_handle VARCHAR(255),
    shopify_product_id VARCHAR(255),
    
    -- Creator
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled', 'expired')),
    
    -- Expiry (optional)
    expires_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Bag participants (who's invited to contribute)
CREATE TABLE IF NOT EXISTS bag_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bag_id UUID NOT NULL REFERENCES bags(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Role
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
    
    -- Status
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    
    UNIQUE(bag_id, user_id)
);

-- Contributions (money added to the bag)
CREATE TABLE IF NOT EXISTS bag_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bag_id UUID NOT NULL REFERENCES bags(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Amount
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'COP',
    
    -- Optional message
    message TEXT,
    
    -- Payment status (for future payment integration)
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_id VARCHAR(255), -- External payment ID
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_bags_creator ON bags(creator_id);
CREATE INDEX IF NOT EXISTS idx_bags_status ON bags(status);
CREATE INDEX IF NOT EXISTS idx_bags_expires ON bags(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bag_participants_user ON bag_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_bag_participants_bag ON bag_participants(bag_id);
CREATE INDEX IF NOT EXISTS idx_bag_contributions_bag ON bag_contributions(bag_id);
CREATE INDEX IF NOT EXISTS idx_bag_contributions_user ON bag_contributions(user_id);

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_contributions ENABLE ROW LEVEL SECURITY;

-- Bags: Participants can view, creator/admin can modify
CREATE POLICY "bags_select" ON bags FOR SELECT TO authenticated
USING (
    -- Creator can always view
    creator_id = auth.uid()
    OR
    -- Participants can view
    EXISTS (
        SELECT 1 FROM bag_participants
        WHERE bag_participants.bag_id = bags.id
        AND bag_participants.user_id = auth.uid()
    )
);

CREATE POLICY "bags_insert" ON bags FOR INSERT TO authenticated
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "bags_update" ON bags FOR UPDATE TO authenticated
USING (
    creator_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM bag_participants
        WHERE bag_participants.bag_id = bags.id
        AND bag_participants.user_id = auth.uid()
        AND bag_participants.role IN ('creator', 'admin')
    )
);

-- Participants: Users can see bags they're in
CREATE POLICY "bag_participants_select" ON bag_participants FOR SELECT TO authenticated
USING (user_id = auth.uid() OR bag_id IN (
    SELECT id FROM bags WHERE creator_id = auth.uid()
));

CREATE POLICY "bag_participants_insert" ON bag_participants FOR INSERT TO authenticated
WITH CHECK (
    -- Creator of bag can add participants
    bag_id IN (SELECT id FROM bags WHERE creator_id = auth.uid())
    OR
    -- Admin can add participants
    bag_id IN (
        SELECT bag_id FROM bag_participants
        WHERE user_id = auth.uid() AND role IN ('creator', 'admin')
    )
);

-- Contributions: Participants can contribute, all participants can view
CREATE POLICY "bag_contributions_select" ON bag_contributions FOR SELECT TO authenticated
USING (
    bag_id IN (
        SELECT bag_id FROM bag_participants WHERE user_id = auth.uid()
    )
    OR
    bag_id IN (SELECT id FROM bags WHERE creator_id = auth.uid())
);

CREATE POLICY "bag_contributions_insert" ON bag_contributions FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND
    (
        bag_id IN (SELECT bag_id FROM bag_participants WHERE user_id = auth.uid())
        OR
        bag_id IN (SELECT id FROM bags WHERE creator_id = auth.uid())
    )
);

-- ==========================================
-- FUNCTION: Update bag total on contribution
-- ==========================================

CREATE OR REPLACE FUNCTION update_bag_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current_amount
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
    
    -- Check if goal reached
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

CREATE TRIGGER trigger_update_bag_total
AFTER INSERT OR UPDATE ON bag_contributions
FOR EACH ROW
EXECUTE FUNCTION update_bag_total();

-- ==========================================
-- REALTIME for contributions
-- ==========================================

ALTER PUBLICATION supabase_realtime ADD TABLE bag_contributions;
ALTER PUBLICATION supabase_realtime ADD TABLE bags;
