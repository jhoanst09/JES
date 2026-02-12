import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/friends/request - Send friend request
 * Creates friendship + notification for the recipient
 */
export async function POST(request) {
    try {
        const { userId, friendId } = await request.json();

        if (!userId || !friendId) {
            return NextResponse.json({ error: 'userId and friendId required' }, { status: 400 });
        }

        // Create friendship
        const result = await db.queryOne(
            `INSERT INTO friendships (user_id, friend_id, status)
             VALUES ($1, $2, 'pending')
             ON CONFLICT (user_id, friend_id) DO NOTHING
             RETURNING id`,
            [userId, friendId]
        );

        // Only create notification if we actually inserted a new request
        if (result?.id) {
            await db.query(
                `INSERT INTO notifications (user_id, actor_id, type)
                 VALUES ($1, $2, 'friend_request')`,
                [friendId, userId]
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
