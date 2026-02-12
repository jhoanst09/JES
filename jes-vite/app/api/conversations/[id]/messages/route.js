import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';

/**
 * GET /api/conversations/[id]/messages?limit=50&before=uuid
 * Paginated messages for a conversation
 */
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const before = searchParams.get('before'); // cursor pagination

        let query, queryParams;

        if (before) {
            query = `SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar
                     FROM messages m
                     JOIN users u ON u.id = m.sender_id
                     WHERE m.conversation_id = $1
                       AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)
                     ORDER BY m.created_at DESC
                     LIMIT $3`;
            queryParams = [id, before, limit];
        } else {
            query = `SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar
                     FROM messages m
                     JOIN users u ON u.id = m.sender_id
                     WHERE m.conversation_id = $1
                     ORDER BY m.created_at DESC
                     LIMIT $2`;
            queryParams = [id, limit];
        }

        const messages = await db.queryAll(query, queryParams);

        // Return in chronological order (oldest first)
        return NextResponse.json({ messages: messages.reverse() });
    } catch (error) {
        console.error('GET /api/conversations/[id]/messages error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/conversations/[id]/messages
 * Send a message to a conversation
 * Body: { senderId, content, contentType?, fileUrl? }
 */
export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const { senderId, content, contentType = 'text', fileUrl } = await request.json();

        if (!senderId || (!content && !fileUrl)) {
            return NextResponse.json({ error: 'senderId and content/fileUrl required' }, { status: 400 });
        }

        // Verify sender is a participant
        const participant = await db.queryOne(
            `SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
            [id, senderId]
        );

        if (!participant) {
            return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
        }

        const message = await db.queryOne(
            `INSERT INTO messages (conversation_id, sender_id, content, content_type, file_url)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [id, senderId, content || '', contentType, fileUrl || null]
        );

        // Get sender info
        const sender = await db.queryOne(
            `SELECT name, avatar_url FROM users WHERE id = $1`,
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
        console.error('POST /api/conversations/[id]/messages error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
