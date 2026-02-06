-- =====================================================
-- SECURITY FIX: RLS Policies Hardening
-- Run this in Supabase SQL Editor
-- Date: 2026-01-31
-- =====================================================

-- =====================================================
-- 1. FIX PROFILES TABLE (Remove Universal Access)
-- =====================================================

-- Drop the insecure policy
DROP POLICY IF EXISTS "users_can_view_friend_profiles" ON profiles;

-- Create secure policy: Only friends can see each other's profiles
CREATE POLICY "users_can_view_friend_profiles" ON profiles
FOR SELECT TO authenticated
USING (
    -- Can view own profile
    auth.uid() = id
    OR
    -- Can view profile if there's an accepted friendship (using 'friendships' table)
    EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
        AND (
            (friendships.user_id = auth.uid() AND friendships.friend_id = profiles.id)
            OR
            (friendships.friend_id = auth.uid() AND friendships.user_id = profiles.id)
        )
    )
);

-- =====================================================
-- 2. SECURE MESSAGES TABLE
-- =====================================================

-- Enable RLS on messages if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "users_can_read_own_messages" ON messages;
DROP POLICY IF EXISTS "users_can_insert_messages" ON messages;
DROP POLICY IF EXISTS "users_can_update_own_messages" ON messages;

-- Users can only read messages they sent or received
CREATE POLICY "users_can_read_own_messages" ON messages
FOR SELECT TO authenticated
USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Users can only insert messages where they are the sender
CREATE POLICY "users_can_insert_messages" ON messages
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = sender_id
);

-- Users can only update messages they received (for is_read)
CREATE POLICY "users_can_update_own_messages" ON messages
FOR UPDATE TO authenticated
USING (
    auth.uid() = receiver_id
)
WITH CHECK (
    auth.uid() = receiver_id
);

-- =====================================================
-- 3. SECURE FRIENDSHIPS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "users_can_view_own_friendships" ON friendships;
DROP POLICY IF EXISTS "users_can_send_friend_requests" ON friendships;
DROP POLICY IF EXISTS "users_can_update_friend_requests" ON friendships;
DROP POLICY IF EXISTS "users_can_delete_friendships" ON friendships;

-- Users can only see friendships they're part of
CREATE POLICY "users_can_view_own_friendships" ON friendships
FOR SELECT TO authenticated
USING (
    auth.uid() = user_id OR auth.uid() = friend_id
);

-- Users can send friend requests (must be the requester)
CREATE POLICY "users_can_send_friend_requests" ON friendships
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = user_id
);

-- Users can accept/reject requests sent TO them
CREATE POLICY "users_can_update_friend_requests" ON friendships
FOR UPDATE TO authenticated
USING (
    auth.uid() = friend_id -- Only the recipient can accept/reject
)
WITH CHECK (
    auth.uid() = friend_id
);

-- Users can delete friendships they're part of
CREATE POLICY "users_can_delete_friendships" ON friendships
FOR DELETE TO authenticated
USING (
    auth.uid() = user_id OR auth.uid() = friend_id
);

-- =====================================================
-- 4. PERFORMANCE INDEXES
-- =====================================================

-- Index for fast message lookups
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
ON messages(sender_id, receiver_id, created_at DESC);

-- Index for unread messages
CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON messages(receiver_id, is_read) WHERE is_read = false;

-- Index for friendships lookup
CREATE INDEX IF NOT EXISTS idx_friendships_user 
ON friendships(user_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_friend 
ON friendships(friend_id, status);

-- Composite index for accepted friendships
CREATE INDEX IF NOT EXISTS idx_friendships_accepted 
ON friendships(user_id, friend_id) WHERE status = 'accepted';

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'messages', 'friendships');

-- Verify policies exist
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
