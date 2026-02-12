import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/gifts
 * Create a gift record (pending payment)
 * Body: { senderId, recipientId, productHandle, productTitle, productImage, amount, currency, message?, bagId? }
 */
export async function POST(request) {
    try {
        const {
            senderId,
            recipientId,
            productHandle,
            productTitle,
            productImage,
            amount,
            currency = 'COP',
            message,
            bagId
        } = await request.json();

        if (!senderId || !recipientId || !productHandle || !amount) {
            return NextResponse.json({ error: 'senderId, recipientId, productHandle, and amount required' }, { status: 400 });
        }

        // Generate external reference for payment matching
        const externalRef = `gift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const gift = await db.queryOne(
            `INSERT INTO gifts (sender_id, recipient_id, product_handle, product_title, product_image, amount, currency, payment_external_ref, bag_id, message)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [senderId, recipientId, productHandle, productTitle || '', productImage || '', amount, currency, externalRef, bagId || null, message || null]
        );

        return NextResponse.json({ gift }, { status: 201 });
    } catch (error) {
        console.error('POST /api/gifts error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/gifts?userId=xxx&type=sent|received
 * List gifts for a user
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const type = searchParams.get('type') || 'all';

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        let whereClause;
        if (type === 'sent') {
            whereClause = 'g.sender_id = $1';
        } else if (type === 'received') {
            whereClause = 'g.recipient_id = $1';
        } else {
            whereClause = '(g.sender_id = $1 OR g.recipient_id = $1)';
        }

        const gifts = await db.queryAll(
            `SELECT g.*, 
                    s.name AS sender_name, s.avatar_url AS sender_avatar,
                    r.name AS recipient_name, r.avatar_url AS recipient_avatar
             FROM gifts g
             JOIN users s ON s.id = g.sender_id
             JOIN users r ON r.id = g.recipient_id
             WHERE ${whereClause}
             ORDER BY g.created_at DESC
             LIMIT 50`,
            [userId]
        );

        return NextResponse.json({ gifts });
    } catch (error) {
        console.error('GET /api/gifts error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
