-- Migration 027: Read State table for async PostgreSQL persistence
-- Redis holds the real-time read state; this table is the durable backup.
-- Flushed from Redis every 5 minutes or on session logout.

CREATE TABLE IF NOT EXISTS message_read_state (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    last_read_message_id UUID,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_read_state_user ON message_read_state(user_id);
