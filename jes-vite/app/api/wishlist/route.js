import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * GET /api/wishlist?userId=xxx
 * POST /api/wishlist - Toggle liked/private flags independently
 * DELETE /api/wishlist - Remove item entirely
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ items: [] });
    }

    try {
        const items = await db.queryAll(
            `SELECT product_handle, 
                    COALESCE(is_private, false) as is_private, 
                    COALESCE(is_liked, false) as is_liked 
             FROM wishlist_items 
             WHERE user_id = $1`,
            [userId]
        );
        return NextResponse.json({ items });
    } catch (error) {
        console.error('Wishlist GET error:', error);
        return NextResponse.json({ items: [], error: error.message }, { status: 200 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, productHandle } = body;

        if (!userId || !productHandle) {
            return NextResponse.json({ error: 'userId and productHandle required' }, { status: 400 });
        }

        // Determine which flag to update
        // API accepts: { isLiked: true/false } and/or { isPrivate: true/false }
        const hasLiked = 'isLiked' in body;
        const hasPrivate = 'isPrivate' in body;

        if (hasLiked && hasPrivate) {
            // Update both flags
            await db.query(
                `INSERT INTO wishlist_items (user_id, product_handle, is_liked, is_private)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id, product_handle) DO UPDATE SET is_liked = $3, is_private = $4`,
                [userId, productHandle, body.isLiked, body.isPrivate]
            );
        } else if (hasLiked) {
            // Only update is_liked, preserve is_private
            await db.query(
                `INSERT INTO wishlist_items (user_id, product_handle, is_liked, is_private)
                 VALUES ($1, $2, $3, false)
                 ON CONFLICT (user_id, product_handle) DO UPDATE SET is_liked = $3`,
                [userId, productHandle, body.isLiked]
            );
        } else if (hasPrivate) {
            // Only update is_private, preserve is_liked
            await db.query(
                `INSERT INTO wishlist_items (user_id, product_handle, is_private, is_liked)
                 VALUES ($1, $2, $3, false)
                 ON CONFLICT (user_id, product_handle) DO UPDATE SET is_private = $3`,
                [userId, productHandle, body.isPrivate]
            );
        }

        // Auto-cleanup: if both flags are false, delete the row
        await db.query(
            `DELETE FROM wishlist_items 
             WHERE user_id = $1 AND product_handle = $2 
             AND COALESCE(is_liked, false) = false 
             AND COALESCE(is_private, false) = false`,
            [userId, productHandle]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Wishlist POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { userId, productHandle } = await request.json();

        if (!userId || !productHandle) {
            return NextResponse.json({ error: 'userId and productHandle required' }, { status: 400 });
        }

        await db.query(
            'DELETE FROM wishlist_items WHERE user_id = $1 AND product_handle = $2',
            [userId, productHandle]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Wishlist DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
