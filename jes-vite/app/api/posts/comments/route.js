import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/posts/comments - Create a comment or reply
 */
export async function POST(request) {
    try {
        const { postId, userId, content, parentId } = await request.json();

        if (!postId || !userId || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Ensure parent_id column exists for threading
        try {
            await db.query('ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES post_comments(id) ON DELETE CASCADE');
        } catch (e) {
            // Probably already exists or error we can ignore for now if it fails
        }

        const comment = await db.queryOne(
            `INSERT INTO post_comments (post_id, user_id, content, parent_id)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [postId, userId, content, parentId || null]
        );

        // Fetch with author info for immediate UI update
        const fullComment = await db.queryOne(
            `SELECT c.*, pr.name as author_name, pr.avatar_url as author_avatar
             FROM post_comments c
             JOIN profiles pr ON c.user_id = pr.id
             WHERE c.id = $1`,
            [comment.id]
        );

        return NextResponse.json({ comment: fullComment });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
