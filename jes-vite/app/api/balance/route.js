import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * GET /api/balance?user_id=X
 * 
 * Returns user's JES Coins balance.
 * Auto-creates a balance row if the user doesn't have one yet.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');

        if (!userId) {
            return NextResponse.json({ error: 'user_id required' }, { status: 400 });
        }

        // Try to get existing balance
        let balance = await db.queryOne(
            'SELECT balance, currency, updated_at FROM user_balance WHERE user_id = $1',
            [userId]
        );

        // Auto-create if missing
        if (!balance) {
            balance = await db.queryOne(
                `INSERT INTO user_balance (user_id, balance, currency) 
                 VALUES ($1, 0, 'JES') 
                 ON CONFLICT (user_id) DO NOTHING
                 RETURNING balance, currency, updated_at`,
                [userId]
            );
            // If ON CONFLICT hit (race condition), fetch it
            if (!balance) {
                balance = await db.queryOne(
                    'SELECT balance, currency, updated_at FROM user_balance WHERE user_id = $1',
                    [userId]
                );
            }
        }

        return NextResponse.json({
            balance: parseFloat(balance?.balance || 0),
            currency: balance?.currency || 'JES',
            updated_at: balance?.updated_at
        });
    } catch (error) {
        console.error('Balance GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
