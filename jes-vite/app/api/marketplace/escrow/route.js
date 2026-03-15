import { NextResponse } from 'next/server';
import { query, queryOne, queryAll, transaction } from '@/src/utils/db/postgres';
import { MARKETPLACE } from '@/src/config/marketplace.config';
import crypto from 'crypto';

/**
 * POST /api/marketplace/escrow
 * 
 * Initiate an escrow transaction.
 * Body: { buyer_id, product_id, currency_type }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { buyer_id, product_id, currency_type = 'FIAT' } = body;

        if (!buyer_id || !product_id) {
            return NextResponse.json(
                { error: 'buyer_id and product_id are required' },
                { status: 400 }
            );
        }

        if (!MARKETPLACE.CURRENCIES.includes(currency_type)) {
            return NextResponse.json(
                { error: `Invalid currency_type. Must be one of: ${MARKETPLACE.CURRENCIES.join(', ')}` },
                { status: 400 }
            );
        }

        // Get the product
        const product = await queryOne(
            'SELECT * FROM marketplace_products WHERE id = $1 AND status = $2',
            [product_id, 'active']
        );

        if (!product) {
            return NextResponse.json({ error: 'Product not found or not active' }, { status: 404 });
        }

        if (product.seller_id === buyer_id) {
            return NextResponse.json({ error: 'Cannot buy your own product' }, { status: 400 });
        }

        if (product.stock <= 0) {
            return NextResponse.json({ error: 'Product out of stock' }, { status: 400 });
        }

        // Determine amount based on currency
        let amount;
        if (currency_type === 'JES_COIN' && product.price_jes_coin) {
            amount = parseFloat(product.price_jes_coin);
        } else {
            amount = parseFloat(product.price_fiat);
        }

        // Calculate commission
        const { commission } = MARKETPLACE.calculateCommission(amount);

        // Generate confirmation code
        const confirmationCode = crypto.randomBytes(16).toString('hex');
        const confirmationHash = crypto.createHash('sha256').update(confirmationCode).digest('hex');

        const escrow = await queryOne(`
            INSERT INTO transactions_escrow 
            (buyer_id, seller_id, product_id, amount, commission_amount, currency_type, escrow_status, confirmation_code_hash)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending_payment', $7)
            RETURNING *
        `, [
            buyer_id, product.seller_id, product_id,
            amount, commission, currency_type, confirmationHash
        ]);

        return NextResponse.json({
            escrow,
            confirmation_code: confirmationCode, // Only returned once — buyer must save this
            commission_info: {
                rate: `${MARKETPLACE.COMMISSION_RATE * 100}%`,
                amount: commission,
                seller_receives: amount - commission,
                message: MARKETPLACE.COMMISSION_MESSAGE
            }
        }, { status: 201 });
    } catch (error) {
        console.error('Escrow POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PATCH /api/marketplace/escrow
 * 
 * Update escrow status.
 * Body: { escrow_id, action, user_id, confirmation_code? }
 * 
 * Actions:
 * - 'hold': Move to held (after payment confirmed)
 * - 'confirm': Buyer confirms receipt (with confirmation_code)
 * - 'complete': Finalize transaction after both parties confirm
 * - 'dispute': Open a dispute
 * - 'cancel': Cancel transaction (before held)
 */
