import { NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/src/utils/auth/jwt';
import { subscribeUser, getStats } from '@/src/services/notificationService';

/**
 * GET /api/notifications/stream
 * 
 * Server-Sent Events (SSE) endpoint for real-time Sileo notifications.
 * Listens on PostgreSQL LISTEN/NOTIFY and pushes events to the client.
 * 
 * Events come from all schemas: core, wave, biz, marketplace.
 * Each event includes a `toast` config object for Sileo.
 */
export async function GET(request) {
    try {
        const token = getTokenFromRequest(request);
        const decoded = await verifyToken(token);

        if (!decoded?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const stream = subscribeUser(decoded.userId);

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', // Disable nginx buffering
            },
        });
    } catch (error) {
        console.error('[SSE] Auth error:', error.message);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}

// Health check — returns stats about active connections
export async function HEAD() {
    const stats = getStats();
    return new Response(null, {
        headers: {
            'X-Active-Users': String(stats.activeUsers),
            'X-Total-Connections': String(stats.totalConnections),
            'X-Listener-Active': String(stats.listenerActive),
        },
    });
}
