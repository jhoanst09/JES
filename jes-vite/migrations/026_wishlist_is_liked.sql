-- Add is_liked column for independent public/private lists
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS is_liked BOOLEAN DEFAULT FALSE;

-- Existing wishlist items were public favorites, so mark them as liked
UPDATE wishlist_items SET is_liked = TRUE WHERE is_liked IS NULL OR is_liked = FALSE;
