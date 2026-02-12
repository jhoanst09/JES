import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/webhooks/mercadopago
 * 
 * Receives IPN (Instant Payment Notification) from Mercado Pago.
 * When payment is approved:
 * - For gifts: updates gifts.status = 'paid'
 * - For vacas: updates bag_contributions.payment_status = 'completed'
 * 
 * MP sends: { action, data: { id }, type }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        console.log('🔔 MP Webhook received:', JSON.stringify(body));

        // MP sends different notification types
        if (body.type !== 'payment' && body.action !== 'payment.created' && body.action !== 'payment.updated') {
            return NextResponse.json({ received: true });
        }

        const paymentId = body.data?.id;
        if (!paymentId) {
            return NextResponse.json({ error: 'No payment ID' }, { status: 400 });
        }

        // Fetch full payment details from MP
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!accessToken) {
            return NextResponse.json({ error: 'MP not configured' }, { status: 500 });
        }

        const client = new MercadoPagoConfig({ accessToken });
        const paymentApi = new Payment(client);
        const payment = await paymentApi.get({ id: paymentId });

        console.log(`📦 Payment ${paymentId}: status=${payment.status}, ref=${payment.external_reference}`);

        if (payment.status !== 'approved') {
            // Not approved yet — ignore for now
            return NextResponse.json({ received: true, status: payment.status });
        }

        const extRef = payment.external_reference;
        if (!extRef) {
            return NextResponse.json({ received: true, note: 'no external_reference' });
        }

        // Parse external reference: "gift:uuid" or "vaca:bagId:userId"
        if (extRef.startsWith('gift:')) {
            const giftId = extRef.replace('gift:', '');

            await db.query(
                `UPDATE gifts SET status = 'paid', paid_at = NOW(), payment_id = $1
                 WHERE id = $2 AND status = 'pending'`,
                [paymentId.toString(), giftId]
            );

            console.log(`✅ Gift ${giftId} marked as paid`);

            // Send notification to recipient
            const gift = await db.queryOne('SELECT * FROM gifts WHERE id = $1', [giftId]);
            if (gift) {
                await db.query(
                    `INSERT INTO notifications (user_id, actor_id, type, created_at)
                     VALUES ($1, $2, 'gift_received', NOW())`,
                    [gift.recipient_id, gift.sender_id]
                );
            }

        } else if (extRef.startsWith('vaca:')) {
            const parts = extRef.split(':');
            const bagId = parts[1];
            const userId = parts[2];

            await db.query(
                `UPDATE bag_contributions SET payment_status = 'completed', payment_id = $1
                 WHERE bag_id = $2 AND user_id = $3 AND payment_status = 'pending'`,
                [paymentId.toString(), bagId, userId]
            );

            console.log(`✅ Vaca contribution for bag ${bagId} by user ${userId} completed`);

            // The trigger_update_bag_total in 010_bags.sql will automatically
            // recalculate the bag total and mark as completed if goal reached
        }

        return NextResponse.json({ received: true, processed: true });
    } catch (error) {
        console.error('❌ MP Webhook error:', error);
        // Return 200 anyway so MP doesn't retry infinitely
        return NextResponse.json({ error: error.message }, { status: 200 });
    }
}

/**
 * GET /api/webhooks/mercadopago
 * MP sometimes sends a GET to verify the endpoint exists
 */
export async function GET() {
    return NextResponse.json({ status: 'active' });
}
