import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';
import { getTokenFromRequest, verifyToken } from '@/src/utils/auth/jwt';

/**
 * GET /api/notifications - Fetch notifications for current user
 */
export async function GET(request) {
    try {
        const token = getTokenFromRequest(request);
        const decoded = await verifyToken(token);

        if (!decoded?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch notifications with actor info
        const notifications = await db.queryAll(
            `SELECT 
                n.*,
                u.name as actor_name,
                u.avatar_url as actor_avatar,
                sp.content as post_content
             FROM notifications n
             JOIN users u ON n.actor_id = u.id
             LEFT JOIN social_posts sp ON n.post_id = sp.id
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC
             LIMIT 50`,
            [decoded.userId]
        );

        // Get unread count
        const unreadCount = await db.queryOne(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
            [decoded.userId]
        );

        return NextResponse.json({
            notifications: notifications || [],
            unreadCount: parseInt(unreadCount?.count || 0)
        });
    } catch (error) {
        console.error('Notifications fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
