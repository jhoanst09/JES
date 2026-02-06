import { NextResponse } from 'next/server';
import redis from '@/src/utils/redis-session';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    let status = 'starting';
    let detail = null;
    let isConfigured = false;

    try {
        isConfigured = redis.isRedisConfigured();
        if (isConfigured) {
            const testKey = `test_${Date.now()}`;
            await redis.cacheSet(testKey, 'PASSED', 10);
            const val = await redis.cacheGet(testKey);
            status = val === 'PASSED' ? 'SUCCESS' : 'MISMATCH';
            detail = { val, testKey };
        }
    } catch (error) {
        status = 'ERROR';
        detail = error.message;
    }

    return NextResponse.json({
        version: 'vfinal_5_no_abort',
        status,
        detail,
        isConfigured,
        cookies: {
            hasAuthToken: !!request.cookies.get('auth_token'),
            tokenValue: request.cookies.get('auth_token')?.value?.substring(0, 10) + '...'
        },
        envCheck: {
            url: (process.env.UPSTASH_REDIS_REST_URL || '').substring(0, 15),
            publicUrl: (process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL || '').substring(0, 15),
            hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
        }
    });
}
