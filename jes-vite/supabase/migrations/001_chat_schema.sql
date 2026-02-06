-- =====================================================
-- CHAT SYSTEM SCHEMA
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable Realtime for these tables
-- (Run AFTER creating the tables)

-- 1. CONVERSATIONS TABLE
-- Stores chat rooms (direct messages or future group chats)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
    name TEXT, -- For group chats
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CONVERSATION PARTICIPANTS
-- Links users to conversations (supports 1-to-1 and groups)
CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    PRIMARY KEY (conversation_id, user_id)
);

-- 3. MESSAGES TABLE
-- Stores all messages with support for text, images, and videos
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'audio', 'file')),
    media_url TEXT,
    media_metadata JSONB, -- {width, height, duration, size, filename}
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);

-- UPDATE CONVERSATION timestamp when new message arrives
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_message_insert ON messages;
CREATE TRIGGER on_message_insert
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- RLS POLICIES
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can only see conversations they participate in
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (
        id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Users can only see participants of their conversations
DROP POLICY IF EXISTS "Users can view participants" ON conversation_participants;
CREATE POLICY "Users can view participants" ON conversation_participants
    FOR SELECT USING (
        conversation_id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Users can insert themselves into conversations
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
CREATE POLICY "Users can join conversations" ON conversation_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only see messages in their conversations
DROP POLICY IF EXISTS "Users can view messages" ON messages;
CREATE POLICY "Users can view messages" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Users can send messages to conversations they're in
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Users can update their own messages (for read status, etc)
DROP POLICY IF EXISTS "Users can update messages" ON messages;
CREATE POLICY "Users can update messages" ON messages
    FOR UPDATE USING (
        conversation_id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Enable Realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- =====================================================
-- STORAGE BUCKET for chat media
-- =====================================================
-- Run this in Storage section or via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true);

-- Storage policies for chat-media bucket:
-- 1. Users can upload files
-- CREATE POLICY "Users can upload chat media" ON storage.objects
--     FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);
-- 2. Anyone can view files (public)
-- CREATE POLICY "Public read chat media" ON storage.objects
--     FOR SELECT USING (bucket_id = 'chat-media');
