/**
 * PostgreSQL Connection (AWS RDS)
 * 
 * Simple connection pool for RDS PostgreSQL.
 * Used by all API routes for database operations.
 */

import { Pool } from 'pg';

// Lazy Redis import to avoid circular deps
let _redisCommand = null;
async function getRedisCommand() {
    if (!_redisCommand) {
        try {
            const redis = await import('@/src/utils/redis-session');
            _redisCommand = redis.default?.redisCommand || redis.redisCommand;
        } catch { _redisCommand = null; }
    }
    return _redisCommand;
}

// Telemetry: slow query threshold in ms
const SLOW_QUERY_THRESHOLD_MS = 50;
const TELEMETRY_KEY = 'telemetry:slow_queries';
const TELEMETRY_MAX_ENTRIES = 500;

// ==========================================
// CONNECTION POOL
// ==========================================

const getConnectionString = () => {
    let url = process.env.DATABASE_URL || '';
    if (url && !url.includes('connect_timeout=')) {
        url += (url.includes('?') ? '&' : '?') + 'connect_timeout=30';
    }
    return url;
};

const pool = new Pool({
    connectionString: getConnectionString(),
    ssl: {
        rejectUnauthorized: false // Required for RDS
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000, // Matching connect_timeout=30
    // Modular schemas: search_path makes tables resolvable without schema prefix
    options: '-c search_path=core,marketplace,wave,biz,academy,public',
});

// Log connection status
pool.on('connect', () => {
    console.log('✅ Connected to RDS PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected PostgreSQL error:', err);
});

// ==========================================
// QUERY HELPERS
// ==========================================

/**
 * Execute a query with parameters
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<{rows: Array, rowCount: number}>}
 */
export async function query(text, params = []) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;

        // Telemetry: log slow queries to Redis (non-blocking)
        if (duration > SLOW_QUERY_THRESHOLD_MS) {
            console.warn(`🐢 Slow query (${duration}ms): ${text.substring(0, 80)}...`);
            logSlowQuery(text, duration, params.length).catch(() => { });
        }

        return result;
    } catch (error) {
        const duration = Date.now() - start;
        console.error(`❌ Query error (${duration}ms):`, error.message);
        logSlowQuery(text, duration, params.length, error.message).catch(() => { });
        throw error;
    }
}

/**
 * Log a slow query to Redis for telemetry dashboard.
 * Fire-and-forget — never blocks the main request.
 */
async function logSlowQuery(sql, durationMs, paramCount, error = null) {
    try {
        const cmd = await getRedisCommand();
        if (!cmd) return;

        const entry = JSON.stringify({
            sql: sql.substring(0, 200),
            duration_ms: durationMs,
            params_count: paramCount,
            error: error || null,
            timestamp: new Date().toISOString(),
        });

        await cmd('LPUSH', TELEMETRY_KEY, entry);
        await cmd('LTRIM', TELEMETRY_KEY, '0', String(TELEMETRY_MAX_ENTRIES - 1));
    } catch {
        // Silently fail — telemetry should never crash the app
    }
}

/**
 * Get a single row
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<object|null>}
 */
export async function queryOne(text, params = []) {
    const result = await query(text, params);
    return result.rows[0] || null;
}

/**
 * Get all rows
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>}
 */
export async function queryAll(text, params = []) {
    const result = await query(text, params);
    return result.rows;
}

/**
 * Execute transaction
 * @param {Function} callback - Async function receiving client
 * @returns {Promise<any>}
 */
export async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// ==========================================
// HEALTH CHECK
// ==========================================

export async function healthCheck() {
    try {
        const result = await query('SELECT NOW()');
        return { ok: true, timestamp: result.rows[0].now };
    } catch (error) {
        return { ok: false, error: error.message };
    }
}

export default {
    query,
    queryOne,
    queryAll,
    transaction,
    healthCheck,
    pool,
};
