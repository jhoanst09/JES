import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * GET /api/friends?userId=xxx
 * 
 * Returns friends list, pending requests received, and sent request IDs.
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ friends: [], requests: [], sentRequests: [] });
    }

    try {
        // Get accepted friends (join on users table, not profiles)
        const friends = await db.queryAll(
            `SELECT u.id, u.name, u.username, u.avatar_url, u.email
             FROM users u
             JOIN friendships f ON (f.friend_id = u.id OR f.user_id = u.id)
             WHERE (f.user_id = $1 OR f.friend_id = $1)
             AND f.status = 'accepted'
             AND u.id != $1`,
            [userId]
        );

        // Get pending requests received (where current user is the recipient)
        const requestsReceived = await db.queryAll(
            `SELECT u.id, u.name, u.username, u.avatar_url, f.id as request_id
             FROM users u
             JOIN friendships f ON f.user_id = u.id
             WHERE f.friend_id = $1 AND f.status = 'pending'`,
            [userId]
        );

        // Get sent request IDs (pending requests the user sent)
        const sentRequests = await db.queryAll(
            `SELECT friend_id FROM friendships WHERE user_id = $1 AND status = 'pending'`,
            [userId]
        );

        return NextResponse.json({
            friends,
            requests: requestsReceived,
            following: friends.map(f => f.id),
            sentRequests: sentRequests.map(r => r.friend_id)
        });
    } catch (error) {
        console.error('GET /api/friends error:', error);
        return NextResponse.json({ friends: [], requests: [], sentRequests: [] });
    }
}
