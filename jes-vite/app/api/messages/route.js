import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';
import { incrementUnread, clearUnread, setReadState } from '@/src/utils/redis-session';

/**
 * GET /api/messages?conversationId=xxx&limit=50&before=uuid
 * Paginated messages for a conversation
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('conversationId');
        const limit = parseInt(searchParams.get('limit') || '50');
        const before = searchParams.get('before');

        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
        }

        let query, queryParams;

        if (before) {
            query = `SELECT m.*, p.name AS sender_name, p.avatar_url AS sender_avatar
                     FROM messages m
                     JOIN profiles p ON p.id = m.sender_id
                     WHERE m.conversation_id = $1
                       AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)
                     ORDER BY m.created_at DESC
                     LIMIT $3`;
            queryParams = [conversationId, before, limit];
        } else {
            query = `SELECT m.*, p.name AS sender_name, p.avatar_url AS sender_avatar
                     FROM messages m
                     JOIN profiles p ON p.id = m.sender_id
                     WHERE m.conversation_id = $1
                     ORDER BY m.created_at DESC
                     LIMIT $2`;
            queryParams = [conversationId, limit];
        }

        const messages = await db.queryAll(query, queryParams);

        return NextResponse.json({ messages: messages.reverse() });
    } catch (error) {
        console.error('GET /api/messages error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/messages
 * Send a message to a conversation
 * Body: { conversationId, senderId, content, contentType?, fileUrl? }
 */
export async function POST(request) {
    try {
        const { conversationId, senderId, content, contentType = 'text', fileUrl } = await request.json();

        if (!conversationId || !senderId || (!content?.trim() && !fileUrl)) {
            return NextResponse.json({ error: 'conversationId, senderId, and content/fileUrl required' }, { status: 400 });
        }

        // Verify sender is a participant
        const participant = await db.queryOne(
            `SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
            [conversationId, senderId]
        );

        if (!participant) {
            return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
        }

        const message = await db.queryOne(
            `INSERT INTO messages (conversation_id, sender_id, content, content_type, file_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [conversationId, senderId, content || '', contentType, fileUrl || null]
        );

        // Update conversation last_message_at
        await db.query(
            `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
            [conversationId]
        );

        // Increment unread counters in Redis for other participants (non-blocking)
        db.queryAll(
            `SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2`,
            [conversationId, senderId]
        ).then(participants => {
            for (const p of participants) {
                incrementUnread(p.user_id, conversationId).catch(() => { });
            }
        }).catch(() => { });

        // Get sender info
        const sender = await db.queryOne(
            `SELECT name, avatar_url FROM profiles WHERE id = $1`,
            [senderId]
        );

        return NextResponse.json({
            message: {
                ...message,
                sender_name: sender?.name,
                sender_avatar: sender?.avatar_url,
            }
        }, { status: 201 });
    } catch (error) {
        console.error('POST /api/messages error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PATCH /api/messages
 * Mark messages as read in a conversation
 * Body: { conversationId, userId }
 */
export async function PATCH(request) {
    try {
        const { conversationId, userId } = await request.json();

        if (!conversationId || !userId) {
            return NextResponse.json({ error: 'conversationId and userId required' }, { status: 400 });
        }

        // Get the latest message ID in this conversation
        const latest = await db.queryOne(
            `SELECT id FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [conversationId]
        );

        // Write to Redis (instant) instead of PostgreSQL UPDATE
        if (latest?.id) {
            await setReadState(userId, conversationId, latest.id);
        }
        await clearUnread(userId, conversationId);

        // Also update PostgreSQL for backwards compatibility (non-blocking)
        db.query(
            `UPDATE messages 
             SET is_read = true 
             WHERE conversation_id = $1 
               AND sender_id != $2 
               AND is_read = false`,
            [conversationId, userId]
        ).catch(() => { });

        return NextResponse.json({ updated: 'redis', messageId: latest?.id || null });
    } catch (error) {
        console.error('PATCH /api/messages error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
