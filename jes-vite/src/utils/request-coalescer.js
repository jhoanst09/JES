/**
 * Request Coalescer — Discord-style Data Service Layer
 * 
 * Deduplicates identical database queries within a 100ms window.
 * If multiple requests ask for the same data simultaneously,
 * only ONE query hits PostgreSQL; all subscribers receive the same result.
 * 
 * Two layers:
 * 1. In-memory Map (same serverless invocation)
 * 2. Redis cache (cross-invocation, with TTL)
 */

import { cacheGet, cacheSet } from './redis-session';

// ==========================================
// IN-MEMORY COALESCING (same invocation)
// ==========================================

// Map<key, { promise, timestamp }>
const inflightRequests = new Map();
const COALESCE_WINDOW_MS = 100;

// Cleanup stale entries every 10s
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of inflightRequests) {
            if (now - entry.timestamp > 5000) {
                inflightRequests.delete(key);
            }
        }
    }, 10000);
}

/**
 * Execute a query with coalescing.
 * If another request for the same `key` is already in-flight (within 100ms window),
 * the caller piggybacks on the existing promise instead of hitting the DB again.
 * 
 * @param {string} key - Unique key for this query (e.g., 'mp_feed:userId:offset')
 * @param {Function} queryFn - Async function that performs the actual DB query
 * @param {object} options - { cacheTtl: seconds to cache in Redis, skipCache: bool }
 * @returns {Promise<any>} Query result
 */
export async function coalescedQuery(key, queryFn, options = {}) {
    const { cacheTtl = 0, skipCache = false } = options;

    // Layer 1: Check Redis cache first (if caching enabled)
    if (cacheTtl > 0 && !skipCache) {
        try {
            const cached = await cacheGet(`coalesce:${key}`);
            if (cached !== null) {
                return cached;
            }
        } catch {
            // Redis unavailable, proceed to DB
        }
    }

    // Layer 2: Check in-memory inflight map
    const existing = inflightRequests.get(key);
    if (existing && (Date.now() - existing.timestamp < COALESCE_WINDOW_MS)) {
        // Piggyback on existing request
        return existing.promise;
    }

    // No inflight request — execute the query
    const promise = executeAndCache(key, queryFn, cacheTtl);
    inflightRequests.set(key, { promise, timestamp: Date.now() });

    try {
        const result = await promise;
        return result;
    } finally {
        // Clean up after resolution (with small delay for stragglers)
        setTimeout(() => inflightRequests.delete(key), COALESCE_WINDOW_MS);
    }
}

/**
 * Execute query and optionally cache the result in Redis.
 */
async function executeAndCache(key, queryFn, cacheTtl) {
    const result = await queryFn();

    // Cache in Redis if TTL specified
    if (cacheTtl > 0 && result !== null && result !== undefined) {
        cacheSet(`coalesce:${key}`, result, cacheTtl).catch(() => { });
    }

    return result;
}

/**
 * Invalidate a cached coalesced query.
 * Call this when data changes (e.g., new post created, product updated).
 * 
 * @param {string} key - Cache key to invalidate
 */
export async function invalidateCoalesced(key) {
    inflightRequests.delete(key);
    try {
        const { cacheDel } = await import('./redis-session');
        await cacheDel(`coalesce:${key}`);
    } catch {
        // Non-critical
    }
}

export default { coalescedQuery, invalidateCoalesced };
