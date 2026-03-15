import { NextResponse } from 'next/server';
import { queryOne, queryAll } from '@/src/utils/db/postgres';

/**
 * GET /api/marketplace/wallet?user_id=xxx
 * 
 * Returns:
 * - available_balance: JES Coins balance
 * - pending_escrow: total amount held in active escrow (as seller)
 * - pending_purchases: total amount in escrow (as buyer)
 * - recent_transactions: last 10 balance transactions + escrow events
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');

        if (!userId) {
            return NextResponse.json({ error: 'user_id required' }, { status: 400 });
        }

        // 1. Get available balance
        const balanceRow = await queryOne(
            'SELECT balance FROM user_balance WHERE user_id = $1',
            [userId]
        );
        const availableBalance = parseFloat(balanceRow?.balance || 0);

        // 2. Get pending escrow amounts (as seller - money waiting to be released)
        const sellerEscrow = await queryOne(`
            SELECT COALESCE(SUM(amount - commission_amount), 0) AS total
            FROM transactions_escrow
            WHERE seller_id = $1 AND escrow_status = 'held'
        `, [userId]);

        // 3. Get pending purchases (as buyer - money locked in escrow)
        const buyerEscrow = await queryOne(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM transactions_escrow
            WHERE buyer_id = $1 AND escrow_status IN ('pending_payment', 'held')
        `, [userId]);

        // 4. Get recent balance transactions
        const recentTx = await queryAll(`
            SELECT id, type, amount, balance_after, description, created_at
            FROM balance_transactions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 10
        `, [userId]);

        // 5. Get pending sales (for seller confirmation view)
        const pendingSales = await queryAll(`
            SELECT te.*, 
                   mp.title AS product_title,
                   mp.images AS product_images,
                   bp.name AS buyer_name,
                   bp.avatar_url AS buyer_avatar
            FROM transactions_escrow te
            JOIN marketplace_products mp ON mp.id = te.product_id
            JOIN profiles bp ON bp.id = te.buyer_id
            WHERE te.seller_id = $1 AND te.escrow_status = 'held'
            ORDER BY te.created_at DESC
        `, [userId]);

        return NextResponse.json({
            available_balance: availableBalance,
            pending_escrow: parseFloat(sellerEscrow?.total || 0),
            pending_purchases: parseFloat(buyerEscrow?.total || 0),
            recent_transactions: recentTx,
            pending_sales: pendingSales,
        });
    } catch (error) {
        console.error('Wallet GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
