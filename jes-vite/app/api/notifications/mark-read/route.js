import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';
import { getTokenFromRequest, verifyToken } from '@/src/utils/auth/jwt';

/**
 * POST /api/notifications/mark-read - Mark notification(s) as read
 */
export async function POST(request) {
    try {
        const token = getTokenFromRequest(request);
        const decoded = await verifyToken(token);

        if (!decoded?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { notificationIds, markAll } = await request.json();

        if (markAll) {
            // Mark all notifications as read
            await db.query(
                'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
                [decoded.userId]
            );
        } else if (notificationIds && Array.isArray(notificationIds)) {
            // Mark specific notifications as read
            await db.query(
                'UPDATE notifications SET is_read = true WHERE id = ANY($1) AND user_id = $2',
                [notificationIds, decoded.userId]
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Mark read error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
