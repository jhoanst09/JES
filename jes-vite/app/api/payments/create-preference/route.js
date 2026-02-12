import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/payments/create-preference
 * 
 * Creates a Mercado Pago payment preference for:
 * 1. Direct gifts (gift_id)
 * 2. Vaca contributions (bag_id + user_id)
 * 
 * Body: {
 *   type: 'gift' | 'vaca_contribution',
 *   giftId?: string,         // for gifts
 *   bagId?: string,           // for vaca
 *   userId: string,           // payer
 *   amount: number,
 *   title: string,            // product/bag name
 *   imageUrl?: string,
 * }
 */
export async function POST(request) {
    try {
        const { type, giftId, bagId, userId, amount, title, imageUrl } = await request.json();

        if (!userId || !amount || !title) {
            return NextResponse.json({ error: 'userId, amount, and title required' }, { status: 400 });
        }

        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!accessToken) {
            return NextResponse.json({ error: 'Mercado Pago not configured' }, { status: 500 });
        }

        const client = new MercadoPagoConfig({ accessToken });
        const preferenceApi = new Preference(client);

        // Build external reference to match in webhook
        const externalRef = type === 'gift'
            ? `gift:${giftId}`
            : `vaca:${bagId}:${userId}`;

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jes-vite.vercel.app';

        const preferenceData = {
            items: [
                {
                    id: giftId || bagId || 'payment',
                    title: title,
                    description: type === 'gift' ? 'Regalo para un amigo 🎁' : 'Contribución a la Vaca 🐄',
                    picture_url: imageUrl || undefined,
                    quantity: 1,
                    unit_price: parseFloat(amount),
                    currency_id: 'COP',
                }
            ],
            external_reference: externalRef,
            back_urls: {
                success: `${appUrl}/payment/success?ref=${externalRef}`,
                failure: `${appUrl}/payment/failure?ref=${externalRef}`,
                pending: `${appUrl}/payment/pending?ref=${externalRef}`,
            },
            auto_return: 'approved',
            notification_url: `${appUrl}/api/webhooks/mercadopago`,
            statement_descriptor: 'JES Store',
        };

        const preference = await preferenceApi.create({ body: preferenceData });

        // Update the gift/contribution with the MP preference ID
        if (type === 'gift' && giftId) {
            await db.query(
                `UPDATE gifts SET payment_id = $1, payment_method = 'mercadopago', payment_external_ref = $2 WHERE id = $3`,
                [preference.id, externalRef, giftId]
            );
        } else if (type === 'vaca_contribution' && bagId) {
            // Create a pending contribution
            await db.query(
                `INSERT INTO bag_contributions (bag_id, user_id, amount, currency, payment_status, payment_id)
                 VALUES ($1, $2, $3, 'COP', 'pending', $4)
                 ON CONFLICT DO NOTHING`,
                [bagId, userId, amount, preference.id]
            );
        }

        return NextResponse.json({
            preferenceId: preference.id,
            initPoint: preference.init_point,
            sandboxInitPoint: preference.sandbox_init_point,
        });
    } catch (error) {
        console.error('POST /api/payments/create-preference error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
