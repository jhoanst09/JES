import { NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/src/utils/auth/jwt';
import redis from '@/src/utils/redis-session';

/**
 * POST /api/auth/logout
 * 
 * Logout user - clears cookie and Redis session.
 */
export async function POST(request) {
    try {
        // Get user ID from token
        const token = getTokenFromRequest(request);
        if (token) {
            const decoded = await verifyToken(token);
            if (decoded?.userId) {
                // Delete session from Redis
                await redis.deleteSession(decoded.userId);
            }
        }

        // Create response and clear cookie
        const response = NextResponse.json({ success: true });

        response.cookies.set('auth_token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 0, // Expire immediately
        });

        return response;

    } catch (error) {
        console.error('Logout error:', error);
        // Still clear cookie even on error
        const response = NextResponse.json({ success: true });
        response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
        return response;
    }
}
