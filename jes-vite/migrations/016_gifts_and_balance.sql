-- =====================================================
-- GIFTS, USER BALANCE (JES Coins), BALANCE LEDGER
-- =====================================================

-- Gifts table
CREATE TABLE IF NOT EXISTS gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_handle VARCHAR(255) NOT NULL,
    product_title VARCHAR(500),
    product_image TEXT,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'COP',
    payment_method VARCHAR(20) CHECK (payment_method IN ('mercadopago', 'paypal', 'jes_coins')),
    payment_id VARCHAR(255),            -- External payment ID (MP preference, PayPal order)
    payment_external_ref VARCHAR(255),  -- Our internal reference for webhook matching
    bag_id UUID REFERENCES bags(id) ON DELETE SET NULL,  -- NULL if direct gift, set if vaca
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'delivered', 'cancelled', 'refunded')),
    message TEXT,                        -- Personal gift message
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gifts_sender ON gifts(sender_id);
CREATE INDEX IF NOT EXISTS idx_gifts_recipient ON gifts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_gifts_status ON gifts(status);
CREATE INDEX IF NOT EXISTS idx_gifts_payment_ref ON gifts(payment_external_ref);
CREATE INDEX IF NOT EXISTS idx_gifts_bag ON gifts(bag_id);

-- JES Coins — User balance
CREATE TABLE IF NOT EXISTS user_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    currency VARCHAR(3) DEFAULT 'JES',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_balance_user ON user_balance(user_id);

-- Balance transaction ledger (audit trail)
CREATE TABLE IF NOT EXISTS balance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('topup', 'gift_payment', 'vaca_contribution', 'refund', 'reward')),
    amount DECIMAL(12,2) NOT NULL,  -- Positive = credit, negative = debit
    balance_after DECIMAL(12,2) NOT NULL,
    reference_id UUID,              -- gift_id or bag_contribution_id
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balance_tx_user ON balance_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_tx_ref ON balance_transactions(reference_id);
