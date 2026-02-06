/**
 * Bags Service
 * 
 * Client-side service for shared bags (vacas).
 * Calls API routes instead of direct Supabase.
 */

export async function getBags(userId) {
    const params = userId ? `?userId=${userId}` : '';
    const res = await fetch(`/api/bags${params}`);
    if (!res.ok) throw new Error('Failed to fetch bags');
    const { bags } = await res.json();
    return bags || [];
}

export async function getBagById(bagId) {
    const res = await fetch(`/api/bags/${bagId}`);
    if (!res.ok) throw new Error('Failed to fetch bag');
    const { bag } = await res.json();
    return bag;
}

export async function createBag(data) {
    const res = await fetch('/api/bags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create bag');
    const { bag } = await res.json();
    return bag;
}

export async function contributeToBag(bagId, amount, userId) {
    const res = await fetch('/api/bags/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bagId, amount, userId }),
    });
    if (!res.ok) throw new Error('Failed to contribute');
    return res.json();
}

export async function joinBag(bagId, userId) {
    const res = await fetch('/api/bags/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bagId, userId }),
    });
    if (!res.ok) throw new Error('Failed to join bag');
    return res.json();
}

export async function getBagMembers(bagId) {
    const res = await fetch(`/api/bags/${bagId}/members`);
    if (!res.ok) throw new Error('Failed to fetch members');
    const { members } = await res.json();
    return members || [];
}

// Real-time subscription placeholder
export function subscribeToBag(bagId, callback) {
    // In the future, use WebSocket or polling
    // For now, return empty cleanup function
    return () => { };
}
