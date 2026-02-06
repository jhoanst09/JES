/**
 * Vaca (Bags) Service
 * 
 * Client-side service for bag operations.
 * Calls API routes instead of direct Supabase.
 */

export async function getVacaPools() {
    const res = await fetch('/api/bags');
    if (!res.ok) throw new Error('Failed to fetch bags');
    const { bags } = await res.json();
    return bags || [];
}

export async function getActiveVacaPools() {
    return getVacaPools(); // Alias for backwards compatibility
}

export async function getVacaPoolById(poolId) {
    const res = await fetch(`/api/bags/${poolId}`);
    if (!res.ok) throw new Error('Failed to fetch bag');
    const { bag } = await res.json();
    return bag;
}

export async function getPoolByProduct(userId, productHandle) {
    const res = await fetch(`/api/bags?userId=${userId}&productHandle=${productHandle}`);
    const { bags } = await res.json();
    return bags?.[0] || null;
}

export async function createVacaPool(data) {
    const res = await fetch('/api/bags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create bag');
    const { bag } = await res.json();
    return bag;
}

export async function contributeToPool(poolId, amount, userId) {
    const res = await fetch('/api/bags/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poolId, amount, userId }),
    });
    if (!res.ok) throw new Error('Failed to contribute');
    return res.json();
}

export async function contributeToVaca(poolId, userId, amount) {
    return contributeToPool(poolId, amount, userId); // Alias for backwards compatibility
}

