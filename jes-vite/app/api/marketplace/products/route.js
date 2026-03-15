import { NextResponse } from 'next/server';
import { query, queryAll, queryOne } from '@/src/utils/db/postgres';
import { MARKETPLACE } from '@/src/config/marketplace.config';
import { publishProductEvent } from '@/src/utils/marketplace-redis';

/**
 * GET /api/marketplace/products
 * 
 * List marketplace products with optional filters.
 * Params: status, category, seller_id, search, limit, offset
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'active';
        const category = searchParams.get('category');
        const sellerId = searchParams.get('seller_id');
        const search = searchParams.get('search');
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
        const offset = parseInt(searchParams.get('offset') || '0');

        let sql = `
            SELECT mp.*, 
                   p.name AS seller_name, 
                   p.avatar_url AS seller_avatar,
                   p.username AS seller_username
            FROM marketplace_products mp
            JOIN profiles p ON p.id = mp.seller_id
            WHERE mp.status = $1
        `;
        const params = [status];
        let paramIndex = 2;

        if (category) {
            sql += ` AND mp.category_tags @> $${paramIndex}::jsonb`;
            params.push(JSON.stringify([category]));
            paramIndex++;
        }

        if (sellerId) {
            sql += ` AND mp.seller_id = $${paramIndex}`;
            params.push(sellerId);
            paramIndex++;
        }

        if (search) {
            sql += ` AND (mp.title ILIKE $${paramIndex} OR mp.description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        sql += ` ORDER BY mp.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const products = await queryAll(sql, params);

        // Get total count for pagination
        let countSql = `SELECT COUNT(*) FROM marketplace_products WHERE status = $1`;
        const countParams = [status];
        const countResult = await queryOne(countSql, countParams);

        return NextResponse.json({
            products,
            total: parseInt(countResult?.count || '0'),
            limit,
            offset
        });
    } catch (error) {
        console.error('Marketplace products GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/marketplace/products
 * 
 * Create a new product listing.
 * Body: { seller_id, title, description, price_fiat, price_jes_coin, stock, category_tags, images, condition, location }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const {
            seller_id, title, description,
            price_fiat, price_jes_coin,
            stock = 1, category_tags = [], images = [],
            condition = 'new', location
        } = body;

        if (!seller_id || !title || price_fiat == null) {
            return NextResponse.json(
                { error: 'seller_id, title, and price_fiat are required' },
                { status: 400 }
            );
        }

        if (price_fiat < 0) {
            return NextResponse.json(
                { error: 'Price must be positive' },
                { status: 400 }
            );
        }

        const product = await queryOne(`
            INSERT INTO marketplace_products 
            (seller_id, title, description, price_fiat, price_jes_coin, stock, category_tags, images, condition, location)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
            RETURNING *
        `, [
            seller_id, title, description || null,
            price_fiat, price_jes_coin || null,
            stock, JSON.stringify(category_tags), JSON.stringify(images),
            condition, location || null
        ]);

        // Emit Redis event for interested users (non-blocking)
        publishProductEvent(product).catch(err =>
            console.error('Redis product event error (non-blocking):', err.message)
        );

        return NextResponse.json({ product }, { status: 201 });
    } catch (error) {
        console.error('Marketplace products POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
