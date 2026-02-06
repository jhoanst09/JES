import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * GET /api/wishlist?userId=xxx
 * POST /api/wishlist - Add item
 * DELETE /api/wishlist - Remove item
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ items: [] });
    }

    const items = await db.queryAll(
        'SELECT * FROM wishlist_items WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
    );

    return NextResponse.json({ items });
}

export async function POST(request) {
    try {
        const { userId, productHandle } = await request.json();

        if (!userId || !productHandle) {
            return NextResponse.json({ error: 'userId and productHandle required' }, { status: 400 });
        }

        await db.query(
            `INSERT INTO wishlist_items (user_id, product_handle)
             VALUES ($1, $2)
             ON CONFLICT (user_id, product_handle) DO NOTHING`,
            [userId, productHandle]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
