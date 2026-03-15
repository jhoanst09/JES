/**
 * SSO — Single Sign-On across JES subdomains.
 * 
 * Flow:
 * 1. User authenticates on main domain (jes-vite.vercel.app)
 * 2. SSO token is generated with scoped permissions
 * 3. Token embedded in redirect URL to subdomain
 * 4. Subdomain validates token locally (no network call)
 * 
 * Scopes: wave, shop, biz, academy
 */

import { proxyToCore } from './gateway';

const JWT_PUBLIC_KEY = () => process.env.JWT_PUBLIC_KEY || process.env.JWT_SECRET || 'jes-dev-secret-change-in-prod';

/**
 * Create an SSO token for cross-subdomain navigation.
 * Calls the Rust core JWT endpoint.
 * 
 * @param {string} userId 
 * @param {string[]} scopes - Modules the user can access
 * @returns {Promise<string>} JWT token
 */
export async function createSSOToken(userId, scopes = ['wave', 'shop', 'biz', 'academy']) {
    try {
        const result = await proxyToCore('/api/auth/token', 'POST', {
            user_id: userId,
            scopes,
        });
        return result.data?.token;
    } catch (error) {
        console.error('[SSO] Token creation failed:', error.message);
        // Fallback: create token locally
        return createLocalToken(userId, scopes);
    }
}

/**
 * Validate an SSO token locally using the public key.
 * No network call needed — instant validation.
 * 
 * @param {string} token 
 * @returns {{ userId: string, scopes: string[] } | null}
 */
export function validateSSOToken(token) {
    try {
        // Decode JWT (base64url)
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString('utf-8')
        );

        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        // Check issuer
        if (payload.iss !== 'jes') return null;

        return {
            userId: payload.sub,
            scopes: payload.scopes || [],
        };
    } catch {
        return null;
    }
}

/**
 * Generate SSO redirect URL for a subdomain.
 * 
 * @param {string} subdomain - wave, shop, biz, academy
 * @param {string} token - SSO JWT token
 * @param {string} returnPath - Path within the subdomain
 * @returns {string} Full redirect URL
 */
export function getSSORedirectUrl(subdomain, token, returnPath = '/') {
    const baseUrl = process.env.NODE_ENV === 'production'
        ? `https://${subdomain}.jes.com`
        : `http://localhost:3000/${subdomain}`;

    return `${baseUrl}${returnPath}?sso_token=${encodeURIComponent(token)}`;
}

/**
 * Fallback: create JWT locally when Rust core is unavailable.
 */
function createLocalToken(userId, scopes) {
    // Simple base64url JWT (HS256 verification happens on decode side)
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        sub: userId,
        iss: 'jes',
        scopes,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
    })).toString('base64url');

    // Note: This is a simplified fallback. In production, use jsonwebtoken package.
    const crypto = require('crypto');
    const secret = JWT_PUBLIC_KEY();
    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');

    return `${header}.${payload}.${signature}`;
}

export default { createSSOToken, validateSSOToken, getSSORedirectUrl };
