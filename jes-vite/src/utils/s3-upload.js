'use client';
/**
 * AWS S3 Upload Utilities — with Media Deduplication
 * 
 * Flow:
 * 1. Compute SHA-256 client-side (Web Crypto API)
 * 2. Check jes-core if hash exists (instant response if duplicate)
 * 3. If new: upload via jes-core multipart → S3 dedup pipeline
 * 4. Return { mediaId, url }
 * 
 * @author Cloud Architect
 */

const JES_CORE_URL = process.env.NEXT_PUBLIC_JES_CORE_URL || 'http://localhost:4000';

// ==========================================
// CLIENT-SIDE SHA-256 HASH
// ==========================================

/**
 * Compute SHA-256 hash of a file using Web Crypto API
 * @param {File} file - File to hash
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
export async function computeFileHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==========================================
// DEDUP CHECK
// ==========================================

/**
 * Check if a file hash already exists in the media registry
 * @param {string} fileHash - SHA-256 hex hash
 * @returns {Promise<{exists: boolean, asset?: object}>}
 */
async function checkDuplicate(fileHash) {
    try {
        const res = await fetch(`${JES_CORE_URL}/api/media/check-hash`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_hash: fileHash }),
        });
        if (res.ok) return await res.json();
    } catch (err) {
        console.warn('[Dedup] Hash check failed, proceeding with upload:', err.message);
    }
    return { exists: false };
}

// ==========================================
// DEDUP UPLOAD (via jes-core)
// ==========================================

/**
 * Upload file with automatic deduplication
 * @param {File} file - File to upload
 * @param {string} folder - S3 folder (unused now, jes-core handles keys)
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<{url: string, mediaId: string, wasDuplicate: boolean}>}
 */
export async function uploadToS3(file, folder = 'uploads', onProgress = null) {
    try {
        // Step 1: Compute hash client-side
        if (onProgress) onProgress(5);
        const fileHash = await computeFileHash(file);
        if (onProgress) onProgress(15);

        // Step 2: Check if duplicate exists
        const { exists, asset } = await checkDuplicate(fileHash);
        if (exists && asset) {
            if (onProgress) onProgress(100);
            console.log(`[Dedup] ✅ Duplicate found! Saved ${(file.size / 1024).toFixed(0)}KB upload`);
            return {
                url: asset.cdn_url || asset.s3_url,
                mediaId: asset.id,
                wasDuplicate: true,
            };
        }

        // Step 3: Upload new file via jes-core multipart
        if (onProgress) onProgress(20);
        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await fetch(`${JES_CORE_URL}/api/media/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!uploadRes.ok) {
            const err = await uploadRes.text();
            throw new Error(`Upload failed: ${err}`);
        }

        if (onProgress) onProgress(90);
        const result = await uploadRes.json();
        if (onProgress) onProgress(100);

        return {
            url: result.url,
            mediaId: result.id,
            wasDuplicate: result.was_duplicate,
        };
    } catch (err) {
        // Fallback: try legacy presigned upload if jes-core is unreachable
        console.warn('[Dedup] jes-core upload failed, trying legacy route:', err.message);
        return await legacyUpload(file, folder, onProgress);
    }
}

/**
 * Legacy upload via Next.js API route (fallback when jes-core is unavailable)
 */
async function legacyUpload(file, folder, onProgress) {
    const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, folder }),
    });

    if (!res.ok) throw new Error('Legacy upload also failed');

    const { uploadUrl, publicUrl } = await res.json();

    await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        if (onProgress) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
            });
        }
        xhr.addEventListener('load', () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
    });

    return { url: publicUrl, mediaId: null, wasDuplicate: false };
}

// ==========================================
// UPLOAD HELPER WITH RETRY
// ==========================================

/**
 * Upload with automatic retry on failure
 * @param {File} file - File to upload
 * @param {object} options - Upload options
 * @returns {Promise<string>} Public URL
 */
export async function uploadWithRetry(file, options = {}) {
    const {
        folder = 'chat-media',
        maxRetries = 3,
        onProgress = null
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await uploadToS3(file, folder, onProgress);
        } catch (err) {
            lastError = err;
            console.warn(`Upload attempt ${attempt} failed:`, err.message);

            if (attempt < maxRetries) {
                // Wait before retry (exponential backoff)
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }

    throw lastError;
}

// ==========================================
// FILE VALIDATION
// ==========================================

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/quicktime'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
};

/**
 * Validate file before upload
 * @param {File} file - File to validate
 * @returns {{valid: boolean, error?: string, type?: string}}
 */
export function validateFile(file) {
    // Size check
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `Archivo muy grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB`
        };
    }

    // Type check
    let fileCategory = null;
    for (const [category, types] of Object.entries(ALLOWED_TYPES)) {
        if (types.includes(file.type)) {
            fileCategory = category;
            break;
        }
    }

    if (!fileCategory) {
        return {
            valid: false,
            error: 'Tipo de archivo no permitido'
        };
    }

    return {
        valid: true,
        type: fileCategory
    };
}

// ==========================================
// CLOUDFLARE CDN URL (if using CF in front of S3)
// ==========================================

/**
 * Convert S3 URL to Cloudflare CDN URL
 * @param {string} s3Url - Original S3 URL
 * @returns {string} CDN URL
 */
export function toCDNUrl(s3Url) {
    const cdnDomain = process.env.NEXT_PUBLIC_CDN_DOMAIN;
    if (!cdnDomain) return s3Url;

    // Replace S3 domain with CDN domain
    try {
        const url = new URL(s3Url);
        return `https://${cdnDomain}${url.pathname}`;
    } catch {
        return s3Url;
    }
}

export default {
    computeFileHash,
    uploadToS3,
    uploadWithRetry,
    validateFile,
    toCDNUrl
};
