-- =====================================================
-- THREADED COMMENTS & NOTIFICATIONS MIGRATION
-- Run this on AWS RDS PostgreSQL
-- =====================================================

-- 1. ADD PARENT_ID TO COMMENTS (for threading)
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS parent_id UUID;

-- Add foreign key to support replies
ALTER TABLE post_comments 
ADD CONSTRAINT fk_parent_comment 
FOREIGN KEY (parent_id) 
REFERENCES post_comments(id) 
ON DELETE CASCADE;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_comments_parent ON post_comments(parent_id);

-- =====================================================
-- 2. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    actor_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('comment_reply', 'mention', 'like', 'follow')),
    post_id UUID,
    comment_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign keys with cascade
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_post FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_comment FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- =====================================================
-- 3. VERIFY CASCADE DELETES
-- =====================================================
-- Already exist from supabase_social_tables.sql:
-- - posts ON DELETE CASCADE
-- - post_likes ON DELETE CASCADE  
-- - post_comments ON DELETE CASCADE
-- New: notifications ON DELETE CASCADE (from posts and comments)

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- DROP TABLE IF EXISTS notifications;
-- ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS fk_parent_comment;
-- ALTER TABLE post_comments DROP COLUMN IF EXISTS parent_id;
