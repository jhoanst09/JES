import { NextResponse } from 'next/server';

/**
 * POST /api/upload/presign
 * 
 * Placeholder - S3 presigned URLs disabled while stabilizing Redis session.
 * Will re-enable after session is 100% stable.
 */
export async function POST(request) {
    return NextResponse.json(
        {
            error: 'S3 uploads temporarily disabled. Using Supabase storage.',
            message: 'Please use Supabase storage for file uploads'
        },
        { status: 503 }
    );
}
