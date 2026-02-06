-- =====================================================
-- SUPERAPP DATABASE OPTIMIZATION
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 0. ADD MISSING COLUMNS TO MESSAGES (if not exist)
-- =====================================================

-- Add is_read column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_read') THEN
        ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add content_type column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'content_type') THEN
        ALTER TABLE messages ADD COLUMN content_type TEXT DEFAULT 'text';
    END IF;
END $$;

-- Add file_url column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'file_url') THEN
        ALTER TABLE messages ADD COLUMN file_url TEXT;
    END IF;
END $$;

-- Add iv column for E2EE (stores initialization vector for AES-256-GCM)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'iv') THEN
        ALTER TABLE messages ADD COLUMN iv TEXT;
    END IF;
END $$;

-- =====================================================
-- 1. INDEXES FOR MESSAGES TABLE (100k+ records support)
-- =====================================================

-- Primary query index: Get messages between two users
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
ON messages(sender_id, receiver_id, created_at DESC);

-- Index for finding all messages from a sender
CREATE INDEX IF NOT EXISTS idx_messages_sender 
ON messages(sender_id, created_at DESC);

-- Index for finding all messages to a receiver
CREATE INDEX IF NOT EXISTS idx_messages_receiver 
ON messages(receiver_id, created_at DESC);

-- Composite index for unread messages (only if is_read column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'is_read'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_messages_unread 
        ON messages(receiver_id, is_read) WHERE is_read = false;
    END IF;
END $$;

-- =====================================================
-- 2. INDEXES FOR FRIENDS TABLE
-- =====================================================

-- Find friends for a user
CREATE INDEX IF NOT EXISTS idx_friends_user 
ON friends(user_id, status);

CREATE INDEX IF NOT EXISTS idx_friends_friend 
ON friends(friend_id, status);

-- Accepted friends lookup
CREATE INDEX IF NOT EXISTS idx_friends_accepted 
ON friends(user_id, friend_id) WHERE status = 'accepted';

-- =====================================================
-- 3. RLS POLICIES FOR FRIENDS/PROFILES JOIN
-- =====================================================

-- Allow users to read profiles of their friends
DROP POLICY IF EXISTS "users_can_view_friend_profiles" ON profiles;
CREATE POLICY "users_can_view_friend_profiles" ON profiles
FOR SELECT TO authenticated
USING (
    -- Can view own profile
    auth.uid() = id
    OR
    -- Can view profile if there's an accepted friendship
    EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
        AND (
            (friendships.user_id = auth.uid() AND friendships.friend_id = profiles.id)
            OR
            (friendships.friend_id = auth.uid() AND friendships.user_id = profiles.id)
        )
    )
    -- SECURITY: Removed 'OR true' - profiles are now friend-only
);

-- Friends table: Users can only see their own friends
DROP POLICY IF EXISTS "users_can_view_own_friends" ON friends;
CREATE POLICY "users_can_view_own_friends" ON friends
FOR SELECT TO authenticated
USING (
    auth.uid() = user_id OR auth.uid() = friend_id
);

-- Users can insert friend requests (they must be the requester)
DROP POLICY IF EXISTS "users_can_send_friend_requests" ON friends;
CREATE POLICY "users_can_send_friend_requests" ON friends
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update friends they're part of (accept/reject)
DROP POLICY IF EXISTS "users_can_update_friends" ON friends;
CREATE POLICY "users_can_update_friends" ON friends
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR auth.uid() = friend_id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can delete friendships they're part of
DROP POLICY IF EXISTS "users_can_delete_friendships" ON friends;
CREATE POLICY "users_can_delete_friendships" ON friends
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- =====================================================
-- 4. OPTIMIZED MESSAGES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "chat_select" ON messages;
CREATE POLICY "chat_select" ON messages
FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "chat_insert" ON messages;
CREATE POLICY "chat_insert" ON messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "chat_update" ON messages;
CREATE POLICY "chat_update" ON messages
FOR UPDATE TO authenticated
USING (auth.uid() = receiver_id); -- Only receiver can mark as read

-- =====================================================
-- 5. FUNCTION FOR EFFICIENT CONVERSATION QUERY
-- =====================================================

CREATE OR REPLACE FUNCTION get_conversation(
    p_user_id UUID,
    p_partner_id UUID,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    sender_id UUID,
    receiver_id UUID,
    content TEXT,
    content_type TEXT,
    file_url TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.content_type,
        m.file_url,
        m.is_read,
        m.created_at
    FROM messages m
    WHERE 
        (m.sender_id = p_user_id AND m.receiver_id = p_partner_id)
        OR
        (m.sender_id = p_partner_id AND m.receiver_id = p_user_id)
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_conversation TO authenticated;

-- =====================================================
-- 6. FUNCTION FOR UNREAD COUNT
-- =====================================================

CREATE OR REPLACE FUNCTION get_unread_counts(p_user_id UUID)
RETURNS TABLE (
    sender_id UUID,
    unread_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT 
        m.sender_id,
        COUNT(*) as unread_count
    FROM messages m
    WHERE 
        m.receiver_id = p_user_id
        AND m.is_read = false
    GROUP BY m.sender_id;
$$;

GRANT EXECUTE ON FUNCTION get_unread_counts TO authenticated;

-- =====================================================
-- 7. ANALYZE TABLES (Run after indexes created)
-- =====================================================

ANALYZE messages;
ANALYZE friends;
ANALYZE profiles;
