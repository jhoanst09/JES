// Server-side Redis Session Manager
/**
 * Redis Session Manager (Upstash)
 * 
 * Provides persistent, distributed session management for:
 * - Session caching (faster than Supabase auth checks)
 * - Presence tracking (online users)
 * - Rate limiting
 * - Session sharing across serverless functions
 * 
 * SETUP:
 * 1. Create account at https://upstash.com
 * 2. Create a Redis database
 * 3. Add to .env.local:
 *    UPSTASH_REDIS_REST_URL=https://your-url.upstash.io
 *    UPSTASH_REDIS_REST_TOKEN=your-token
 * 
 * @author Infrastructure Architect
 */

// ==========================================
// UPSTASH REDIS CLIENT (REST-based, no TCP)
// ==========================================

// Variables are read inside functions to ensure cross-runtime compatibility (Edge/Node)

/**
 * Execute Redis command via REST API
 * @param {string} command - Redis command
 * @param {Array} args - Command arguments
 * @returns {Promise<any>}
 */
async function redisCommand(command, ...args) {
    const clean = (val) => {
        if (!val) return null;
        // Aggressive: strip quotes, trim, and remove accidental "VARIABLE=" prefixes
        return val.replace(/['"]/g, '').replace(/^(export\s+)?[A-Z_]+=\s*/, '').trim();
    };

    // Prepare pairs to try - Prioritizing Ohio (charmed-meerkat) as requested
    const pairs = [
        {
            url: clean(process.env.UPSTASH_REDIS_REST_URL || 'https://charmed-meerkat-61873.upstash.io'),
            token: clean(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN)
        }
    ].filter(p => p.url && p.token);

    if (pairs.length === 0) {
        console.warn('[Redis] No valid URL/Token found in environment');
        return null;
    }

    let lastError = null;

    for (const { url, token } of pairs) {
        try {
            const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;

            // PRODUCTION HARDENING: No-cache and 10s timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(urlWithProtocol, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([command, ...args]),
                cache: 'no-store', // Disable caching
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`401/Auth Error at ${url.substring(0, 15)}...: ${errorText.substring(0, 50)}`);
            }

            const data = await response.json();
            return data.result;
        } catch (err) {
            console.warn(`[Redis] Attempt failed for ${url.substring(0, 15)}...:`, err.message);
            lastError = err;
            continue;
        }
    }

    // If all failed
    throw lastError || new Error('All Redis connection attempts failed');
}

// ==========================================
// SESSION MANAGEMENT
// ==========================================

const SESSION_PREFIX = 'session:';
const SESSION_TTL = 60 * 60 * 24; // 24 hours (86,400 seconds)

/**
 * Store session in Redis
 * @param {string} userId - User ID
 * @param {object} sessionData - Session data to store
 * @returns {Promise<boolean>}
 */
export async function storeSession(userId, sessionData) {
    if (!userId) return false;

    const key = `${SESSION_PREFIX}${userId}`;
    const value = JSON.stringify({
        ...sessionData,
        stored_at: Date.now(),
        last_active: Date.now()
    });

    const result = await redisCommand('SET', key, value, 'EX', SESSION_TTL);
    return result === 'OK';
}

/**
 * Get session from Redis
 * @param {string} userId - User ID
 * @returns {Promise<object|null>}
 */
export async function getSession(userId) {
    if (!userId) return null;

    const key = `${SESSION_PREFIX}${userId}`;
    const result = await redisCommand('GET', key);

    if (!result) return null;

    try {
        return JSON.parse(result);
    } catch {
        return null;
    }
}

/**
 * Update session activity timestamp
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function touchSession(userId) {
    if (!userId) return false;

    const session = await getSession(userId);
    if (!session) return false;

    session.last_active = Date.now();
    return await storeSession(userId, session);
}

/**
 * Delete session from Redis
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function deleteSession(userId) {
    if (!userId) return false;

    const key = `${SESSION_PREFIX}${userId}`;
    const result = await redisCommand('DEL', key);
    return result === 1;
}

/**
 * Check if session exists and is valid
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function isSessionValid(userId) {
    const session = await getSession(userId);
    return session !== null;
}

// ==========================================
// PRESENCE TRACKING (Online Users)
// ==========================================

const PRESENCE_PREFIX = 'presence:';
const PRESENCE_TTL = 60; // 1 minute (auto-expires if no heartbeat)

/**
 * Mark user as online
 * @param {string} userId - User ID
 * @param {object} metadata - Optional metadata (page, device, etc.)
 * @returns {Promise<boolean>}
 */
export async function setOnline(userId, metadata = {}) {
    if (!userId) return false;

    const key = `${PRESENCE_PREFIX}${userId}`;
    const value = JSON.stringify({
        online_at: Date.now(),
        ...metadata
    });

    const result = await redisCommand('SET', key, value, 'EX', PRESENCE_TTL);
    return result === 'OK';
}

/**
 * Get online users
 * @param {Array<string>} userIds - List of user IDs to check
 * @returns {Promise<Set<string>>}
 */
