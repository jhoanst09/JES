-- ===========================================
-- JES Store - Supabase Row Level Security Policies
-- ===========================================
-- Run this script in the Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste & Run

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- PROFILES
-- ===========================================
-- Users can read any profile (public profiles)
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ===========================================
-- WISHLIST_ITEMS
-- ===========================================
-- Users can only see their own wishlist items (or public ones from others)
CREATE POLICY "Users can view own wishlist"
ON wishlist_items FOR SELECT
USING (auth.uid() = user_id OR is_private = false);

-- Users can only insert their own wishlist items
CREATE POLICY "Users can insert own wishlist items"
ON wishlist_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own wishlist items
CREATE POLICY "Users can update own wishlist items"
ON wishlist_items FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own wishlist items
CREATE POLICY "Users can delete own wishlist items"
ON wishlist_items FOR DELETE
USING (auth.uid() = user_id);

-- ===========================================
-- POSTS
-- ===========================================
-- Everyone can view posts
CREATE POLICY "Posts are viewable by everyone"
ON posts FOR SELECT
USING (true);

-- Users can only create their own posts
CREATE POLICY "Users can create own posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own posts
CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE
USING (auth.uid() = user_id);

-- Users can only delete their own posts
CREATE POLICY "Users can delete own posts"
ON posts FOR DELETE
USING (auth.uid() = user_id);

-- ===========================================
-- POST_LIKES
-- ===========================================
-- Everyone can view likes
CREATE POLICY "Likes are viewable by everyone"
ON post_likes FOR SELECT
USING (true);

-- Users can only insert their own likes
CREATE POLICY "Users can insert own likes"
ON post_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own likes
CREATE POLICY "Users can delete own likes"
ON post_likes FOR DELETE
USING (auth.uid() = user_id);

-- ===========================================
-- POST_COMMENTS
-- ===========================================
-- Everyone can view comments
CREATE POLICY "Comments are viewable by everyone"
ON post_comments FOR SELECT
USING (true);

-- Users can only create their own comments
CREATE POLICY "Users can create own comments"
ON post_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own comments
CREATE POLICY "Users can delete own comments"
ON post_comments FOR DELETE
USING (auth.uid() = user_id);

-- ===========================================
-- FRIENDSHIPS
-- ===========================================
-- Users can view friendships they are part of
CREATE POLICY "Users can view own friendships"
ON friendships FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friendship requests (as sender)
CREATE POLICY "Users can send friend requests"
ON friendships FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update friendships they are the recipient of (to accept/reject)
CREATE POLICY "Recipients can update friendship status"
ON friendships FOR UPDATE
USING (auth.uid() = friend_id);

-- Users can delete friendships they are part of
CREATE POLICY "Users can delete own friendships"
ON friendships FOR DELETE
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ===========================================
-- MESSAGES (Private - participants only)
-- ===========================================
-- Users can only view messages they sent or received
CREATE POLICY "Users can view own messages"
ON messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can only send messages as themselves
CREATE POLICY "Users can send messages as themselves"
ON messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- ===========================================
-- ORDERS (Private to user)
-- ===========================================
-- Users can only view their own orders
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

-- Users can only create their own orders
CREATE POLICY "Users can create own orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- VERIFICATION
-- ===========================================
-- After running, verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
