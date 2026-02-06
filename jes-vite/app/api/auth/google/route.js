import { NextResponse } from 'next/server';

/**
 * GET /api/auth/google
 * 
 * Redirect to Google OAuth consent screen
 */
export async function GET() {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://jes-vite.vercel.app').trim();
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    if (!clientId) {
        return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.redirect(googleAuthUrl);
}
