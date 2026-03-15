/**
 * Notification Service — Cross-Schema Event Bus
 * 
 * Listens to PostgreSQL LISTEN/NOTIFY on channel 'jes_notifications'.
 * Provides SSE (Server-Sent Events) stream for real-time Sileo toasts.
 * Handles events from: core, wave, biz, marketplace schemas.
 * 
 * Architecture:
 *   PostgreSQL trigger → pg_notify('jes_notifications', payload)
 *   → This service picks it up via LISTEN
 *   → Pushes to connected SSE clients
 *   → Frontend fires Sileo toast
 */

import { Pool } from 'pg';

// Dedicated connection for LISTEN (cannot share with query pool)
let listenerClient = null;
const subscribers = new Map(); // userId → Set<ReadableStreamController>

// Schema-to-Sileo mapping
const SCHEMA_TOAST_CONFIG = {
    wave: {
        payment_received: { type: 'success', icon: '💰', label: 'Pago Recibido' },
        payment_sent: { type: 'info', icon: '💸', label: 'Pago Enviado' },
        balance_update: { type: 'info', icon: '🔄', label: 'Saldo Actualizado' },
        jes_coin: { type: 'success', icon: '🪙', label: 'JES Coins' },
    },
    biz: {
        appointment_booked: { type: 'info', icon: '📅', label: 'Cita Agendada' },
        appointment_confirmed: { type: 'success', icon: '✅', label: 'Cita Confirmada' },
        appointment_cancelled: { type: 'warning', icon: '❌', label: 'Cita Cancelada' },
        appointment_reminder: { type: 'warning', icon: '⏰', label: 'Recordatorio' },
    },
    marketplace: {
        purchase: { type: 'success', icon: '🛒', label: 'Compra' },
        sale: { type: 'success', icon: '💵', label: 'Venta' },
        escrow_released: { type: 'success', icon: '🔓', label: 'Escrow Liberado' },
        review: { type: 'info', icon: '⭐', label: 'Reseña' },
    },
    core: {
        message: { type: 'info', icon: '💬', label: 'Mensaje' },
        chat: { type: 'info', icon: '💬', label: 'Chat' },
        friend_request: { type: 'info', icon: '🤝', label: 'Solicitud' },
        friend_accepted: { type: 'success', icon: '✅', label: 'Amistad Aceptada' },
        like: { type: 'info', icon: '❤️', label: 'Like' },
        comment_reply: { type: 'info', icon: '💬', label: 'Respuesta' },
        mention: { type: 'info', icon: '@', label: 'Mención' },
        follow: { type: 'info', icon: '👤', label: 'Seguidor' },
        system: { type: 'warning', icon: '⚡', label: 'Sistema' },
    },
};

/**
 * Get the Sileo toast config for a notification.
 */
export function getToastConfig(schemaOrigin, type) {
    const schema = SCHEMA_TOAST_CONFIG[schemaOrigin] || SCHEMA_TOAST_CONFIG.core;
    return schema[type] || { type: 'info', icon: '🔔', label: 'Notificación' };
}

/**
 * Initialize the PostgreSQL LISTEN connection.
 * Called once when the first SSE client connects.
 */
async function initListener() {
    if (listenerClient) return;

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 1,
    });

    listenerClient = await pool.connect();
    await listenerClient.query('LISTEN jes_notifications');

    console.log('🔔 [NotificationService] Listening on pg_notify channel: jes_notifications');

    listenerClient.on('notification', (msg) => {
        try {
            const payload = JSON.parse(msg.payload);
            const userId = payload.user_id;

            if (!userId) return;

            const config = getToastConfig(payload.schema_origin, payload.type);
            const sseData = JSON.stringify({
                ...payload,
                toast: config,
            });

            // Push to all SSE connections for this user
            const controllers = subscribers.get(userId);
            if (controllers && controllers.size > 0) {
                const event = `data: ${sseData}\n\n`;
                for (const controller of controllers) {
                    try {
                        controller.enqueue(new TextEncoder().encode(event));
                    } catch {
                        controllers.delete(controller);
                    }
                }
            }
        } catch (err) {
            console.error('[NotificationService] Parse error:', err.message);
        }
    });

    listenerClient.on('error', (err) => {
        console.error('[NotificationService] Connection error:', err.message);
        listenerClient = null;
        // Reconnect after 5 seconds
        setTimeout(initListener, 5000);
    });
}

/**
 * Subscribe a user to real-time notifications via SSE.
 * Returns a ReadableStream for the Response.
 */
export function subscribeUser(userId) {
    // Ensure listener is initialized
    initListener().catch(console.error);

    const stream = new ReadableStream({
        start(controller) {
            // Register this controller
            if (!subscribers.has(userId)) {
                subscribers.set(userId, new Set());
            }
            subscribers.get(userId).add(controller);

            // Send initial keepalive
            controller.enqueue(new TextEncoder().encode(': connected\n\n'));

            console.log(`🔔 [SSE] User ${userId} connected (${subscribers.get(userId).size} tabs)`);
        },
        cancel() {
            // Unregister on disconnect
            const controllers = subscribers.get(userId);
            if (controllers) {
                // We can't easily reference the exact controller here,
                // but it will be cleaned up on next write attempt
            }
            console.log(`🔔 [SSE] User ${userId} disconnected`);
        },
    });

    return stream;
}

/**
 * Get subscriber count (for health/debug).
 */
export function getStats() {
    let totalConnections = 0;
    for (const controllers of subscribers.values()) {
        totalConnections += controllers.size;
    }
    return {
        activeUsers: subscribers.size,
        totalConnections,
        listenerActive: !!listenerClient,
    };
}
