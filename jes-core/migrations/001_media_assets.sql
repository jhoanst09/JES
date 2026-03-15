-- JES Media Deduplication — PostgreSQL Migration
-- Run against your PostgreSQL (RDS) instance
-- This creates the centralized media_assets table for dedup

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SCHEMA: core (already exists in search_path)
-- =====================================================

-- Central media registry with SHA-256 + Perceptual Hash
CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Binary hash (SHA-256) — exact duplicate detection
    file_hash VARCHAR(64) UNIQUE NOT NULL,
    
    -- Perceptual hash — visual similarity detection (images only)
    -- Stored as BIGINT for efficient Hamming distance calculation
    p_hash BIGINT,
    
    -- Storage location
    s3_url TEXT NOT NULL,
    s3_key TEXT NOT NULL,           -- S3 object key for deletion
    cdn_url TEXT,                    -- Optional CloudFront URL
    
    -- File metadata
    mime_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    width INTEGER,
    height INTEGER,
    
    -- Reference counting: how many entities use this asset
    ref_count INTEGER NOT NULL DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_referenced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fast lookup by SHA-256 hash (primary dedup path)
CREATE INDEX IF NOT EXISTS idx_media_file_hash ON media_assets(file_hash);

-- Fast lookup by mime type for analytics
CREATE INDEX IF NOT EXISTS idx_media_mime_type ON media_assets(mime_type);

-- Composite index for cleanup queries (orphaned assets)
CREATE INDEX IF NOT EXISTS idx_media_ref_count ON media_assets(ref_count) WHERE ref_count = 0;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Hamming distance function for perceptual hash comparison
-- Returns number of differing bits between two BIGINT hashes
CREATE OR REPLACE FUNCTION hamming_distance(hash1 BIGINT, hash2 BIGINT)
RETURNS INTEGER AS $$
BEGIN
    RETURN bit_count((hash1 # hash2)::BIT(64));
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Upsert function: insert or increment ref_count
-- Returns the media_asset row (new or existing)
CREATE OR REPLACE FUNCTION upsert_media_asset(
    p_file_hash VARCHAR(64),
    p_p_hash BIGINT,
    p_s3_url TEXT,
    p_s3_key TEXT,
    p_cdn_url TEXT,
    p_mime_type VARCHAR(50),
    p_file_size_bytes BIGINT,
    p_width INTEGER DEFAULT NULL,
    p_height INTEGER DEFAULT NULL
) RETURNS media_assets AS $$
DECLARE
    result media_assets;
BEGIN
    -- Try to insert
    INSERT INTO media_assets (file_hash, p_hash, s3_url, s3_key, cdn_url, mime_type, file_size_bytes, width, height)
    VALUES (p_file_hash, p_p_hash, p_s3_url, p_s3_key, p_cdn_url, p_mime_type, p_file_size_bytes, p_width, p_height)
    ON CONFLICT (file_hash) DO UPDATE SET
        ref_count = media_assets.ref_count + 1,
        last_referenced_at = CURRENT_TIMESTAMP
    RETURNING * INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
