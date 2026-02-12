-- =====================================================
-- 017: Expand notification types for social features
-- =====================================================

-- Drop old CHECK constraint and add expanded one
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('comment_reply', 'mention', 'like', 'follow', 'friend_request', 'friend_accepted', 'gift', 'vaca', 'system'));
