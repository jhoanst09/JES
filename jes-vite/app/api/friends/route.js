import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * GET /api/friends?userId=xxx
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ friends: [], requests: [] });
    }

    // Get accepted friends
    const friends = await db.queryAll(
        `SELECT p.* FROM profiles p
         JOIN friendships f ON (f.friend_id = p.id OR f.user_id = p.id)
         WHERE (f.user_id = $1 OR f.friend_id = $1)
         AND f.status = 'accepted'
         AND p.id != $1`,
        [userId]
    );

    // Get pending requests (where current user is the recipient)
    const requestsReceived = await db.queryAll(
        `SELECT p.*, f.id as request_id FROM profiles p
         JOIN friendships f ON f.user_id = p.id
         WHERE f.friend_id = $1 AND f.status = 'pending'`,
        [userId]
    );

    // Get following IDs (accepted)
    const following = friends.map(f => f.id);

    // Get sent requests IDs (pending)
    const sentRequests = await db.queryAll(
        `SELECT friend_id FROM friendships WHERE user_id = $1 AND status = 'pending'`,
        [userId]
    );

    return NextResponse.json({
        friends,
        requests: requestsReceived,
        following,
        sentRequests: sentRequests.map(r => r.friend_id)
    });
}
