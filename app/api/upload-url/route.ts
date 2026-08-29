import { NextResponse } from 'next/server';
import { handleApiError, requireAdminMutation } from '../utils';
import { logger } from '../../../src/lib/logger';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const B2_ENDPOINT = process.env.B2_ENDPOINT || '';
const B2_REGION = process.env.B2_REGION || 'us-east-005';
const B2_ACCESS_KEY_ID = process.env.B2_ACCESS_KEY_ID || '';
const B2_SECRET_ACCESS_KEY = process.env.B2_SECRET_ACCESS_KEY || '';
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || '';

const s3 = new S3Client({
  region: B2_REGION,
  endpoint: B2_ENDPOINT,
  credentials: {
    accessKeyId: B2_ACCESS_KEY_ID,
    secretAccessKey: B2_SECRET_ACCESS_KEY,
  },
});

export async function POST(req: Request) {
  try {
    const adminError = await requireAdminMutation(req);
    if (adminError) return adminError;

    const body = await req.json();
    const { filename, contentType, size } = body;

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'filename and contentType required' }, { status: 400 });
    }

    // Limit direct uploads to 50MB (Standard newspaper PDF size + buffer)
    const maxSize = 50 * 1024 * 1024;
    if (size && size > maxSize) {
      return NextResponse.json({ error: 'File exceeds limit: 50MB' }, { status: 413 });
    }

    if (contentType !== 'application/pdf') {
      return NextResponse.json({ error: 'Direct upload is only supported for PDFs' }, { status: 415 });
    }

    const allowedExtensions = /\.pdf$/i;
    if (!allowedExtensions.test(filename)) {
      return NextResponse.json({ error: 'Invalid file extension. Must be a .pdf' }, { status: 400 });
    }

    const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}-${safe}`;

    const command = new PutObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: path,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 }); // 10 minutes
    const publicUrl = `/api/media/${path}`;

    return NextResponse.json({ uploadUrl, publicUrl }, { status: 201 });
  } catch (error) {
    logger.error('Presigned URL generation error', error);
    return handleApiError(error);
  }
}
