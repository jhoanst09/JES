import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';
import { getTokenFromRequest, verifyToken } from '@/src/utils/auth/jwt';

/**
 * DELETE /api/posts/[id] - Delete a post
 */
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const token = getTokenFromRequest(request);
        const decoded = await verifyToken(token);

        if (!decoded?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership
        const post = await db.queryOne('SELECT user_id FROM social_posts WHERE id = $1', [id]);

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        if (post.user_id !== decoded.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Delete cascade: likes, comments, then post
        await db.query('DELETE FROM post_likes WHERE post_id = $1', [id]);
        await db.query('DELETE FROM post_comments WHERE post_id = $1', [id]);
        await db.query('DELETE FROM social_posts WHERE id = $1', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete post error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
