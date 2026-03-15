/**
 * Real-time Event Publisher (Server-side)
 * 
 * Uses Ably REST API to publish events from API routes.
 * Ably handles the WebSocket connections to clients.
 * 
 * Channels:
 *   user:{userId}     — Personal notifications, friend requests
 *   conv:{convId}     — Messages, typing indicators
 *   feed:global       — New posts (broadcast)
 *   mp:products       — New marketplace products
 * 
 * SETUP: Add ABLY_API_KEY to Vercel env vars.
 * Free tier: 6M messages/month.
 */

const ABLY_API_KEY = () => process.env.ABLY_API_KEY;
const ABLY_REST_URL = 'https://rest.ably.io';

/**
 * Publish an event to an Ably channel.
 * Non-blocking — errors are logged but never thrown.
 * 
 * @param {string} channel - Channel name (e.g., 'user:uuid', 'conv:uuid')
 * @param {string} event - Event name (e.g., 'message', 'typing', 'notification')
 * @param {object} data - Event payload
 */
export async function publishEvent(channel, event, data) {
    const apiKey = ABLY_API_KEY();
    if (!apiKey) {
        console.warn('[Realtime] ABLY_API_KEY not configured, skipping publish');
        return;
    }

    try {
        const response = await fetch(
            `${ABLY_REST_URL}/channels/${encodeURIComponent(channel)}/messages`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(apiKey).toString('base64')}`,
                },
                body: JSON.stringify({
                    name: event,
                    data: JSON.stringify(data),
                }),
            }
        );

        if (!response.ok) {
            console.error(`[Realtime] Publish failed (${response.status}):`, await response.text());
        }
    } catch (error) {
        console.error('[Realtime] Publish error:', error.message);
    }
}

// ==========================================
// CONVENIENCE PUBLISHERS
// ==========================================

/**
 * Publish a new message event to a conversation channel.
 */
export async function publishMessage(conversationId, message) {
    await publishEvent(`conv:${conversationId}`, 'message', {
        id: message.id,
        sender_id: message.sender_id,
        content: message.content,
        created_at: message.created_at,
        sender_name: message.sender_name,
    });
}

/**
 * Publish a typing indicator.
 */
export async function publishTyping(conversationId, userId, isTyping = true) {
    await publishEvent(`conv:${conversationId}`, 'typing', {
        user_id: userId,
        is_typing: isTyping,
    });
}

/**
 * Publish a presence change (online/offline).
 */
export async function publishPresence(userId, status = 'online') {
    await publishEvent(`user:${userId}`, 'presence', { status });
}

/**
 * Publish a notification to a specific user.
 */
export async function publishNotification(userId, notification) {
    await publishEvent(`user:${userId}`, 'notification', notification);
}

/**
 * Publish a new post to the global feed.
 */
export async function publishNewPost(post) {
    await publishEvent('feed:global', 'new_post', {
        id: post.id,
        user_id: post.user_id,
        content: post.content?.substring(0, 100),
        created_at: post.created_at,
    });
}

export default {
    publishEvent,
    publishMessage,
    publishTyping,
    publishPresence,
    publishNotification,
    publishNewPost,
};
