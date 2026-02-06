/**
 * AWS S3 Server Utilities
 * 
 * Server-side only - uses AWS SDK.
 * For client uploads, see src/utils/s3.js
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.AWS_S3_BUCKET;
const CDN_DOMAIN = process.env.NEXT_PUBLIC_CDN_DOMAIN;

export async function generateUploadUrl(fileName, contentType, folder = 'uploads') {
    const key = `${folder}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    const publicUrl = CDN_DOMAIN
        ? `https://${CDN_DOMAIN}/${key}`
        : `https://${BUCKET}.s3.amazonaws.com/${key}`;

    return {
        uploadUrl,
        publicUrl,
        key,
    };
}

export async function deleteFile(key) {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
    });

    await s3Client.send(command);
}
