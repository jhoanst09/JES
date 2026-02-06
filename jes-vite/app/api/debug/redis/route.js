import { NextResponse } from 'next/server';
import redis from '@/src/utils/redis-session';
import db from '@/src/utils/db/postgres';

/**
 * GET /api/debug/redis
 * 
 * Final Bridge Diagnostic (Hard Reset vFinal)
 * Returns 'PONG' for Redis and 'Connected' for RDS on success.
 */
export async function GET() {
    let redisStatus = 'untested';
    let rdsStatus = 'untested';
    let rawVal = null;

    // 1. Check Redis
    try {
        if (redis.isRedisConfigured()) {
            // Force a fresh check with no-cache in redisCommand
            await redis.cacheSet('ping_test', 'PONG', 60);
            rawVal = await redis.cacheGet('ping_test');
            redisStatus = rawVal === 'PONG' ? 'PONG' : 'failed_to_retrieve';
        } else {
            redisStatus = 'not_configured';
        }
    } catch (error) {
        redisStatus = 'error: ' + error.message;
    }

    // 2. Check RDS (AWS PostgreSQL)
    try {
        const rdsHealth = await db.healthCheck();
        rdsStatus = rdsHealth.ok ? 'Connected' : 'error: ' + rdsHealth.error;
    } catch (err) {
        rdsStatus = 'exception: ' + err.message;
    }

    return NextResponse.json({
        status: (redisStatus === 'PONG' && rdsStatus === 'Connected') ? 'Operational' : 'Partial/Failure',
        redis: redisStatus,
        rds: rdsStatus,
        debug: {
            redisConfigured: redis.isRedisConfigured(),
            env: {
                hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
                hasPubUrl: !!process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL,
                hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
                hasPubToken: !!process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN,
                urlPrefix: (process.env.UPSTASH_REDIS_REST_URL || process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL || '').substring(0, 15)
            }
        }
    });
}
