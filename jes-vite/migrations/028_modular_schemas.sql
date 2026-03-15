-- Migration 028: Modular PostgreSQL Schemas
-- Reorganizes tables into logical schemas for index isolation and query optimization.
-- Uses search_path at connection level so existing queries work without modification.

-- =====================================================
-- 1. CREATE SCHEMAS
-- =====================================================

CREATE SCHEMA IF NOT EXISTS core;        -- Users, Auth, Wallets (JES Coins)
CREATE SCHEMA IF NOT EXISTS marketplace; -- Products, Transactions, Escrow
CREATE SCHEMA IF NOT EXISTS wave;        -- Personal/family accounting
CREATE SCHEMA IF NOT EXISTS biz;         -- Appointments, services
CREATE SCHEMA IF NOT EXISTS academy;     -- Notes, subjects

-- =====================================================
-- 2. MOVE CORE TABLES
-- =====================================================

-- Users & Auth
DO $$ BEGIN
    ALTER TABLE users SET SCHEMA core;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE profiles SET SCHEMA core;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE friendships SET SCHEMA core;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE notifications SET SCHEMA core;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE wishlist_items SET SCHEMA core;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Social (stays in core as it's user-centric)
DO $$ BEGIN
    ALTER TABLE social_posts SET SCHEMA core;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE post_likes SET SCHEMA core;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE post_comments SET SCHEMA core;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Messaging
DO $$ BEGIN
    ALTER TABLE conversations SET SCHEMA core;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE conversation_participants SET SCHEMA core;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE messages SET SCHEMA core;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE message_read_state SET SCHEMA core;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =====================================================
-- 3. MOVE MARKETPLACE TABLES
-- =====================================================

DO $$ BEGIN
    ALTER TABLE marketplace_products SET SCHEMA marketplace;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE marketplace_transactions SET SCHEMA marketplace;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE escrow_transactions SET SCHEMA marketplace;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE marketplace_reviews SET SCHEMA marketplace;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =====================================================
-- 4. FUTURE MODULE TABLES (empty, ready for use)
-- =====================================================

-- WAVE: Personal/family accounting
CREATE TABLE IF NOT EXISTS wave.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'personal' CHECK (type IN ('personal', 'family', 'business')),
    balance DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'COP',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wave.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES wave.accounts(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    type VARCHAR(20) DEFAULT 'expense' CHECK (type IN ('income', 'expense', 'transfer')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BIZ: Appointments and services
CREATE TABLE IF NOT EXISTS biz.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2),
    duration_minutes INTEGER DEFAULT 60,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS biz.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES biz.services(id) ON DELETE CASCADE,
    client_id UUID NOT NULL,
    provider_id UUID NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACADEMY: Notes and subjects
CREATE TABLE IF NOT EXISTS academy.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    semester VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academy.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES academy.subjects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. GIN INDEXES for recommendation algorithm
-- =====================================================

-- Ensure GIN indexes exist on tag columns for fast overlap queries
-- These prevent the recommendation algorithm from degrading as data grows

-- Marketplace product tags (for "Para Ti" feed matching)
CREATE INDEX IF NOT EXISTS idx_mp_products_category_gin 
  ON marketplace.marketplace_products USING GIN (category_tags);

-- User interest tags (for personalized recommendations)
CREATE INDEX IF NOT EXISTS idx_profiles_interests_gin 
  ON core.profiles USING GIN (interest_tags);

-- Academy note tags
CREATE INDEX IF NOT EXISTS idx_academy_notes_tags_gin 
  ON academy.notes USING GIN (tags);
