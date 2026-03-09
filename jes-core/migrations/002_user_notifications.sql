-- ========================================
-- JES Notifications System
-- user_notifications table + indexes
-- ========================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Notification categories aligned with Entire.io log levels
-- info:    Chat messages, social activity
-- success: Payments, JES Coin mining, completed tasks
-- warning: Low balance, pending actions
-- error:   Failed transactions, system errors

CREATE TABLE IF NOT EXISTS user_notifications (
    id              UUID            DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id         UUID            NOT NULL,
    category        VARCHAR(20)     NOT NULL DEFAULT 'info',   -- info | success | warning | error
    title           VARCHAR(255)    NOT NULL,
    message         TEXT            NOT NULL,
    icon            VARCHAR(10),                                -- emoji or icon key
    action_url      TEXT,                                       -- deep link (e.g. /chat, /product/handle)
    is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
    -- Entire.io session integration
    metadata        JSONB           NOT NULL DEFAULT '{}',      -- { session_id, checkpoint_id, source, ... }
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at         TIMESTAMPTZ
);

-- Index for fetching user notifications (most recent first)
CREATE INDEX idx_notifications_user_created
    ON user_notifications (user_id, created_at DESC);

-- Index for unread count queries
CREATE INDEX idx_notifications_user_unread
    ON user_notifications (user_id)
    WHERE is_read = FALSE;

-- Index for category filtering
CREATE INDEX idx_notifications_category
    ON user_notifications (user_id, category);

-- ========================================
-- Helper: Insert notification
-- ========================================
CREATE OR REPLACE FUNCTION insert_notification(
    p_user_id       UUID,
    p_category      VARCHAR(20),
    p_title         VARCHAR(255),
    p_message       TEXT,
    p_icon          VARCHAR(10) DEFAULT NULL,
    p_action_url    TEXT DEFAULT NULL,
    p_metadata      JSONB DEFAULT '{}'
)
RETURNS user_notifications AS $$
DECLARE
    result user_notifications;
BEGIN
    INSERT INTO user_notifications (user_id, category, title, message, icon, action_url, metadata)
    VALUES (p_user_id, p_category, p_title, p_message, p_icon, p_action_url, p_metadata)
    RETURNING * INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Helper: Mark notifications as read
-- ========================================
CREATE OR REPLACE FUNCTION mark_notifications_read(
    p_user_id           UUID,
    p_notification_ids  UUID[] DEFAULT NULL  -- NULL = mark ALL as read
)
RETURNS INTEGER AS $$
DECLARE
    updated INTEGER;
BEGIN
    IF p_notification_ids IS NULL THEN
        UPDATE user_notifications
        SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id AND is_read = FALSE;
    ELSE
        UPDATE user_notifications
        SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id AND id = ANY(p_notification_ids) AND is_read = FALSE;
    END IF;
    GET DIAGNOSTICS updated = ROW_COUNT;
    RETURN updated;
END;
$$ LANGUAGE plpgsql;
