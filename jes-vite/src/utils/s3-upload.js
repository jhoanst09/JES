'use client';
/**
 * AWS S3 Upload Utilities
 * 
 * Provides presigned URL uploads directly to S3 without saturating the server.
 * Files are uploaded client-side, bypassing Vercel's 4.5MB limit.
 * 
 * SETUP:
 * Add to .env.local:
 *   AWS_REGION=us-east-1
 *   AWS_ACCESS_KEY_ID=your-key
 *   AWS_SECRET_ACCESS_KEY=your-secret
 *   AWS_S3_BUCKET=your-bucket
 * 
 * @author Cloud Architect
 */

// ==========================================
// PRESIGNED URL FETCHER
// ==========================================

/**
 * Get a presigned URL from our API route
 * @param {string} fileName - Original file name
 * @param {string} fileType - MIME type
 * @param {string} folder - S3 folder (e.g., 'chat-media', 'avatars')
 * @returns {Promise<{uploadUrl: string, fileUrl: string, key: string}>}
 */
export async function getPresignedUrl(fileName, fileType, folder = 'chat-media') {
    try {
        const response = await fetch('/api/upload/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName, fileType, folder })
        });

        if (!response.ok) {
            throw new Error('Failed to get presigned URL');
        }

        return await response.json();
    } catch (err) {
        console.error('Presigned URL error:', err);
        throw err;
    }
}

// ==========================================
// DIRECT S3 UPLOAD
// ==========================================

/**
 * Upload file directly to S3 using presigned URL
 * @param {File} file - File to upload
 * @param {string} folder - S3 folder
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} Public URL of uploaded file
 */
export async function uploadToS3(file, folder = 'chat-media', onProgress = null) {
    try {
        // Step 1: Get presigned URL from our API
        const { uploadUrl, fileUrl, key } = await getPresignedUrl(
            file.name,
            file.type,
            folder
        );

        // Step 2: Upload directly to S3
        await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Progress tracking
            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        onProgress(percent);
                    }
                });
            }

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.response);
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => reject(new Error('Upload failed')));
            xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
        });

        return fileUrl;
    } catch (err) {
        console.error('S3 upload error:', err);
        throw err;
    }
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
    getPresignedUrl,
    uploadToS3,
    uploadWithRetry,
    validateFile,
    toCDNUrl
};
