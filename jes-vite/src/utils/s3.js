/**
 * S3 Upload Helper (Client-safe)
 * 
 * Uses presigned URLs from API to upload directly to S3.
 * No AWS SDK imports - safe for client-side use.
 */

export async function uploadToS3(file, folder = 'uploads') {
    // 1. Get presigned URL from API
    const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            folder,
        }),
    });

    if (!res.ok) {
        throw new Error('Failed to get upload URL');
    }

    const { uploadUrl, publicUrl } = await res.json();

    // 2. Upload directly to S3
    const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type,
        },
    });

    if (!uploadRes.ok) {
        throw new Error('Failed to upload file');
    }

    return publicUrl;
}

// File type constants for validation
export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
];

export const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function validateFile(file, allowedTypes = ALLOWED_IMAGE_TYPES) {
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: 'File too large (max 50MB)' };
    }

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'File type not allowed' };
    }

    return { valid: true, error: null };
}
