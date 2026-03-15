-- ScyllaDB Schema: High-volume data storage
-- Run with: cqlsh -f scylla_schema.cql

-- =====================================================
-- KEYSPACE: messaging
-- Partition: conversation_id (all messages for a conv are co-located)
-- =====================================================

CREATE KEYSPACE IF NOT EXISTS messaging
WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'datacenter1': 3
};

CREATE TABLE IF NOT EXISTS messaging.messages (
    conversation_id uuid,
    created_at timestamp,
    id uuid,
    sender_id uuid,
    content text,
    message_type text,    -- 'text', 'image', 'audio', 'gift'
    metadata map<text, text>,
    PRIMARY KEY (conversation_id, created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id ASC)
  AND default_time_to_live = 31536000   -- 1 year TTL
  AND compaction = {'class': 'TimeWindowCompactionStrategy',
                     'compaction_window_unit': 'DAYS',
                     'compaction_window_size': 1};

-- =====================================================
-- KEYSPACE: social
-- Feed posts partitioned by user for fast timeline queries
-- =====================================================

CREATE KEYSPACE IF NOT EXISTS social
WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'datacenter1': 3
};

CREATE TABLE IF NOT EXISTS social.feed_posts (
    user_id uuid,
    created_at timestamp,
    post_id uuid,
    content text,
    media_urls list<text>,
    like_count counter,
    comment_count counter,
    PRIMARY KEY (user_id, created_at, post_id)
) WITH CLUSTERING ORDER BY (created_at DESC, post_id ASC);

-- Separate counter table (ScyllaDB requires counters in dedicated tables)
CREATE TABLE IF NOT EXISTS social.post_counters (
    post_id uuid PRIMARY KEY,
    like_count counter,
    comment_count counter
);

CREATE TABLE IF NOT EXISTS social.post_interactions (
    post_id uuid,
    user_id uuid,
    interaction_type text,  -- 'like', 'comment', 'share'
    content text,           -- comment text if applicable
    created_at timestamp,
    PRIMARY KEY (post_id, created_at, user_id)
) WITH CLUSTERING ORDER BY (created_at DESC, user_id ASC);

-- =====================================================
-- KEYSPACE: telemetry
-- Partitioned by date for efficient time-range scans and auto-expiry
-- =====================================================

CREATE KEYSPACE IF NOT EXISTS telemetry
WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'datacenter1': 2
};

CREATE TABLE IF NOT EXISTS telemetry.slow_queries (
    date date,
    logged_at timestamp,
    id uuid,
    sql text,
    duration_ms double,
    params_count int,
    service text,           -- 'jes-core', 'jes-gateway', 'jes-realtime'
    PRIMARY KEY (date, logged_at, id)
) WITH CLUSTERING ORDER BY (logged_at DESC, id ASC)
  AND default_time_to_live = 2592000;  -- 30 days TTL

CREATE TABLE IF NOT EXISTS telemetry.api_metrics (
    date date,
    logged_at timestamp,
    id uuid,
    endpoint text,
    method text,
    status_code int,
    duration_ms double,
    service text,
    PRIMARY KEY (date, logged_at, id)
) WITH CLUSTERING ORDER BY (logged_at DESC, id ASC)
  AND default_time_to_live = 2592000;  -- 30 days TTL
