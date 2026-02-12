import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * POST /api/bags/create-with-chat
 * 
 * Creates a Vaca (bag) with:
 * 1. The bag itself (product, goal amount)
 * 2. Participants added to bag_participants
 * 3. A group conversation linked to the bag
 * 4. All participants added to the conversation
 * 
 * Body: {
 *   creatorId: string,
 *   recipientId: string,        // who the gift is for
 *   participantIds: string[],   // friends to pool money with (EXCLUDING recipient)
 *   productHandle: string,
 *   productTitle: string,
 *   productImage: string,
 *   goalAmount: number,
 *   currency: string,
 *   message?: string,
 * }
 */
export async function POST(request) {
    try {
        const {
            creatorId,
            recipientId,
            participantIds,
            productHandle,
            productTitle,
            productImage,
            goalAmount,
            currency = 'COP',
            message
        } = await request.json();

        if (!creatorId || !recipientId || !participantIds?.length || !productHandle || !goalAmount) {
            return NextResponse.json({
                error: 'creatorId, recipientId, participantIds, productHandle, and goalAmount required'
            }, { status: 400 });
        }

        // All contributors (creator + selected friends, NOT the recipient)
        const allContributors = [creatorId, ...participantIds.filter(id => id !== creatorId)];

        const result = await db.transaction(async (client) => {
            // 1. Create the bag
            const bagResult = await client.query(
                `INSERT INTO bags (name, description, image_url, goal_amount, currency, shopify_product_handle, creator_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [
                    `🐄 Vaca para ${productTitle}`,
                    message || `Regalo grupal para un amigo`,
                    productImage || null,
                    goalAmount,
                    currency,
                    productHandle,
                    creatorId
                ]
            );
            const bag = bagResult.rows[0];

            // 2. Add participants to bag
            for (const uid of allContributors) {
                const role = uid === creatorId ? 'creator' : 'member';
                await client.query(
                    `INSERT INTO bag_participants (bag_id, user_id, role, joined_at)
                     VALUES ($1, $2, $3, NOW())
                     ON CONFLICT (bag_id, user_id) DO NOTHING`,
                    [bag.id, uid, role]
                );
            }

            // 3. Create a gift record linking to this bag
            const giftRef = `vaca_gift_${Date.now()}`;
            await client.query(
                `INSERT INTO gifts (sender_id, recipient_id, product_handle, product_title, product_image, amount, currency, bag_id, payment_external_ref, message)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [creatorId, recipientId, productHandle, productTitle || '', productImage || '', goalAmount, currency, bag.id, giftRef, message || null]
            );

            // 4. Create group conversation
            const convResult = await client.query(
                `INSERT INTO conversations (type, name, image_url, bag_id, created_by)
                 VALUES ('vaca', $1, $2, $3, $4)
                 RETURNING *`,
                [`🐄 Vaca: ${productTitle}`, productImage || null, bag.id, creatorId]
            );
            const conversation = convResult.rows[0];

            // 5. Add all contributors to conversation
            for (const uid of allContributors) {
                const role = uid === creatorId ? 'creator' : 'member';
                await client.query(
                    `INSERT INTO conversation_participants (conversation_id, user_id, role)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (conversation_id, user_id) DO NOTHING`,
                    [conversation.id, uid, role]
                );
            }

            // 6. Send initial system message
            await client.query(
                `INSERT INTO messages (conversation_id, sender_id, content, content_type)
                 VALUES ($1, $2, $3, 'system')`,
                [conversation.id, creatorId,
                `🐄 ¡Vaca creada! Juntemos ${new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0 }).format(goalAmount)} para regalar "${productTitle}". Cada uno puede contribuir lo que quiera.`]
            );

            // 7. Get recipient name for notification
            const recipient = await client.query('SELECT name FROM users WHERE id = $1', [recipientId]);
            const recipientName = recipient.rows[0]?.name || 'tu amigo';

            // Send system message about recipient
            await client.query(
                `INSERT INTO messages (conversation_id, sender_id, content, content_type)
                 VALUES ($1, $2, $3, 'system')`,
                [conversation.id, creatorId, `🎁 El regalo es para @${recipientName}. ¡No le cuenten! 🤫`]
            );

            return { bag, conversation };
        });

        return NextResponse.json({
            bag: result.bag,
            conversation: result.conversation,
            message: '¡Vaca creada exitosamente! 🐄'
        }, { status: 201 });

    } catch (error) {
        console.error('POST /api/bags/create-with-chat error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
