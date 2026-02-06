import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';
import { getTokenFromRequest, verifyToken } from '@/src/utils/auth/jwt';

/**
 * GET /api/auth/me
 * 
 * Get current user from JWT token.
 */
export async function GET(request) {
    try {
        const token = getTokenFromRequest(request);

        if (!token) {
            return NextResponse.json({ user: null });
        }

        const decoded = await verifyToken(token);

        if (!decoded || !decoded.userId) {
            return NextResponse.json({ user: null });
        }

        // Get fresh user data from DB
        const user = await db.queryOne(
            'SELECT id, email, name, avatar_url, bio, created_at FROM profiles WHERE id = $1',
            [decoded.userId]
        );

        if (!user) {
            return NextResponse.json({ user: null });
        }

        return NextResponse.json({ user });

    } catch (error) {
        console.error('Get me error:', error);
        return NextResponse.json({ user: null });
    }
}
