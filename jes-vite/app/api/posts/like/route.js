import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/posts/like - Toggle like on post
 */
export async function POST(request) {
    try {
        const { postId, userId } = await request.json();

        if (!postId || !userId) {
            return NextResponse.json({ error: 'postId and userId required' }, { status: 400 });
        }

        // Check if already liked
        const existing = await db.queryOne(
            'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
            [postId, userId]
        );

        if (existing) {
            // Unlike
            await db.query('DELETE FROM post_likes WHERE id = $1', [existing.id]);
            return NextResponse.json({ liked: false });
        } else {
            // Like
            await db.query(
                'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)',
                [postId, userId]
            );
            return NextResponse.json({ liked: true });
        }
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
