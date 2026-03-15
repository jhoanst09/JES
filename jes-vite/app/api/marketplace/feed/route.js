import { NextResponse } from 'next/server';
import { queryAll, queryOne } from '@/src/utils/db/postgres';
import { coalescedQuery } from '@/src/utils/request-coalescer';
import { cacheGet, cacheSet } from '@/src/utils/redis-session';

const SELLER_CACHE_TTL = 300; // 5 minutes

/**
 * GET /api/marketplace/feed
 * 
 * Personalized marketplace feed for "Para ti".
 * 
 * Optimization: Products fetched WITHOUT profiles JOIN.
 * Seller data (name, avatar, username) enriched from Redis cache.
 * Cache misses batch-fetched from PostgreSQL and cached for 5 min.
 * 
 * Coalescing window: 100ms. Feed cached 30s in Redis.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 30);
        const offset = parseInt(searchParams.get('offset') || '0');

        const cacheKey = userId
            ? `mp_feed:${userId}:${limit}:${offset}`
            : `mp_feed:anon:${limit}:${offset}`;

        const result = await coalescedQuery(cacheKey, async () => {
            let products = [];

            // === STEP 1: Fetch products WITHOUT JOIN ===
            if (userId) {
                const user = await queryOne(
                    'SELECT interest_tags, occupation FROM profiles WHERE id = $1',
                    [userId]
                );

                const tags = user?.interest_tags || [];

                if (Array.isArray(tags) && tags.length > 0) {
                    products = await queryAll(`
                        SELECT mp.*
                        FROM marketplace_products mp
                        WHERE mp.status = 'active'
                          AND mp.seller_id != $1
                          AND mp.category_tags ?| $2::text[]
                        ORDER BY mp.created_at DESC
                        LIMIT $3 OFFSET $4
                    `, [userId, tags, limit, offset]);
                }
            }

            // Fallback: fill remaining slots
            if (products.length < limit) {
                const remaining = limit - products.length;
                const existingIds = products.map(p => p.id);

                let fallbackSql = `
                    SELECT mp.*
                    FROM marketplace_products mp
                    WHERE mp.status = 'active'
                `;
                const params = [];
                let idx = 1;

                if (existingIds.length > 0) {
                    fallbackSql += ` AND mp.id != ALL($${idx}::uuid[])`;
                    params.push(existingIds);
                    idx++;
                }

                if (userId) {
                    fallbackSql += ` AND mp.seller_id != $${idx}`;
                    params.push(userId);
                    idx++;
                }

                fallbackSql += ` ORDER BY mp.created_at DESC LIMIT $${idx}`;
                params.push(remaining);

                const fallback = await queryAll(fallbackSql, params);
                products = [...products, ...fallback];
            }

            // === STEP 2: Enrich with seller data from Redis cache ===
            const sellerIds = [...new Set(products.map(p => p.seller_id).filter(Boolean))];
            const sellerMap = await getSellersBatch(sellerIds);

            const enriched = products.map(p => ({
                ...p,
                seller_name: sellerMap[p.seller_id]?.name || null,
                seller_avatar: sellerMap[p.seller_id]?.avatar_url || null,
                seller_username: sellerMap[p.seller_id]?.username || null,
            }));

            return {
                products: enriched,
                personalized: enriched.length > 0 && !!userId,
            };
        }, { cacheTtl: 30 });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Marketplace feed GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Batch-fetch seller profiles: Redis first, PostgreSQL fallback.
 * Writes misses back to Redis for future requests.
 * 
 * @param {string[]} sellerIds 
 * @returns {Promise<object>} { sellerId: { name, avatar_url, username }, ... }
 */
async function getSellersBatch(sellerIds) {
    if (!sellerIds.length) return {};

    const result = {};
    const missIds = [];

    // Check Redis cache for each seller
    for (const id of sellerIds) {
        try {
            const cached = await cacheGet(`seller:${id}`);
            if (cached) {
                result[id] = cached;
            } else {
                missIds.push(id);
            }
        } catch {
            missIds.push(id);
        }
    }

    // Batch-fetch misses from PostgreSQL
    if (missIds.length > 0) {
        try {
            const sellers = await queryAll(
                `SELECT id, name, avatar_url, username FROM profiles WHERE id = ANY($1::uuid[])`,
                [missIds]
            );

            for (const seller of sellers) {
                result[seller.id] = {
                    name: seller.name,
                    avatar_url: seller.avatar_url,
                    username: seller.username,
                };
                // Write to Redis cache (non-blocking)
                cacheSet(`seller:${seller.id}`, result[seller.id], SELLER_CACHE_TTL).catch(() => { });
            }
        } catch (err) {
            console.error('[SellerCache] DB fallback error:', err.message);
        }
    }

    return result;
}


