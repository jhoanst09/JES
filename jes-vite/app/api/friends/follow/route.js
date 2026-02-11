import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/friends/follow - Toggle follow/unfriend a user
 * 
 * If no friendship exists → send friend request (pending)
 * If friendship exists and is accepted → remove (unfriend)
 * If friendship exists and is pending → cancel the request
 */
export async function POST(request) {
    try {
        const { userId, targetUserId } = await request.json();

        if (!userId || !targetUserId) {
            return NextResponse.json({ error: 'userId and targetUserId required' }, { status: 400 });
        }

        if (userId === targetUserId) {
            return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
        }

        // Check if a friendship already exists (in either direction)
        const existing = await db.queryOne(
            `SELECT id, status, user_id, friend_id FROM friendships
             WHERE (user_id = $1 AND friend_id = $2) 
                OR (user_id = $2 AND friend_id = $1)`,
            [userId, targetUserId]
        );

        if (existing) {
            // Already exists → remove it (unfriend or cancel request)
            await db.query(
                'DELETE FROM friendships WHERE id = $1',
                [existing.id]
            );
            return NextResponse.json({
                action: 'unfollowed',
                message: 'Amistad eliminada'
            });
        } else {
            // No friendship → create a pending friend request
            await db.query(
                `INSERT INTO friendships (user_id, friend_id, status)
                 VALUES ($1, $2, 'pending')
                 ON CONFLICT (user_id, friend_id) DO NOTHING`,
                [userId, targetUserId]
            );
            return NextResponse.json({
                action: 'requested',
                message: 'Solicitud enviada'
            });
        }
    } catch (error) {
        console.error('POST /api/friends/follow error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
