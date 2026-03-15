-- Add is_private column to wishlist_items
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
