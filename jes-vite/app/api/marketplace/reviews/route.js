import { NextResponse } from 'next/server';
import { queryOne, queryAll } from '@/src/utils/db/postgres';

/**
 * GET /api/marketplace/reviews?product_id=xxx | service_id=xxx | user_id=xxx
 * Get reviews + recommendation percentage
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('product_id');
        const serviceId = searchParams.get('service_id');
        const userId = searchParams.get('user_id');

        let sql, params;

        if (productId) {
            sql = `
                SELECT mr.*, p.name AS reviewer_name, p.avatar_url AS reviewer_avatar
                FROM marketplace_reviews mr
                JOIN profiles p ON p.id = mr.user_id
                WHERE mr.product_id = $1
                ORDER BY mr.created_at DESC
            `;
            params = [productId];
        } else if (serviceId) {
            sql = `
                SELECT mr.*, p.name AS reviewer_name, p.avatar_url AS reviewer_avatar
                FROM marketplace_reviews mr
                JOIN profiles p ON p.id = mr.user_id
                WHERE mr.service_id = $1
                ORDER BY mr.created_at DESC
            `;
            params = [serviceId];
        } else if (userId) {
            sql = `
                SELECT mr.*, 
                       mp.title AS product_title,
                       bs.name AS service_name
                FROM marketplace_reviews mr
                LEFT JOIN marketplace_products mp ON mp.id = mr.product_id
                LEFT JOIN business_services bs ON bs.id = mr.service_id
                WHERE mr.user_id = $1
                ORDER BY mr.created_at DESC
            `;
            params = [userId];
        } else {
            return NextResponse.json({ error: 'product_id, service_id, or user_id required' }, { status: 400 });
        }

        const reviews = await queryAll(sql, params);

        // Calculate recommendation stats
        const total = reviews.length;
        const positive = reviews.filter(r => r.recommended).length;
        const percentage = total > 0 ? Math.round((positive / total) * 100) : 0;

        return NextResponse.json({
            reviews,
            stats: {
                total,
                positive,
                negative: total - positive,
                percentage,
            }
        });
    } catch (error) {
        console.error('Reviews GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/marketplace/reviews
 * Submit a review (thumbs up/down)
 * Body: { user_id, product_id?, service_id?, recommended, comment? }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { user_id, product_id, service_id, recommended, comment } = body;

        if (!user_id || recommended == null) {
            return NextResponse.json({ error: 'user_id and recommended are required' }, { status: 400 });
        }

        if (!product_id && !service_id) {
            return NextResponse.json({ error: 'product_id or service_id is required' }, { status: 400 });
        }

        const review = await queryOne(`
            INSERT INTO marketplace_reviews (user_id, product_id, service_id, recommended, comment)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT ON CONSTRAINT ${product_id ? 'unique_product_review' : 'unique_service_review'}
            DO UPDATE SET recommended = $4, comment = $5
            RETURNING *
        `, [user_id, product_id || null, service_id || null, recommended, comment || null]);

        return NextResponse.json({ review }, { status: 201 });
    } catch (error) {
        console.error('Reviews POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
