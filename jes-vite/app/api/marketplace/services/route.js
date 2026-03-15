import { NextResponse } from 'next/server';
import { queryOne, queryAll, query } from '@/src/utils/db/postgres';

/**
 * GET /api/marketplace/services?business_id=xxx
 * List services for a business
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get('business_id');

        if (!businessId) {
            return NextResponse.json({ error: 'business_id required' }, { status: 400 });
        }

        const services = await queryAll(`
            SELECT bs.*, 
                   p.name AS business_name,
                   p.avatar_url AS business_avatar
            FROM business_services bs
            JOIN profiles p ON p.id = bs.business_id
            WHERE bs.business_id = $1 AND bs.is_active = true
            ORDER BY bs.created_at DESC
        `, [businessId]);

        return NextResponse.json({ services });
    } catch (error) {
        console.error('Services GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/marketplace/services
 * Create a new service
 * Body: { business_id, name, description, duration_minutes, price, category }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { business_id, name, description, duration_minutes = 60, price, category } = body;

        if (!business_id || !name || price == null) {
            return NextResponse.json({ error: 'business_id, name, and price are required' }, { status: 400 });
        }

        const service = await queryOne(`
            INSERT INTO business_services (business_id, name, description, duration_minutes, price, category)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [business_id, name, description || null, duration_minutes, price, category || null]);

        return NextResponse.json({ service }, { status: 201 });
    } catch (error) {
        console.error('Services POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PATCH /api/marketplace/services
 * Update a service
 * Body: { service_id, business_id, ...fields }
 */
export async function PATCH(request) {
    try {
        const body = await request.json();
        const { service_id, business_id, name, description, duration_minutes, price, category, is_active } = body;

        if (!service_id || !business_id) {
            return NextResponse.json({ error: 'service_id and business_id required' }, { status: 400 });
        }

        const existing = await queryOne('SELECT business_id FROM business_services WHERE id = $1', [service_id]);
        if (!existing || existing.business_id !== business_id) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        const updates = [];
        const values = [];
        let idx = 1;
        const fields = { name, description, duration_minutes, price, category, is_active };
        for (const [key, val] of Object.entries(fields)) {
            if (val !== undefined) {
                updates.push(`${key} = $${idx}`);
                values.push(val);
                idx++;
            }
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        values.push(service_id);
        const service = await queryOne(
            `UPDATE business_services SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        return NextResponse.json({ service });
    } catch (error) {
        console.error('Services PATCH error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
