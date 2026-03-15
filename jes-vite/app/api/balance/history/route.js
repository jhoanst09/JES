import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * GET /api/balance/history?user_id=X&limit=20
 * 
 * Returns recent transactions for a user's JES Wallet.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const limit = parseInt(searchParams.get('limit') || '20');

        if (!userId) {
            return NextResponse.json({ error: 'user_id required' }, { status: 400 });
        }

        const transactions = await db.query(
            `SELECT t.id, t.amount, t.description, t.category, t.type, t.created_at
             FROM wave.transactions t
             JOIN wave.accounts a ON t.account_id = a.id
             WHERE a.user_id = $1
             ORDER BY t.created_at DESC
             LIMIT $2`,
            [userId, limit]
        );

        return NextResponse.json({
            transactions: transactions || [],
        });
    } catch (error) {
        console.error('Balance history error:', error);
        // Fallback: try user_balance if wave schema doesn't exist yet
        try {
            const transactions = await db.query(
                `SELECT id, amount, description, type, created_at
                 FROM balance_transactions
                 WHERE user_id = $1
                 ORDER BY created_at DESC
                 LIMIT $2`,
                [userId, limit]
            );
            return NextResponse.json({ transactions: transactions || [] });
        } catch {
            return NextResponse.json({ transactions: [] });
        }
    }
}
