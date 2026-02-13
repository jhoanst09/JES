import { NextResponse } from 'next/server';
import { generateUploadUrl } from '@/src/utils/s3.server';

/**
 * POST /api/upload
 * 
 * Get presigned S3 upload URL.
 * Accepts any file type for general uploads.
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

        // Max file size validation happens client-side
        // Allow all common file types
        const blockedTypes = ['application/x-msdownload', 'application/x-executable'];
        if (blockedTypes.includes(contentType)) {
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
