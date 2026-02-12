import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/payments/jes-coins
 * 
 * Pay with JES Coins (internal balance)
 * Instant debit — no external payment gateway
 * 
 * Body: {
 *   userId: string,
 *   type: 'gift' | 'vaca_contribution',
 *   giftId?: string,
 *   bagId?: string,
 *   amount: number,
 * }
 */
export async function POST(request) {
    try {
        const { userId, type, giftId, bagId, amount } = await request.json();

        if (!userId || !amount || !type) {
            return NextResponse.json({ error: 'userId, type, and amount required' }, { status: 400 });
        }

        const result = await db.transaction(async (client) => {
            // Check balance
            const balance = await client.query(
                `SELECT balance FROM user_balance WHERE user_id = $1 FOR UPDATE`,
                [userId]
            );

            const currentBalance = balance.rows[0]?.balance || 0;

            if (parseFloat(currentBalance) < parseFloat(amount)) {
                throw new Error('Saldo insuficiente');
            }

            // Debit balance
            const newBalance = parseFloat(currentBalance) - parseFloat(amount);
            await client.query(
                `UPDATE user_balance SET balance = $1, updated_at = NOW() WHERE user_id = $2`,
                [newBalance, userId]
            );

            // Record transaction
            const referenceId = giftId || bagId;
            await client.query(
                `INSERT INTO balance_transactions (user_id, type, amount, balance_after, reference_id, description)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [userId, type === 'gift' ? 'gift_payment' : 'vaca_contribution', -amount, newBalance, referenceId || null,
                    type === 'gift' ? 'Pago de regalo con JES Coins' : 'Contribución a Vaca con JES Coins']
            );

            // Mark as paid
            if (type === 'gift' && giftId) {
                await client.query(
                    `UPDATE gifts SET status = 'paid', paid_at = NOW(), payment_method = 'jes_coins'
                     WHERE id = $1 AND status = 'pending'`,
                    [giftId]
                );

                // Send notification
                const gift = await client.query('SELECT * FROM gifts WHERE id = $1', [giftId]);
                if (gift.rows[0]) {
                    await client.query(
                        `INSERT INTO notifications (user_id, actor_id, type)
                         VALUES ($1, $2, 'gift_received')`,
                        [gift.rows[0].recipient_id, userId]
                    );
                }

            } else if (type === 'vaca_contribution' && bagId) {
                // Create or update contribution
                await client.query(
                    `INSERT INTO bag_contributions (bag_id, user_id, amount, currency, payment_status)
                     VALUES ($1, $2, $3, 'JES', 'completed')
                     ON CONFLICT DO NOTHING`,
                    [bagId, userId, amount]
                );
            }

            return { newBalance, paid: true };
        });

        return NextResponse.json({
            success: true,
            newBalance: result.newBalance,
            message: 'Pago con JES Coins exitoso ✅'
        });
    } catch (error) {
        console.error('POST /api/payments/jes-coins error:', error);
        const status = error.message === 'Saldo insuficiente' ? 400 : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}

/**
 * GET /api/payments/jes-coins?userId=xxx
 * Get user's JES Coins balance
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        const row = await db.queryOne(
            `SELECT balance FROM user_balance WHERE user_id = $1`,
            [userId]
        );

        return NextResponse.json({ balance: parseFloat(row?.balance || 0) });
    } catch (error) {
        console.error('GET /api/payments/jes-coins error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
