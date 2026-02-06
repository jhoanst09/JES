-- =============================================
-- FIX COMPLETO PARA MESSAGES Y FRIENDS
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- ======================
-- MESSAGES TABLE
-- ======================
DROP POLICY IF EXISTS "messages_select_own" ON messages;
DROP POLICY IF EXISTS "messages_insert_own" ON messages;
DROP POLICY IF EXISTS "messages_update_receiver" ON messages;
DROP POLICY IF EXISTS "msg_select" ON messages;
DROP POLICY IF EXISTS "msg_insert" ON messages;
DROP POLICY IF EXISTS "msg_update" ON messages;
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON messages;

-- Crear políticas simples
CREATE POLICY "msg_view" ON messages 
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "msg_send" ON messages 
FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "msg_read" ON messages 
FOR UPDATE USING (auth.uid() = receiver_id);

-- ======================
-- FRIENDS TABLE
-- ======================
DROP POLICY IF EXISTS "friends_select_own" ON friends;
DROP POLICY IF EXISTS "friends_insert_own" ON friends;
DROP POLICY IF EXISTS "friends_update_both" ON friends;
DROP POLICY IF EXISTS "friends_delete_both" ON friends;
DROP POLICY IF EXISTS "Users can view their friends" ON friends;
DROP POLICY IF EXISTS "Users can create friend requests" ON friends;
DROP POLICY IF EXISTS "Users can respond to friend requests" ON friends;
DROP POLICY IF EXISTS "Users can remove friends" ON friends;

-- Crear políticas simples
CREATE POLICY "fr_view" ON friends 
FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "fr_create" ON friends 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fr_update" ON friends 
FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);

CREATE POLICY "fr_delete" ON friends 
FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ======================
-- LIKES TABLE
-- ======================
DROP POLICY IF EXISTS "likes_select_all" ON likes;
DROP POLICY IF EXISTS "likes_insert_own" ON likes;
DROP POLICY IF EXISTS "likes_delete_own" ON likes;

CREATE POLICY "like_view" ON likes FOR SELECT USING (true);
CREATE POLICY "like_add" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "like_remove" ON likes FOR DELETE USING (auth.uid() = user_id);

-- ======================
-- COMMENTS TABLE
-- ======================
DROP POLICY IF EXISTS "comments_select_all" ON comments;
DROP POLICY IF EXISTS "comments_insert_own" ON comments;
DROP POLICY IF EXISTS "comments_delete_own" ON comments;

CREATE POLICY "cmt_view" ON comments FOR SELECT USING (true);
CREATE POLICY "cmt_add" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cmt_remove" ON comments FOR DELETE USING (auth.uid() = user_id);

-- ======================
-- VERIFICAR
-- ======================
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE schemaname = 'public' AND tablename IN ('messages', 'friends', 'likes', 'comments')
ORDER BY tablename, cmd;
