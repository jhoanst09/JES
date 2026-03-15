-- Migration 031: New Ecosystem Schemas for Modular Monolith
-- Creates the newly planned schemas: radar, tools, arena, space, student (re-using academy logic).

-- =====================================================
-- 1. CREATE SCHEMAS
-- =====================================================

CREATE SCHEMA IF NOT EXISTS radar;       -- Live Maps, Events, Ticket Sales
CREATE SCHEMA IF NOT EXISTS tools;       -- WASM Utilities, Converters, Tasks
CREATE SCHEMA IF NOT EXISTS arena;       -- Gaming, Combats, JES Coin Bets
CREATE SCHEMA IF NOT EXISTS space;       -- Personal Storage, Cloud
CREATE SCHEMA IF NOT EXISTS student;     -- Education, Productivity (extends academy)

-- =====================================================
-- 2. CREATE RADAR TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS radar.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    ticket_price DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket Sales connected to Core Wallet implicitly via code
CREATE TABLE IF NOT EXISTS radar.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES radar.events(id) ON DELETE CASCADE,
    purchaser_id UUID NOT NULL,
    qr_code_hash VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'refunded')),
    purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE ARENA TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS arena.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_slug VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'live', 'finished')),
    prize_pool DECIMAL(12,2) DEFAULT 0,
    winner_id UUID,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arena.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES arena.matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL,
    bet_amount DECIMAL(12,2) DEFAULT 0,
    score INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. CREATE TOOLS TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS tools.wasm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    input_size_bytes BIGINT,
    computation_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. CREATE SPACE TABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS space.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT NOT NULL,
    s3_key VARCHAR(512) NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
