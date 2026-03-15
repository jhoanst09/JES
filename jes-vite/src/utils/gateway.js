/**
 * Gateway — Proxy layer from Next.js BFF to Rust core.
 * 
 * Features:
 *   - Forwards financial operations to jes-core (Rust)
 *   - Circuit breaker: falls back to direct PostgreSQL if Rust is down
 *   - Request timeout: 5s
 * 
 * Usage:
 *   const result = await proxyToCore('/api/wallet/balance', 'GET', null, jwt);
 */

const CORE_URL = () => process.env.JES_CORE_URL || 'http://localhost:4000';
const REALTIME_URL = () => process.env.JES_REALTIME_URL || 'ws://localhost:4001/socket';
const TIMEOUT_MS = 5000;

// Circuit breaker state
let circuitState = 'closed'; // closed = healthy, open = failing, half-open = testing
let failureCount = 0;
let lastFailureTime = 0;
const FAILURE_THRESHOLD = 5;
const RECOVERY_TIMEOUT = 30000; // 30s before retrying

/**
 * Proxy a request to the Rust core service.
 * Includes circuit breaker pattern for resilience.
 */
export async function proxyToCore(path, method = 'GET', body = null, jwt = null) {
    // Circuit breaker check
    if (circuitState === 'open') {
        if (Date.now() - lastFailureTime > RECOVERY_TIMEOUT) {
            circuitState = 'half-open';
        } else {
            throw new Error('Circuit breaker OPEN: Rust core is unavailable');
        }
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const headers = { 'Content-Type': 'application/json' };
        if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

        const response = await fetch(`${CORE_URL()}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Core responded ${response.status}: ${errBody}`);
        }

        // Success — reset circuit breaker
        if (circuitState === 'half-open') {
            circuitState = 'closed';
            failureCount = 0;
        }

        return await response.json();
    } catch (error) {
        failureCount++;
        lastFailureTime = Date.now();

        if (failureCount >= FAILURE_THRESHOLD) {
            circuitState = 'open';
            console.error('[Gateway] Circuit breaker OPENED after', failureCount, 'failures');
        }

        throw error;
    }
}

/**
 * Get the WebSocket URL for the Elixir real-time service.
 */
export function getRealtimeUrl() {
    return REALTIME_URL();
}

/**
 * Check the health of the Rust core service.
 */
export async function coreHealth() {
    try {
        const res = await fetch(`${CORE_URL()}/health`, { signal: AbortSignal.timeout(3000) });
        return await res.json();
    } catch {
        return { status: 'unreachable' };
    }
}

export default { proxyToCore, getRealtimeUrl, coreHealth };
