import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/friends/request - Send friend request
 */
export async function POST(request) {
    try {
        const { userId, friendId } = await request.json();

        if (!userId || !friendId) {
            return NextResponse.json({ error: 'userId and friendId required' }, { status: 400 });
        }

        await db.query(
            `INSERT INTO friendships (user_id, friend_id, status)
             VALUES ($1, $2, 'pending')
             ON CONFLICT (user_id, friend_id) DO NOTHING`,
            [userId, friendId]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
