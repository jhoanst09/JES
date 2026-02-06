import { NextResponse } from 'next/server';

/**
 * POST /api/auth/sync-redis
 * 
 * Background Redis sync for auth.
 * Called by AuthContext after SIGNED_IN.
 * Non-blocking, fire-and-forget from client.
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export async function POST(request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId || !REDIS_URL || !REDIS_TOKEN) {
            return NextResponse.json({ ok: true });
        }

        // Store session marker in Redis
        await fetch(REDIS_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${REDIS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([
                'SET',
                `session:${userId}`,
                JSON.stringify({
                    active: true,
                    last_seen: Date.now()
                }),
                'EX',
                604800 // 7 days
            ])
        });

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('Redis sync error:', error);
        return NextResponse.json({ ok: true }); // Always return ok
    }
}
