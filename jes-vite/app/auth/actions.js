'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '../../src/utils/auth/jwt';
import redis from '../../src/utils/redis-session';

/**
 * Sign out action
 * Clears auth cookie and redirects to profile
 */
export async function signOut() {
    const cookieStore = await cookies();
    const token = (await cookieStore.get('auth_token'))?.value;

    if (token) {
        try {
            const decoded = await verifyToken(token);
            if (decoded?.userId) {
                // Invalidate Redis session in Ohio
                await redis.deleteSession(decoded.userId);
            }
        } catch (err) {
            console.warn('[SignOut] Could not invalidate Redis session:', err.message);
        }
    }

    cookieStore.set('auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });

    redirect('/profile');
}
