import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';
import { getTokenFromRequest, verifyToken } from '@/src/utils/auth/jwt';

/**
 * POST /api/community/join - Join a community or follow a user
 * Handles community membership and social connections
 */
export async function POST(request) {
    try {
        const token = getTokenFromRequest(request);
        const decoded = await verifyToken(token);

        if (!decoded?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { targetUserId, communityId } = await request.json();

        if (!targetUserId && !communityId) {
            return NextResponse.json({ error: 'targetUserId or communityId required' }, { status: 400 });
        }

        // If joining a user (friend request)
        if (targetUserId) {
            // Check if already following
            const existing = await db.queryOne(
                'SELECT id FROM friendships WHERE user_id = $1 AND friend_id = $2',
                [decoded.userId, targetUserId]
            );

            if (existing) {
                return NextResponse.json({ message: 'Already following' });
            }

            // Create friendship
            await db.query(
                'INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, $3)',
                [decoded.userId, targetUserId, 'pending']
            );

            return NextResponse.json({ success: true, message: 'Friend request sent' });
        }

        // If joining a community (future feature)
        if (communityId) {
            // TODO: Implement community join logic when communities table exists
            return NextResponse.json({ message: 'Community join coming soon' }, { status: 501 });
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    } catch (error) {
        console.error('Community join error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
