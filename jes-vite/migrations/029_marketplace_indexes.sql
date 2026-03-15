-- Migration 029: Marketplace query performance indexes
-- Telemetry shows marketplace_products JOIN profiles taking 156ms.
-- B-Tree indexes on the foreign key columns used in the JOIN.

-- Seller lookup index (marketplace_products → profiles JOIN)
CREATE INDEX IF NOT EXISTS idx_mp_products_seller_id
  ON marketplace.marketplace_products (seller_id);

-- Profiles primary key is already indexed, but ensure it's explicit
-- for cross-schema lookups after the schema migration
CREATE INDEX IF NOT EXISTS idx_profiles_id_btree
  ON core.profiles (id);

-- Active products filter (frequently used WHERE clause)
CREATE INDEX IF NOT EXISTS idx_mp_products_status_created
  ON marketplace.marketplace_products (status, created_at DESC)
  WHERE status = 'active';
