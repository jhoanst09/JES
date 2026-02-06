-- =====================================================
-- FINAL PRODUCTION SECURITY SQL
-- Run this in Supabase SQL Editor
-- Date: 2026-02-01
-- =====================================================

-- =====================================================
-- 1. ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. DROP ALL EXISTING POLICIES (Clean Slate)
-- =====================================================

-- Profiles
DROP POLICY IF EXISTS "users_can_view_friend_profiles" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;

-- Messages
DROP POLICY IF EXISTS "users_can_read_own_messages" ON messages;
DROP POLICY IF EXISTS "users_can_insert_messages" ON messages;
DROP POLICY IF EXISTS "users_can_update_own_messages" ON messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON messages;
DROP POLICY IF EXISTS "Users can read their conversations" ON messages;

-- Friendships
DROP POLICY IF EXISTS "users_can_view_own_friendships" ON friendships;
DROP POLICY IF EXISTS "users_can_send_friend_requests" ON friendships;
DROP POLICY IF EXISTS "users_can_update_friend_requests" ON friendships;
DROP POLICY IF EXISTS "users_can_delete_friendships" ON friendships;

-- =====================================================
-- 3. PROFILES TABLE - Strict Friend-Only Access
-- =====================================================

-- Users can view their own profile
CREATE POLICY "users_can_view_own_profile" ON profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Users can view profiles of ACCEPTED friends only
CREATE POLICY "users_can_view_friend_profiles" ON profiles
FOR SELECT TO authenticated
USING (
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

-- Users can update only their own profile
CREATE POLICY "users_can_update_own_profile" ON profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Users can insert only their own profile
CREATE POLICY "users_can_insert_own_profile" ON profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- =====================================================
-- 4. MESSAGES TABLE - Private Conversations Only
-- =====================================================

-- Users can only read messages they sent or received
CREATE POLICY "users_can_read_own_messages" ON messages
FOR SELECT TO authenticated
USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Users can only insert messages where they are the sender
-- AND the receiver is an accepted friend
CREATE POLICY "users_can_insert_messages" ON messages
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
        AND (
            (friendships.user_id = auth.uid() AND friendships.friend_id = messages.receiver_id)
            OR
            (friendships.friend_id = auth.uid() AND friendships.user_id = messages.receiver_id)
        )
    )
);

-- Users can update messages they received (for read receipts)
CREATE POLICY "users_can_update_received_messages" ON messages
FOR UPDATE TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- =====================================================
-- 5. FRIENDSHIPS TABLE - Controlled Access
-- =====================================================

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
    AND user_id <> friend_id  -- Can't friend yourself
);

-- Only the recipient can accept/reject requests
CREATE POLICY "users_can_respond_to_requests" ON friendships
FOR UPDATE TO authenticated
USING (auth.uid() = friend_id)
WITH CHECK (auth.uid() = friend_id);

-- Users can delete (unfriend) relationships they're part of
CREATE POLICY "users_can_delete_friendships" ON friendships
FOR DELETE TO authenticated
USING (
    auth.uid() = user_id OR auth.uid() = friend_id
);

-- =====================================================
-- 6. ADD E2EE COLUMN IF NOT EXISTS
-- =====================================================

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'iv'
    ) THEN
        ALTER TABLE messages ADD COLUMN iv TEXT;
        COMMENT ON COLUMN messages.iv IS 'Initialization vector for AES-256-GCM encryption';
    END IF;
END $$;

-- =====================================================
-- 7. PERFORMANCE INDEXES
-- =====================================================

-- Messages: Fast conversation lookup
CREATE INDEX IF NOT EXISTS idx_messages_conversation_v2
ON messages(LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at DESC);

-- Messages: Unread count
CREATE INDEX IF NOT EXISTS idx_messages_unread_v2
ON messages(receiver_id, is_read, created_at DESC) WHERE is_read = false;

-- Friendships: Status lookup
CREATE INDEX IF NOT EXISTS idx_friendships_status
ON friendships(status, user_id, friend_id);

-- Friendships: Accepted only
CREATE INDEX IF NOT EXISTS idx_friendships_accepted_v2
ON friendships(user_id, friend_id) WHERE status = 'accepted';

-- Profiles: Username search
CREATE INDEX IF NOT EXISTS idx_profiles_username
ON profiles(username) WHERE username IS NOT NULL;

-- =====================================================
-- 8. RATE LIMITING TABLE (Optional - for API-side limiting)
-- =====================================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, action)
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_rate_limits" ON rate_limits
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================

-- Verify RLS is enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'messages', 'friendships', 'rate_limits');

-- Verify policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 10. SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Security policies applied successfully!';
    RAISE NOTICE '- Profiles: Friend-only visibility';
    RAISE NOTICE '- Messages: Private conversations only';
    RAISE NOTICE '- Friendships: Controlled access';
    RAISE NOTICE '- E2EE column: Added';
    RAISE NOTICE '- Indexes: Optimized';
END $$;
