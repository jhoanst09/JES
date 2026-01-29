/**
 * Cloudinary Service for JES Store
 * Handles image uploads and URL generation.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || process.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

/**
 * Generates a Cloudinary URL with transformations
 * @param {string} publicId - The public ID of the resource
 * @param {object} options - Transformation options (w, h, q, f, etc.)
 */
export const getCloudinaryUrl = (publicId, options = {}) => {
    if (!publicId) return '';
    if (publicId.startsWith('http')) return publicId; // Fallback if already a URL

    const { width, height, crop = 'fill', quality = 'auto', format = 'auto' } = options;

    let transformations = `q_${quality},f_${format}`;
    if (width) transformations += `,w_${width}`;
    if (height) transformations += `,h_${height}`;
    if (crop) transformations += `,c_${crop}`;

    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformations}/${publicId}`;
};

/**
 * Upload a file to Cloudinary using unsigned upload
 * @param {File} file - The file to upload
 * @returns {Promise<{public_id: string, secure_url: string, format: string, resource_type: string}>}
 */
export const uploadToCloudinary = async (file) => {
    if (!CLOUD_NAME || CLOUD_NAME === 'demo') {
        console.warn('Cloudinary not configured. Using local fallback.');
        // Return a local URL for development
        return {
            public_id: `local_${Date.now()}`,
            secure_url: URL.createObjectURL(file),
            format: file.type.split('/')[1],
            resource_type: file.type.startsWith('video') ? 'video' : 'image'
        };
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'jes-community');

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
            {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const data = await response.json();

        return {
            public_id: data.public_id,
            secure_url: data.secure_url,
            format: data.format,
            resource_type: data.resource_type
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        // Fallback to local URL
        return {
            public_id: `fallback_${Date.now()}`,
            secure_url: URL.createObjectURL(file),
            format: file.type.split('/')[1],
            resource_type: file.type.startsWith('video') ? 'video' : 'image'
        };
    }
};

/**
 * Delete an image from Cloudinary (requires server-side implementation)
 * Note: This is just a placeholder - actual deletion requires signed requests
 */
export const deleteFromCloudinary = async (publicId) => {
    console.warn('Cloudinary deletion requires server-side implementation with signed requests.');
    return { success: false, message: 'Server-side deletion not implemented' };
};
