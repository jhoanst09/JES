import { NextResponse } from 'next/server';
import { generateUploadUrl } from '@/src/utils/s3.server';
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from '@/src/utils/s3';

/**
 * POST /api/upload
 * 
 * Get presigned S3 upload URL.
 */
export async function POST(request) {
    try {
        const { fileName, contentType, folder = 'uploads' } = await request.json();

        if (!fileName || !contentType) {
            return NextResponse.json(
                { error: 'fileName and contentType are required' },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
        if (!allowedTypes.includes(contentType)) {
            return NextResponse.json(
                { error: 'File type not allowed' },
                { status: 400 }
            );
        }

        // Generate presigned URL
        const { uploadUrl, publicUrl, key } = await generateUploadUrl(fileName, contentType, folder);

        return NextResponse.json({
            uploadUrl,
            publicUrl,
            key,
        });

    } catch (error) {
        console.error('Upload URL error:', error);
        return NextResponse.json(
            { error: 'Failed to generate upload URL' },
            { status: 500 }
        );
    }
}