export async function getOnlineUsers(userIds) {
    if (!userIds?.length) return new Set();

    // Use MGET for efficiency
    const keys = userIds.map(id => `${PRESENCE_PREFIX}${id}`);
    const results = await redisCommand('MGET', ...keys);

    if (!results) return new Set();

    const onlineSet = new Set();
    results.forEach((result, index) => {
        if (result !== null) {
            onlineSet.add(userIds[index]);
        }
    });

    return onlineSet;
}

/**
 * Mark user as offline
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function setOffline(userId) {
    if (!userId) return false;

    const key = `${PRESENCE_PREFIX}${userId}`;
    const result = await redisCommand('DEL', key);
    return result === 1;
}

/**
 * Get total online users count
 * @returns {Promise<number>}
 */
export async function getOnlineCount() {
    // Use SCAN to count presence keys
    const result = await redisCommand('KEYS', `${PRESENCE_PREFIX}*`);
    return result?.length || 0;
}

// ==========================================
// RATE LIMITING
// ==========================================

const RATE_PREFIX = 'rate:';

/**
 * Check if action is rate limited
 * @param {string} userId - User ID
 * @param {string} action - Action name (e.g., 'send_message')
 * @param {number} limit - Max actions allowed
 * @param {number} windowSeconds - Time window in seconds
 * @returns {Promise<{allowed: boolean, remaining: number, resetIn: number}>}
 */
export async function checkRateLimit(userId, action, limit = 60, windowSeconds = 60) {
    const key = `${RATE_PREFIX}${userId}:${action}`;

    // Get current count
    const current = await redisCommand('GET', key);
    const count = parseInt(current) || 0;

    if (count >= limit) {
        const ttl = await redisCommand('TTL', key);
        return {
            allowed: false,
            remaining: 0,
            resetIn: ttl || windowSeconds
        };
    }

    // Increment counter
    await redisCommand('INCR', key);

    // Set expiry if first request
    if (count === 0) {
        await redisCommand('EXPIRE', key, windowSeconds);
    }

    return {
        allowed: true,
        remaining: limit - count - 1,
        resetIn: windowSeconds
    };
}

// ==========================================
// MESSAGE QUEUE (for async processing)
// ==========================================

const QUEUE_PREFIX = 'queue:';

/**
 * Push message to queue for async processing
 * @param {string} queueName - Queue name
 * @param {object} message - Message to queue
 * @returns {Promise<boolean>}
 */
export async function pushToQueue(queueName, message) {
    const key = `${QUEUE_PREFIX}${queueName}`;
    const result = await redisCommand('RPUSH', key, JSON.stringify(message));
    return result !== null;
}

/**
 * Pop message from queue (for workers)
 * @param {string} queueName - Queue name
 * @returns {Promise<object|null>}
 */
export async function popFromQueue(queueName) {
    const key = `${QUEUE_PREFIX}${queueName}`;
    const result = await redisCommand('LPOP', key);

    if (!result) return null;

    try {
        return JSON.parse(result);
    } catch {
        return null;
    }
}

// ==========================================
// CACHE HELPERS
// ==========================================

/**
 * Cache a value with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlSeconds - TTL in seconds
 * @returns {Promise<boolean>}
 */
export async function cacheSet(key, value, ttlSeconds = 300) {
    const result = await redisCommand('SET', `cache:${key}`, JSON.stringify(value), 'EX', ttlSeconds);
    return result === 'OK';
}

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {Promise<any>}
 */
export async function cacheGet(key) {
    const result = await redisCommand('GET', `cache:${key}`);
    if (!result) return null;

    try {
        return JSON.parse(result);
    } catch {
        return result;
    }
}

/**
 * Delete cached value
 * @param {string} key - Cache key
 * @returns {Promise<boolean>}
 */
export async function cacheDel(key) {
    const result = await redisCommand('DEL', `cache:${key}`);
    return result === 1;
}

// ==========================================
// LOCAL FALLBACK (when Redis not configured)
// ==========================================

// In-memory cache for development without Redis
const localCache = new Map();

/**
 * Check if Redis is configured
 * @returns {boolean}
 */
export function isRedisConfigured() {
    const clean = (val) => {
        if (!val) return null;
        return val.replace(/['"]/g, '').replace(/^(export\s+)?[A-Z_]+=\s*/, '').trim();
    };
    const url = clean(process.env.UPSTASH_REDIS_REST_URL || process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL);
    const token = clean(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN);
    return !!(url && token);
}

export default {
    // Session
    storeSession,
    getSession,
    touchSession,
    deleteSession,
    isSessionValid,
    // Presence
    setOnline,
    setOffline,
    getOnlineUsers,
    getOnlineCount,
    // Rate limiting
    checkRateLimit,
    // Queue
    pushToQueue,
    popFromQueue,
    // Cache
    cacheSet,
    cacheGet,
    cacheDel,
    // Utils
    isRedisConfigured,
    redisCommand
};