export async function PATCH(request) {
    try {
        const body = await request.json();
        const { escrow_id, action, user_id, confirmation_code } = body;

        if (!escrow_id || !action || !user_id) {
            return NextResponse.json({ error: 'escrow_id, action, and user_id are required' }, { status: 400 });
        }

        const escrow = await queryOne('SELECT * FROM transactions_escrow WHERE id = $1', [escrow_id]);
        if (!escrow) {
            return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
        }

        const isBuyer = escrow.buyer_id === user_id;
        const isSeller = escrow.seller_id === user_id;

        if (!isBuyer && !isSeller) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }

        let updatedEscrow;

        switch (action) {
            case 'hold':
                if (escrow.escrow_status !== 'pending_payment') {
                    return NextResponse.json({ error: 'Can only hold from pending_payment status' }, { status: 400 });
                }
                updatedEscrow = await queryOne(
                    `UPDATE transactions_escrow SET escrow_status = 'held' WHERE id = $1 RETURNING *`,
                    [escrow_id]
                );
                break;

            case 'confirm':
                if (!isBuyer) {
                    return NextResponse.json({ error: 'Only buyer can confirm receipt' }, { status: 403 });
                }
                if (escrow.escrow_status !== 'held') {
                    return NextResponse.json({ error: 'Can only confirm from held status' }, { status: 400 });
                }
                // Verify confirmation code
                if (confirmation_code) {
                    const hash = crypto.createHash('sha256').update(confirmation_code).digest('hex');
                    if (hash !== escrow.confirmation_code_hash) {
                        return NextResponse.json({ error: 'Invalid confirmation code' }, { status: 400 });
                    }
                }
                updatedEscrow = await queryOne(
                    `UPDATE transactions_escrow SET buyer_confirmed = true WHERE id = $1 RETURNING *`,
                    [escrow_id]
                );
                // If both confirmed, auto-complete
                if (updatedEscrow.seller_confirmed) {
                    updatedEscrow = await queryOne(
                        `UPDATE transactions_escrow SET escrow_status = 'completed', completed_at = NOW() WHERE id = $1 RETURNING *`,
                        [escrow_id]
                    );
                }
                break;

            case 'seller_confirm':
                if (!isSeller) {
                    return NextResponse.json({ error: 'Only seller can use seller_confirm' }, { status: 403 });
                }
                updatedEscrow = await queryOne(
                    `UPDATE transactions_escrow SET seller_confirmed = true WHERE id = $1 RETURNING *`,
                    [escrow_id]
                );
                if (updatedEscrow.buyer_confirmed) {
                    updatedEscrow = await queryOne(
                        `UPDATE transactions_escrow SET escrow_status = 'completed', completed_at = NOW() WHERE id = $1 RETURNING *`,
                        [escrow_id]
                    );
                }
                break;

            case 'dispute':
                if (escrow.escrow_status !== 'held') {
                    return NextResponse.json({ error: 'Can only dispute from held status' }, { status: 400 });
                }
                updatedEscrow = await queryOne(
                    `UPDATE transactions_escrow SET escrow_status = 'disputed', notes = COALESCE(notes, '') || $2 WHERE id = $1 RETURNING *`,
                    [escrow_id, `[Disputed by ${isBuyer ? 'buyer' : 'seller'} at ${new Date().toISOString()}] `]
                );
                break;

            case 'cancel':
                if (!['pending_payment'].includes(escrow.escrow_status)) {
                    return NextResponse.json({ error: 'Can only cancel from pending_payment status' }, { status: 400 });
                }
                updatedEscrow = await queryOne(
                    `UPDATE transactions_escrow SET escrow_status = 'cancelled' WHERE id = $1 RETURNING *`,
                    [escrow_id]
                );
                break;

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }

        return NextResponse.json({ escrow: updatedEscrow });
    } catch (error) {
        console.error('Escrow PATCH error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/marketplace/escrow
 * 
 * Get escrow transactions for a user.
 * Params: user_id, role (buyer|seller|all), status
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const role = searchParams.get('role') || 'all';
        const status = searchParams.get('status');

        if (!userId) {
            return NextResponse.json({ error: 'user_id required' }, { status: 400 });
        }

        let sql = `
            SELECT te.*, 
                   mp.title AS product_title, 
                   mp.images AS product_images,
                   bp.name AS buyer_name,
                   sp.name AS seller_name
            FROM transactions_escrow te
            JOIN marketplace_products mp ON mp.id = te.product_id
            JOIN profiles bp ON bp.id = te.buyer_id
            JOIN profiles sp ON sp.id = te.seller_id
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;

        if (role === 'buyer') {
            sql += ` AND te.buyer_id = $${idx}`;
            params.push(userId);
            idx++;
        } else if (role === 'seller') {
            sql += ` AND te.seller_id = $${idx}`;
            params.push(userId);
            idx++;
        } else {
            sql += ` AND (te.buyer_id = $${idx} OR te.seller_id = $${idx})`;
            params.push(userId);
            idx++;
        }

        if (status) {
            sql += ` AND te.escrow_status = $${idx}`;
            params.push(status);
            idx++;
        }

        sql += ' ORDER BY te.created_at DESC';

        const transactions = await queryAll(sql, params);

        return NextResponse.json({ transactions });
    } catch (error) {
        console.error('Escrow GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
