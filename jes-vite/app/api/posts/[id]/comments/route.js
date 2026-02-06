import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * GET /api/posts/[postId]/comments - Fetch comments for a post
 */
export async function GET(request, { params }) {
    try {
        const { id: postId } = await params;

        // Fetch comments with author info
        // Ordered by date, replies will be nested in the frontend or we can do it here
        const comments = await db.queryAll(
            `SELECT c.*, pr.name as author_name, pr.avatar_url as author_avatar
             FROM post_comments c
             JOIN profiles pr ON c.user_id = pr.id
             WHERE c.post_id = $1
             ORDER BY c.created_at ASC`,
            [postId]
        );

        return NextResponse.json({ comments: comments || [] });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
