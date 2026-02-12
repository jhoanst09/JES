import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/friends/accept - Accept friend request
 * Updates friendship status + notifies the original requester
 */
export async function POST(request) {
    try {
        const { requestId } = await request.json();

        if (!requestId) {
            return NextResponse.json({ error: 'requestId required' }, { status: 400 });
        }

        // Get the friendship to know who sent it
        const friendship = await db.queryOne(
            `SELECT user_id, friend_id FROM friendships WHERE id = $1 AND status = 'pending'`,
            [requestId]
        );

        if (!friendship) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // Accept it
        await db.query(
            `UPDATE friendships SET status = 'accepted' WHERE id = $1`,
            [requestId]
        );

        // Notify the original sender that their request was accepted
        await db.query(
            `INSERT INTO notifications (user_id, actor_id, type)
             VALUES ($1, $2, 'friend_accepted')`,
            [friendship.user_id, friendship.friend_id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
