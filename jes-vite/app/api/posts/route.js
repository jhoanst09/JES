import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * GET /api/posts - Fetch social posts
 * POST /api/posts - Create new post
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');

        const posts = await db.queryAll(
            `SELECT p.*, 
                    pr.name as author_name, 
                    pr.avatar_url as author_avatar,
                    (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
                    (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count
             FROM social_posts p
             JOIN profiles pr ON p.user_id = pr.id
             ORDER BY p.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return NextResponse.json({ posts: posts || [] });
    } catch (error) {
        console.error('Error fetching posts:', error);
        return NextResponse.json({ posts: [], error: 'Database unavailable' });
    }
}

export async function POST(request) {
    try {
        const { userId, content, mediaUrl, mediaType } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        if (!content && !mediaUrl) {
            return NextResponse.json({ error: 'Content or media required' }, { status: 400 });
        }

        const post = await db.queryOne(
            `INSERT INTO social_posts (user_id, content, media_url, media_type)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [userId, content || '', mediaUrl || null, mediaType || null]
        );

        // Fetch with author info
        const fullPost = await db.queryOne(
            `SELECT p.*, pr.name as author_name, pr.avatar_url as author_avatar
             FROM social_posts p
             JOIN profiles pr ON p.user_id = pr.id
             WHERE p.id = $1`,
            [post.id]
        );

        return NextResponse.json({ post: fullPost });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
