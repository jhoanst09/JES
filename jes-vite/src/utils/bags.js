/**
 * Bags Utils
 * 
 * Utility functions for shared bags (vacas).
 * Uses API routes instead of direct Supabase.
 */

/**
 * Create a new shared bag
 */
export async function createBag({ name, description, targetAmount, ownerId, participants = [] }) {
    const res = await fetch('/api/bags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name,
            description,
            targetAmount,
            ownerId,
            participants,
        }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create bag');
    }

    const { bag } = await res.json();
    return bag;
}

/**
 * Get all bags for a user
 */
export async function getUserBags(userId) {
    const res = await fetch(`/api/bags?userId=${userId}`);
    if (!res.ok) return [];
    const { bags } = await res.json();
    return bags || [];
}

/**
 * Get single bag with details
 */
export async function getBagWithDetails(bagId) {
    const res = await fetch(`/api/bags/${bagId}`);
    if (!res.ok) return null;
    const { bag } = await res.json();
    return bag;
}

/**
 * Contribute to a bag
 */
export async function contributeAmount({ bagId, userId, amount }) {
    const res = await fetch('/api/bags/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bagId, userId, amount }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to contribute');
    }

    return res.json();
}

/**
 * Get bag contributions
 */
export async function getBagContributions(bagId) {
    const res = await fetch(`/api/bags/${bagId}/contributions`);
    if (!res.ok) return [];
    const { contributions } = await res.json();
    return contributions || [];
}

/**
 * Join a bag
 */
export async function joinBag(bagId, userId) {
    const res = await fetch('/api/bags/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bagId, userId }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to join bag');
    }

    return res.json();
}

/**
 * Get invite link for bag
 */
export function getInviteLink(bagId) {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/bags/join/${bagId}`;
}

/**
 * Format bag URL for chat sharing
 */
export function formatBagForChat(bagId) {
    if (typeof window === 'undefined') return `/bags/${bagId}`;
    return `${window.location.origin}/bags/${bagId}`;
}

