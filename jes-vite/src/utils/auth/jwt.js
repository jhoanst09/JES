/**
 * JWT Utilities (Edge-compatible)
 * 
 * Uses 'jose' library for Edge Runtime support.
 */

import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback-secret-key-change-in-production'
);
const JWT_EXPIRES_IN = '7d';
const ALGORITHM = 'HS256';

/**
 * Generate JWT token
 * @param {object} payload - User data to encode
 * @returns {Promise<string>} JWT token
 */
export async function generateToken(payload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: ALGORITHM })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRES_IN)
        .sign(JWT_SECRET);
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Promise<object|null>} Decoded payload or null if invalid
 */
export async function verifyToken(token) {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload;
    } catch (error) {
        console.error('JWT verification failed:', error.message);
        return null;
    }
}

/**
 * Get token from request cookies
 * @param {Request} request - Next.js request
 * @returns {string|null} Token or null
 */
export function getTokenFromRequest(request) {
    const cookie = request.cookies.get('auth_token');
    return cookie?.value || null;
}

/**
 * Create auth cookie options
 * @returns {object} Cookie options
 */
export function getAuthCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    };
}

export default {
    generateToken,
    verifyToken,
    getTokenFromRequest,
    getAuthCookieOptions,
};
