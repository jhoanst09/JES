import { NextResponse } from 'next/server';
import { verifyToken } from '@/src/utils/auth/jwt';

/**
 * MIDDLEWARE - JWT Validation
 * 
 * Fast session check using JWT token from cookie.
 * No database calls, ultra-fast validation.
 */

export async function updateSession(request) {
    const pathname = request.nextUrl.pathname;

    // Skip static assets and public routes
    if (
        pathname.startsWith('/_next') ||
        pathname.includes('.') ||
        pathname.startsWith('/favicon') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/auth')
    ) {
        return NextResponse.next({ request });
    }

    // Public routes that don't require auth
    const publicRoutes = [
        '/', '/about', '/products', '/music', '/apparel', '/electronics',
        '/profile', '/login', '/community', '/wishlist', '/explore'
    ];

    if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
        return NextResponse.next({ request });
    }

    if (pathname.startsWith('/product/')) {
        return NextResponse.next({ request });
    }

    // Protected routes (require auth - redirect to /login if no token)
    const protectedRoutes = ['/chat', '/settings', '/messages'];
    const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

    // Special case: /profile is public but should show login form if not authenticated
    // and should not loop. 

    if (!isProtected) {
        return NextResponse.next({ request });
    }

    // Check JWT token
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const decoded = await verifyToken(token);

    if (!decoded || !decoded.userId) {
        // Invalid token - redirect to login and clear cookie
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
        return response;
    }

    // PRODUCTION STRICT MODE: Cross-check with Redis
    // We import redis inside the function to avoid top-level await/module issues in Edge
    try {
        const redis = (await import('@/src/utils/redis-session')).default;
        const sessionValid = await redis.isSessionValid(decoded.userId);

        if (!sessionValid) {
            console.warn(`[Middleware] Redis session invalid for user ${decoded.userId}`);
            const response = NextResponse.redirect(new URL('/login?error=session_expired', request.url));
            response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
            return response;
        }

        // Optional: touch session to extend TTL
        await redis.touchSession(decoded.userId);
    } catch (error) {
        console.error('[Middleware] Redis critical failure:', error.message);
        // STRICT: If Redis is configured but failing, we reject the session to avoid inconsistencies
        const response = NextResponse.redirect(new URL('/login?error=auth_error', request.url));
        response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
        return response;
    }

    // Valid token & Redis session - continue
    return NextResponse.next({ request });
}
