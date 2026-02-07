import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';
import { getTokenFromRequest, verifyToken } from '@/src/utils/auth/jwt';

/**
 * GET /api/cart - Fetch cart items for current user
 */
export async function GET(request) {
    try {
        const token = getTokenFromRequest(request);
        const decoded = await verifyToken(token);

        if (!decoded?.userId) {
            return NextResponse.json({ items: [] });
        }

        const items = await db.queryAll(
            `SELECT product_handle, quantity, added_at 
             FROM cart_items 
             WHERE user_id = $1 
             ORDER BY added_at DESC`,
            [decoded.userId]
        );

        return NextResponse.json({ items: items || [] });
    } catch (error) {
        console.error('Cart GET error:', error);
        return NextResponse.json({ items: [] });
    }
}

/**
 * POST /api/cart - Add or update cart item
 */
export async function POST(request) {
    try {
        const token = getTokenFromRequest(request);
        const decoded = await verifyToken(token);

        if (!decoded?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { productHandle, quantity = 1 } = await request.json();

        if (!productHandle) {
            return NextResponse.json({ error: 'productHandle required' }, { status: 400 });
        }

        // Upsert: add new or increment existing quantity
        await db.query(
            `INSERT INTO cart_items (user_id, product_handle, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, product_handle)
             DO UPDATE SET 
                quantity = cart_items.quantity + $3,
                updated_at = NOW()`,
            [decoded.userId, productHandle, quantity]
        );

        // Get updated cart count
        const countResult = await db.queryOne(
            'SELECT SUM(quantity) as count FROM cart_items WHERE user_id = $1',
            [decoded.userId]
        );

        return NextResponse.json({
            success: true,
            cartCount: parseInt(countResult?.count || 0)
        });
    } catch (error) {
        console.error('Cart POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/cart - Remove item or clear cart
 */
export async function DELETE(request) {
    try {
        const token = getTokenFromRequest(request);
        const decoded = await verifyToken(token);

        if (!decoded?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { productHandle, clearAll } = await request.json();

        if (clearAll) {
            // Clear entire cart
            await db.query('DELETE FROM cart_items WHERE user_id = $1', [decoded.userId]);
        } else if (productHandle) {
            // Remove specific item
            await db.query(
                'DELETE FROM cart_items WHERE user_id = $1 AND product_handle = $2',
                [decoded.userId, productHandle]
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Cart DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
