/**
 * JES Store - End-to-End Encryption Service
 * Implements double-layer AES-256-GCM encryption using Web Crypto API
 * 
 * Layer 1: User-derived key (from password/user ID)
 * Layer 2: Session key (unique per conversation)
 */

// Generate a random key for session encryption
export async function generateSessionKey() {
    const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
    return key;
}

// Export key to storable format
export async function exportKey(key) {
    const exported = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Import key from stored format
export async function importKey(keyString) {
    const keyData = Uint8Array.from(atob(keyString), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

// Derive a key from user ID (for Layer 1)
export async function deriveUserKey(userId, salt = 'jes-store-salt-v1') {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(userId),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

// Encrypt with a single layer
async function encryptLayer(plaintext, key) {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(plaintext)
    );

    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
}

// Decrypt a single layer
async function decryptLayer(ciphertext, key) {
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );

    return new TextDecoder().decode(decrypted);
}

/**
 * Double-layer encryption
 * @param {string} message - The plaintext message
 * @param {CryptoKey} userKey - Layer 1 key (derived from user)
 * @param {CryptoKey} sessionKey - Layer 2 key (session-specific)
 * @returns {string} Base64 encoded double-encrypted message
 */
export async function encryptMessage(message, userKey, sessionKey) {
    // Layer 1: Encrypt with user key
    const layer1 = await encryptLayer(message, userKey);
    // Layer 2: Encrypt with session key
    const layer2 = await encryptLayer(layer1, sessionKey);
    return layer2;
}

/**
 * Double-layer decryption
 * @param {string} encryptedMessage - Base64 encoded double-encrypted message
 * @param {CryptoKey} userKey - Layer 1 key
 * @param {CryptoKey} sessionKey - Layer 2 key
 * @returns {string} The original plaintext message
 */
export async function decryptMessage(encryptedMessage, userKey, sessionKey) {
    try {
        // Layer 2: Decrypt with session key first
        const layer1 = await decryptLayer(encryptedMessage, sessionKey);
        // Layer 1: Decrypt with user key
        const plaintext = await decryptLayer(layer1, userKey);
        return plaintext;
    } catch (error) {
        console.error('Decryption failed:', error);
        return '[Mensaje cifrado - No se pudo descifrar]';
    }
}

/**
 * Generate a shared conversation key from two user IDs
 * This ensures both users can decrypt the same messages
 */
export async function generateConversationKey(userId1, userId2) {
    // Sort IDs to ensure consistency regardless of who sends
    const sortedIds = [userId1, userId2].sort().join(':');
    return await deriveUserKey(sortedIds, 'jes-conversation-key-v1');
}
