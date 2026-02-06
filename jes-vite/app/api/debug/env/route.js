import { NextResponse } from 'next/server';

/**
 * GET /api/debug/env
 * 
 * Debug endpoint to check if environment variables are configured
 */
export async function GET() {
    return NextResponse.json({
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'not set',
        clientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) || 'undefined',
    });
}
