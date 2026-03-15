import { NextResponse } from 'next/server';
import redis from '@/src/utils/redis-session';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/sync/read-state
 * 
 * Batch-flush Redis read states to PostgreSQL.
 * Called by:
 *  - Vercel Cron every 5 minutes
 *  - Client on session logout
 *  - Manual trigger with secret
 * 
 * Scans Redis for all readstate:* keys and upserts into message_read_state.
 */
export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { secret, userId } = body;

        // Auth: either secret or specific userId
        if (secret !== 'jes-migrate-2026' && !userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let keys = [];

        if (userId) {
            // Flush only this user's read states
            const userKeys = await redis.redisCommand('KEYS', `readstate:${userId}:*`);
            keys = userKeys || [];
        } else {
            // Flush ALL read states (cron job)
            const allKeys = await redis.redisCommand('KEYS', 'readstate:*');
            keys = allKeys || [];
        }

        if (keys.length === 0) {
            return NextResponse.json({ synced: 0, message: 'No read states to sync' });
        }

        let synced = 0;
        let errors = 0;

        // Process in batches of 50
        for (let i = 0; i < keys.length; i += 50) {
            const batch = keys.slice(i, i + 50);
            const values = await redis.redisCommand('MGET', ...batch);

            for (let j = 0; j < batch.length; j++) {
                const key = batch[j];
                const messageId = values?.[j];
                if (!messageId) continue;

                // Parse key: readstate:{userId}:{conversationId}
                const parts = key.replace('readstate:', '').split(':');
                if (parts.length < 2) continue;

                const uid = parts[0];
                const convId = parts.slice(1).join(':'); // Handle UUIDs with colons (unlikely but safe)

                try {
                    await db.query(
                        `INSERT INTO message_read_state (user_id, conversation_id, last_read_message_id, synced_at)
                         VALUES ($1, $2, $3, NOW())
                         ON CONFLICT (user_id, conversation_id) 
                         DO UPDATE SET last_read_message_id = $3, synced_at = NOW()`,
                        [uid, convId, messageId]
                    );
                    synced++;
                } catch (err) {
                    errors++;
                    console.error(`[ReadState Sync] Error for ${uid}:${convId}:`, err.message);
                }
            }
        }

        return NextResponse.json({
            success: true,
            synced,
            errors,
            total_keys: keys.length,
        });
    } catch (error) {
        console.error('[ReadState Sync] Fatal error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
