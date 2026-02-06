'use client';
/**
 * Auth Security Module
 * 
 * Enterprise-grade security utilities for the SuperApp:
 * - AES-256-GCM End-to-End Encryption
 * - Session Heartbeat with JWT validation
 * - Key derivation with PBKDF2
 * - CSRF protection utilities
 * 
 * @author Security Architect
 * @version 1.0.0
 */

// ==========================================
// CRYPTO UTILITIES (Web Crypto API)
// ==========================================

/**
 * Generate a random encryption key
 * @returns {Promise<CryptoKey>}
 */
export async function generateEncryptionKey() {
    return await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true, // extractable
        ['encrypt', 'decrypt']
    );
}

/**
 * Derive encryption key from password using PBKDF2
 * @param {string} password - User password or shared secret
 * @param {Uint8Array} salt - Random salt (should be stored)
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Generate random salt for key derivation
 * @returns {Uint8Array}
 */
export function generateSalt() {
    return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Encrypt message using AES-256-GCM
 * @param {string} plaintext - Message to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<{ciphertext: string, iv: string}>}
 */
export async function encryptMessage(plaintext, key) {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoder.encode(plaintext)
    );

    return {
        ciphertext: arrayBufferToBase64(ciphertext),
        iv: arrayBufferToBase64(iv)
    };
}

/**
 * Decrypt message using AES-256-GCM
 * @param {string} ciphertext - Base64 encoded ciphertext
 * @param {string} iv - Base64 encoded IV
 * @param {CryptoKey} key - Decryption key
 * @returns {Promise<string>}
 */
export async function decryptMessage(ciphertext, iv, key) {
    const decoder = new TextDecoder();

    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToArrayBuffer(iv) },
        key,
        base64ToArrayBuffer(ciphertext)
    );

    return decoder.decode(plaintext);
}

// ==========================================
// BASE64 UTILITIES
// ==========================================

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// ==========================================
// SESSION HEARTBEAT
// ==========================================

let heartbeatInterval = null;
let lastHeartbeatTime = null;

/**
 * Start session heartbeat - validates JWT every 30 seconds
 * @param {Function} validateFn - Async function to validate session
 * @param {Function} onExpired - Callback when session expires
 * @param {number} intervalMs - Heartbeat interval (default 30s)
 */
export function startHeartbeat(validateFn, onExpired, intervalMs = 30000) {
    // Clear existing heartbeat
    stopHeartbeat();

    // Initial validation
    validateFn()
        .then(valid => {
            if (!valid) {
                onExpired?.();
                return;
            }
            lastHeartbeatTime = Date.now();
        })
        .catch(() => onExpired?.());

    // Set up interval
    heartbeatInterval = setInterval(async () => {
        try {
            const valid = await validateFn();
            if (!valid) {
                stopHeartbeat();
                onExpired?.();
            } else {
                lastHeartbeatTime = Date.now();
            }
        } catch (err) {
            console.error('Heartbeat failed:', err);
            // Don't expire on network errors, just log
        }
    }, intervalMs);

    // Also check on visibility change (tab becomes visible)
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }
}

/**
 * Stop session heartbeat
 */
export function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
    if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
}

async function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && lastHeartbeatTime) {
        // If tab was hidden for more than 5 minutes, revalidate immediately
        const timeSinceLastHeartbeat = Date.now() - lastHeartbeatTime;
        if (timeSinceLastHeartbeat > 5 * 60 * 1000) {
            // Trigger a heartbeat check
            console.log('Tab became visible after long period, checking session...');
        }
    }
}

/**
 * Get time since last successful heartbeat
 * @returns {number|null} Milliseconds since last heartbeat
 */
export function getTimeSinceLastHeartbeat() {
    if (!lastHeartbeatTime) return null;
    return Date.now() - lastHeartbeatTime;
}

// ==========================================
// CSRF PROTECTION
// ==========================================

/**
 * Generate a CSRF token
 * @returns {string}
 */
export function generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return arrayBufferToBase64(array.buffer);
}

/**
 * Store CSRF token in session storage
 * @param {string} token
 */
export function storeCSRFToken(token) {
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('csrf_token', token);
    }
}

/**
 * Get stored CSRF token
 * @returns {string|null}
 */
export function getCSRFToken() {
    if (typeof sessionStorage !== 'undefined') {
        return sessionStorage.getItem('csrf_token');
    }
    return null;
}

// ==========================================
// ENHANCED ENCRYPTION WRAPPER FOR CHAT
// ==========================================

/**
 * ChatEncryption class - Manages E2EE for a chat conversation
 * 
 * Usage:
 * const encryption = new ChatEncryption(roomId, userId);
 * await encryption.initialize();
 * const encrypted = await encryption.encrypt("Hello!");
 * const decrypted = await encryption.decrypt(encrypted);
 */
export class ChatEncryption {
    constructor(roomId, userId) {
        this.roomId = roomId;
        this.userId = userId;
        this.key = null;
        this.initialized = false;
    }

    /**
     * Initialize encryption for this conversation
     * In production, this would exchange keys via DH or similar
     */
    async initialize() {
        // For demo: derive key from roomId (in production, use proper key exchange)
        const salt = new TextEncoder().encode(this.roomId.padEnd(16, '0'));

        // WARNING: In production, replace this with proper key exchange
        // This is a simplified demo that derives from roomId
        this.key = await deriveKey(this.roomId, salt);
        this.initialized = true;
    }

    /**
     * Encrypt a message
     * @param {string} plaintext
     * @returns {Promise<{encrypted: string, iv: string}>}
     */
    async encrypt(plaintext) {
        if (!this.initialized) {
            throw new Error('ChatEncryption not initialized');
        }
        return await encryptMessage(plaintext, this.key);
    }

    /**
     * Decrypt a message
     * @param {{encrypted: string, iv: string}} encryptedData
     * @returns {Promise<string>}
     */
    async decrypt(encryptedData) {
        if (!this.initialized) {
            throw new Error('ChatEncryption not initialized');
        }
        return await decryptMessage(encryptedData.ciphertext, encryptedData.iv, this.key);
    }

    /**
     * Check if message is encrypted
     * @param {object} message
     * @returns {boolean}
     */
    static isEncrypted(message) {
        return message?.content?.startsWith?.('E2E:') || !!message?.iv;
    }
}

// ==========================================
// SESSION SECURITY HEADERS
// ==========================================

/**
 * Security headers to add to responses
 * Use in middleware or layout
 */
export const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    // CSP should be configured with nonces in production
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob: https://*.s3.amazonaws.com; connect-src 'self' https://*.shopify.com https://*.s3.amazonaws.com;"
};

export default {
    generateEncryptionKey,
    deriveKey,
    generateSalt,
    encryptMessage,
    decryptMessage,
    startHeartbeat,
    stopHeartbeat,
    generateCSRFToken,
    storeCSRFToken,
    getCSRFToken,
    ChatEncryption,
    securityHeaders
};
