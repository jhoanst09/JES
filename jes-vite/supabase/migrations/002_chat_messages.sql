-- ============================================
-- CHAT SYSTEM SQL
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing if needed (be careful in production)
-- DROP TABLE IF EXISTS messages CASCADE;

-- Create messages table if not exists
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'audio', 'file')),
    file_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON messages;

-- Users can see messages they sent or received
CREATE POLICY "Users can view their messages" ON messages
    FOR SELECT USING (
        auth.uid() = sender_id OR auth.uid() = receiver_id
    );

-- Users can send messages
CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );

-- Users can mark messages as read (update is_read)
CREATE POLICY "Users can update their received messages" ON messages
    FOR UPDATE USING (
        auth.uid() = receiver_id
    );

-- ============================================
-- ENABLE REALTIME
-- ============================================
-- Add messages table to Realtime publication
DO $$
BEGIN
    -- Check if already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;
END $$;

-- ============================================
-- STORAGE BUCKET (Run in Dashboard or use API)
-- ============================================
-- Go to Supabase Dashboard > Storage > New Bucket
-- Name: chat-media
-- Public: Yes
-- Or run this SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for chat media
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;

CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'chat-media' AND auth.role() = 'authenticated'
    );

CREATE POLICY "Allow public downloads" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'chat-media'
    );
