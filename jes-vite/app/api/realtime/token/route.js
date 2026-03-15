import { NextResponse } from 'next/server';

/**
 * GET /api/realtime/token
 * 
 * Issues short-lived Ably tokens for authenticated users.
 * Tokens expire after 1 hour, client must re-fetch.
 * 
 * Query: ?userId=uuid
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'Realtime not configured' }, { status: 503 });
    }

    try {
        // Request a token from Ably
        const [keyName, keySecret] = apiKey.split(':');

        const response = await fetch(
            `https://rest.ably.io/keys/${keyName}/requestToken`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(apiKey).toString('base64')}`,
                },
                body: JSON.stringify({
                    capability: JSON.stringify({
                        [`user:${userId}`]: ['subscribe'],
                        [`conv:*`]: ['subscribe'],
                        [`feed:global`]: ['subscribe'],
                        [`mp:products`]: ['subscribe'],
                    }),
                    clientId: userId,
                    ttl: 3600000, // 1 hour in ms
                }),
            }
        );

        if (!response.ok) {
            const err = await response.text();
            console.error('[Realtime Token] Ably error:', err);
            return NextResponse.json({ error: 'Token generation failed' }, { status: 500 });
        }

        const tokenData = await response.json();

        return NextResponse.json({ token: tokenData });
    } catch (error) {
        console.error('[Realtime Token] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
