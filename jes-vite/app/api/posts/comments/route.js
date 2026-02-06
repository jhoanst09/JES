import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/posts/comments - Create a comment or reply
 * If parentId is provided, creates a reply and generates notification
 */
export async function POST(request) {
    try {
        const { postId, userId, content, parentId } = await request.json();

        if (!postId || !userId || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Insert comment with optional parent_id
        const comment = await db.queryOne(
            `INSERT INTO post_comments (post_id, user_id, content, parent_id)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [postId, userId, content, parentId || null]
        );

        // If this is a reply, create notification for parent comment author
        if (parentId) {
            const parentComment = await db.queryOne(
                'SELECT user_id FROM post_comments WHERE id = $1',
                [parentId]
            );

            // Only notify if replying to someone else (not yourself)
            if (parentComment && parentComment.user_id !== userId) {
                await db.query(
                    `INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [parentComment.user_id, userId, 'comment_reply', postId, comment.id]
                );
            }
        }

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
        console.error('Comment creation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
