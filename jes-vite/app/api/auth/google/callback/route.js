import { NextResponse } from 'next/server';
import db from '@/src/utils/db/postgres';
import { generateToken, getAuthCookieOptions } from '@/src/utils/auth/jwt';
import redis from '@/src/utils/redis-session';

/**
 * GET /api/auth/google/callback
 * 
 * Handle Google OAuth callback, create/login user
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://jes-vite.vercel.app').trim();

    if (error) {
        return NextResponse.redirect(`${baseUrl}/profile?error=google_auth_cancelled`);
    }

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/profile?error=no_code`);
    }

    try {
        const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
        const redirectUri = `${baseUrl}/api/auth/google/callback`;

        if (!clientId || !clientSecret) {
            return NextResponse.redirect(`${baseUrl}/profile?error=missing_oauth_config`);
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenResponse.json();

        if (tokens.error) {
            console.error('Token exchange error:', tokens);
            const errorDesc = encodeURIComponent(tokens.error_description || tokens.error);
            return NextResponse.redirect(`${baseUrl}/profile?error=token_${errorDesc}`);
        }

        // Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        const googleUser = await userInfoResponse.json();

        if (!googleUser.email) {
            return NextResponse.redirect(`${baseUrl}/profile?error=no_email`);
        }

        // Check if user exists in our database
        let user = await db.queryOne(
            'SELECT id, email, name, avatar_url FROM profiles WHERE email = $1',
            [googleUser.email.toLowerCase()]
        );

        if (!user) {
            // Atomic check/insert: User may have been created between the query and this line
            // but the UNIQUE profile.email constraint handles it.
            try {
                user = await db.queryOne(
                    `INSERT INTO profiles (email, password_hash, name, avatar_url)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (email) DO UPDATE SET
                        name = EXCLUDED.name,
                        avatar_url = EXCLUDED.avatar_url,
                        updated_at = NOW()
                     RETURNING id, email, name, avatar_url`,
                    [
                        googleUser.email.toLowerCase(),
                        'GOOGLE_OAUTH_NO_PASSWORD',
                        googleUser.name || googleUser.email.split('@')[0] || 'User',
                        googleUser.picture || null
                    ]
                );
            } catch (insertError) {
                console.error('User creation/update failed:', insertError);
                // Fallback to retry selecting user if insert failed due to race condition
                user = await db.queryOne(
                    'SELECT id, email, name, avatar_url FROM profiles WHERE email = $1',
                    [googleUser.email.toLowerCase()]
                );
            }
        }

        if (!user) {
            throw new Error('Could not retrieve or create user profile');
        }

        // Generate JWT
        const token = await generateToken({
            userId: user.id,
            email: user.email,
        });

        // Store session in Redis (STRICT: Must succeed)
        try {
            const stored = await redis.storeSession(user.id, {
                email: user.email,
                name: user.name,
                provider: 'google',
                loginTime: Date.now(),
            });

            if (!stored) throw new Error('Redis failed to store session');
        } catch (redisError) {
            console.error('[GoogleCallback] Redis failure (Critical):', redisError.message);
            throw redisError; // Fail the entire login if session can't be stored
        }

        // Create response with redirect and set cookie
        const response = NextResponse.redirect(`${baseUrl}/profile?login=success`);
        response.cookies.set('auth_token', token, getAuthCookieOptions());

        return response;

    } catch (error) {
        console.error('Google OAuth error:', error.message, error.stack);
        const errorMessage = encodeURIComponent(error.message || 'auth_failed');
        return NextResponse.redirect(`${baseUrl}/profile?error=${errorMessage}`);
    }
}
