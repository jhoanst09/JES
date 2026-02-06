/**
 * PostgreSQL Connection (AWS RDS)
 * 
 * Simple connection pool for RDS PostgreSQL.
 * Used by all API routes for database operations.
 */

import { Pool } from 'pg';

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
        console.log(`📊 Query executed in ${duration}ms`);
        return result;
    } catch (error) {
        console.error('❌ Query error:', error.message);
        throw error;
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
