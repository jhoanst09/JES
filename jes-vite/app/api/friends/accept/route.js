import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/friends/accept - Accept friend request
 */
export async function POST(request) {
    try {
        const { requestId } = await request.json();

        if (!requestId) {
            return NextResponse.json({ error: 'requestId required' }, { status: 400 });
        }

        await db.query(
            `UPDATE friendships SET status = 'accepted' WHERE id = $1`,
            [requestId]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
