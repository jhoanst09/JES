/**
 * Marketplace Redis Integration
 * 
 * Handles product event notifications via Redis.
 * Uses the existing Upstash REST infrastructure from redis-session.js.
 */
import { pushToQueue, cacheSet, cacheGet, cacheDel } from './redis-session';

const PRODUCT_EVENTS_QUEUE = 'marketplace_products';
const USER_INTERESTS_PREFIX = 'mp:interests:';
const PRODUCT_NOTIFICATION_PREFIX = 'mp:notify:';
const NOTIFICATION_TTL = 60 * 60 * 24; // 24 hours

/**
 * Publish a product creation event to Redis.
 * Called from the products API after product creation.
 * 
 * Pushes to a queue for async processing and stores
 * notifications for users with matching category interests.
 * 
 * @param {object} product - The created product
 */
export async function publishProductEvent(product) {
    if (!product?.id) return;

    try {
        // 1. Push to the marketplace product events queue
        await pushToQueue(PRODUCT_EVENTS_QUEUE, {
            type: 'product_created',
            product_id: product.id,
            seller_id: product.seller_id,
            title: product.title,
            price_fiat: product.price_fiat,
            category_tags: product.category_tags || [],
            created_at: new Date().toISOString()
        });

        // 2. Find interested users and notify them
        const tags = product.category_tags || [];
        if (tags.length > 0) {
            for (const tag of tags) {
                const interestedKey = `${USER_INTERESTS_PREFIX}${tag}`;
                const interested = await cacheGet(interestedKey);

                if (interested && Array.isArray(interested)) {
                    for (const userId of interested) {
                        // Skip the seller themselves
                        if (userId === product.seller_id) continue;

                        // Store notification for the user
                        const notifKey = `${PRODUCT_NOTIFICATION_PREFIX}${userId}`;
                        const existing = await cacheGet(notifKey) || [];
                        existing.push({
                            product_id: product.id,
                            title: product.title,
                            price_fiat: product.price_fiat,
                            category: tag,
                            timestamp: Date.now()
                        });

                        // Keep only last 20 notifications
                        const trimmed = existing.slice(-20);
                        await cacheSet(notifKey, trimmed, NOTIFICATION_TTL);
                    }
                }
            }
        }

        console.log(`[Marketplace Redis] Product event published: ${product.id}`);
    } catch (error) {
        // Non-blocking — log and continue
        console.error('[Marketplace Redis] Event publish error:', error.message);
    }
}

/**
 * Subscribe a user to category notifications.
 * When new products are created with matching categories,
 * the user will be notified.
 * 
 * @param {string} userId - User ID
 * @param {string[]} categories - Array of category tags
 */
export async function subscribeToCategories(userId, categories) {
    if (!userId || !categories?.length) return;

    try {
        for (const tag of categories) {
            const key = `${USER_INTERESTS_PREFIX}${tag}`;
            const existing = await cacheGet(key) || [];

            if (!existing.includes(userId)) {
                existing.push(userId);
                // TTL of 30 days for interests
                await cacheSet(key, existing, 60 * 60 * 24 * 30);
            }
        }

        console.log(`[Marketplace Redis] User ${userId} subscribed to: ${categories.join(', ')}`);
    } catch (error) {
        console.error('[Marketplace Redis] Subscribe error:', error.message);
    }
}

/**
 * Get pending product notifications for a user.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<object[]>} Array of product notifications
 */
export async function getProductNotifications(userId) {
    if (!userId) return [];

    try {
        const key = `${PRODUCT_NOTIFICATION_PREFIX}${userId}`;
        const notifications = await cacheGet(key) || [];
        return notifications;
    } catch (error) {
        console.error('[Marketplace Redis] Get notifications error:', error.message);
        return [];
    }
}

/**
 * Clear product notifications for a user (after they've been read).
 * 
 * @param {string} userId - User ID
 */
export async function clearProductNotifications(userId) {
    if (!userId) return;

    try {
        const key = `${PRODUCT_NOTIFICATION_PREFIX}${userId}`;
        await cacheDel(key);
    } catch (error) {
        console.error('[Marketplace Redis] Clear notifications error:', error.message);
    }
}
