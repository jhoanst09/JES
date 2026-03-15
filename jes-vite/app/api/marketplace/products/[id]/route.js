import { NextResponse } from 'next/server';
import { queryOne, query } from '@/src/utils/db/postgres';

/**
 * GET /api/marketplace/products/[id]
 * Fetch a single product with seller info
 */
export async function GET(request, { params }) {
    try {
        const { id } = await params;

        const product = await queryOne(`
            SELECT mp.*, 
                   p.name AS seller_name, 
                   p.avatar_url AS seller_avatar,
                   p.username AS seller_username,
                   sv.status AS seller_verification_status
            FROM marketplace_products mp
            JOIN profiles p ON p.id = mp.seller_id
            LEFT JOIN sellers_verification sv ON sv.user_id = mp.seller_id
            WHERE mp.id = $1
        `, [id]);

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        return NextResponse.json({ product });
    } catch (error) {
        console.error('Product GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PATCH /api/marketplace/products/[id]
 * Update a product (only by seller)
 */
export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { seller_id, title, description, price_fiat, price_jes_coin, stock, category_tags, images, status, condition, location } = body;

        if (!seller_id) {
            return NextResponse.json({ error: 'seller_id required for authorization' }, { status: 400 });
        }

        // Verify ownership
        const existing = await queryOne('SELECT seller_id FROM marketplace_products WHERE id = $1', [id]);
        if (!existing) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
        if (existing.seller_id !== seller_id) {
            return NextResponse.json({ error: 'Not authorized to edit this product' }, { status: 403 });
        }

        // Build dynamic update
        const updates = [];
        const values = [];
        let idx = 1;

        const fields = { title, description, price_fiat, price_jes_coin, stock, status, condition, location };
        for (const [key, val] of Object.entries(fields)) {
            if (val !== undefined) {
                updates.push(`${key} = $${idx}`);
                values.push(val);
                idx++;
            }
        }

        if (category_tags !== undefined) {
            updates.push(`category_tags = $${idx}::jsonb`);
            values.push(JSON.stringify(category_tags));
            idx++;
        }

        if (images !== undefined) {
            updates.push(`images = $${idx}::jsonb`);
            values.push(JSON.stringify(images));
            idx++;
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        values.push(id);
        const product = await queryOne(`
            UPDATE marketplace_products SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *
        `, values);

        return NextResponse.json({ product });
    } catch (error) {
        console.error('Product PATCH error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/marketplace/products/[id]
 * Soft-delete: set status to 'paused'
 */
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const sellerId = searchParams.get('seller_id');

        if (!sellerId) {
            return NextResponse.json({ error: 'seller_id required' }, { status: 400 });
        }

        const existing = await queryOne('SELECT seller_id FROM marketplace_products WHERE id = $1', [id]);
        if (!existing) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
        if (existing.seller_id !== sellerId) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        await query('UPDATE marketplace_products SET status = $1 WHERE id = $2', ['paused', id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Product DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
