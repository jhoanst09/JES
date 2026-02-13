import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * GET /api/conversations?userId=xxx
 * Returns all conversations the user is part of (direct, group, vaca)
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        // Simplified query that doesn't depend on bags/gifts tables existing
        const conversations = await db.queryAll(
            `SELECT c.*, 
                    cp.role AS my_role,
                    (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                    (SELECT sender_id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_sender,
                    (SELECT COUNT(*)::int FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND is_read = false) AS unread_count
             FROM conversations c
             JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
             ORDER BY c.last_message_at DESC
             LIMIT 50`,
            [userId]
        );

        // Get participants for each conversation
        for (const conv of conversations) {
            const participants = await db.queryAll(
                `SELECT cp.user_id, cp.role, p.name, p.avatar_url, p.username
                 FROM conversation_participants cp
                 JOIN profiles p ON p.id = cp.user_id
                 WHERE cp.conversation_id = $1`,
                [conv.id]
            );
            conv.participants = participants;

            // If it's a vaca type, try to get bag info
            if (conv.type === 'vaca' && conv.bag_id) {
                try {
                    const bag = await db.queryOne(
                        `SELECT goal_amount, product_handle, product_title, product_image,
                                COALESCE((SELECT SUM(amount) FROM gifts WHERE bag_id = bags.id AND payment_status = 'paid'), 0) AS current_amount
                         FROM bags WHERE id = $1`,
                        [conv.bag_id]
                    );
                    if (bag) {
                        conv.bag = bag;
                    }
                } catch (e) {
                    // Bags table might not exist or have different schema - skip
                    console.warn('Could not fetch bag info:', e.message);
                }
            }
        }

        return NextResponse.json({ conversations });
    } catch (error) {
        console.error('GET /api/conversations error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/conversations
 * Create a new conversation
 * Body: { type, name?, participantIds: [...], createdBy, bagId? }
 */
export async function POST(request) {
    try {
        const { type = 'direct', name, participantIds, createdBy, bagId, imageUrl } = await request.json();

        if (!createdBy || !participantIds?.length) {
            return NextResponse.json({ error: 'createdBy and participantIds required' }, { status: 400 });
        }

        // For direct chats, check if conversation already exists between these 2 users
        if (type === 'direct' && participantIds.length === 1) {
            const otherId = participantIds[0];
            const existing = await db.queryOne(
                `SELECT c.id FROM conversations c
                 WHERE c.type = 'direct'
                 AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = $1)
                 AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = c.id AND user_id = $2)`,
                [createdBy, otherId]
            );
            if (existing) {
                return NextResponse.json({ conversation: { id: existing.id }, existing: true });
            }
        }

        const result = await db.transaction(async (client) => {
            // Create conversation
            const conv = await client.query(
                `INSERT INTO conversations (type, name, image_url, bag_id, created_by, last_message_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())
                 RETURNING *`,
                [type, name || null, imageUrl || null, bagId || null, createdBy]
            );
            const conversation = conv.rows[0];

            // Add creator as participant
            await client.query(
                `INSERT INTO conversation_participants (conversation_id, user_id, role)
                 VALUES ($1, $2, 'creator')
                 ON CONFLICT (conversation_id, user_id) DO NOTHING`,
                [conversation.id, createdBy]
            );

            // Add other participants
            for (const uid of participantIds) {
                if (uid !== createdBy) {
                    await client.query(
                        `INSERT INTO conversation_participants (conversation_id, user_id, role)
                         VALUES ($1, $2, 'member')
                         ON CONFLICT (conversation_id, user_id) DO NOTHING`,
                        [conversation.id, uid]
                    );
                }
            }

            // Send system message for groups/vacas
            if (type !== 'direct') {
                await client.query(
                    `INSERT INTO messages (conversation_id, sender_id, content, content_type)
                     VALUES ($1, $2, $3, 'system')`,
                    [conversation.id, createdBy, type === 'vaca' ? '🐄 ¡Se creó la Vaca! Organicemos el regalo.' : '👥 Grupo creado']
                );
            }

            return conversation;
        });

        return NextResponse.json({ conversation: result }, { status: 201 });
    } catch (error) {
        console.error('POST /api/conversations error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
