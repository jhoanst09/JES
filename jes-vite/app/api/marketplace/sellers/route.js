import { NextResponse } from 'next/server';
import { queryOne, query } from '@/src/utils/db/postgres';

/**
 * GET /api/marketplace/sellers
 * 
 * Check seller verification status.
 * Params: user_id
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');

        if (!userId) {
            return NextResponse.json({ error: 'user_id required' }, { status: 400 });
        }

        const verification = await queryOne(
            'SELECT * FROM sellers_verification WHERE user_id = $1',
            [userId]
        );

        return NextResponse.json({
            verification: verification || { user_id: userId, status: 'unverified' }
        });
    } catch (error) {
        console.error('Sellers GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/marketplace/sellers
 * 
 * Submit verification request.
 * Body: { user_id, document_url }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { user_id, document_url } = body;

        if (!user_id || !document_url) {
            return NextResponse.json(
                { error: 'user_id and document_url are required' },
                { status: 400 }
            );
        }

        // Upsert — update if already exists, insert otherwise
        const verification = await queryOne(`
            INSERT INTO sellers_verification (user_id, document_url, status)
            VALUES ($1, $2, 'pending')
            ON CONFLICT (user_id) 
            DO UPDATE SET document_url = $2, status = 'pending', updated_at = NOW()
            RETURNING *
        `, [user_id, document_url]);

        return NextResponse.json({ verification }, { status: 201 });
    } catch (error) {
        console.error('Sellers POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PATCH /api/marketplace/sellers
 * 
 * Admin: Approve or reject seller verification.
 * Body: { user_id, action (approve|reject), reviewed_by, rejection_reason? }
 */
export async function PATCH(request) {
    try {
        const body = await request.json();
        const { user_id, action, reviewed_by, rejection_reason } = body;

        if (!user_id || !action || !reviewed_by) {
            return NextResponse.json(
                { error: 'user_id, action, and reviewed_by are required' },
                { status: 400 }
            );
        }

        if (!['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
        }

        const newStatus = action === 'approve' ? 'verified' : 'rejected';

        const verification = await queryOne(`
            UPDATE sellers_verification 
            SET status = $1, 
                verification_date = ${action === 'approve' ? 'NOW()' : 'NULL'},
                reviewed_by = $2,
                rejection_reason = $3,
                updated_at = NOW()
            WHERE user_id = $4
            RETURNING *
        `, [newStatus, reviewed_by, rejection_reason || null, user_id]);

        if (!verification) {
            return NextResponse.json({ error: 'Verification record not found' }, { status: 404 });
        }

        return NextResponse.json({ verification });
    } catch (error) {
        console.error('Sellers PATCH error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
