import { NextResponse } from 'next/server';
import { handleApiError, requireAdmin } from '../utils';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';


const B2_ENDPOINT = process.env.B2_ENDPOINT || '';
const B2_REGION = process.env.B2_REGION || 'us-east-005';
const B2_ACCESS_KEY_ID = process.env.B2_ACCESS_KEY_ID || '';
const B2_SECRET_ACCESS_KEY = process.env.B2_SECRET_ACCESS_KEY || '';
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || '';

// Initialize S3 Client for Backblaze B2
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
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const contentLength = req.headers.get('content-length');
    if (contentLength && Number.parseInt(contentLength, 10) > 20 * 1024 * 1024) { // 20MB hard limit for photos/epapers
      return NextResponse.json({ error: 'Payload Too Large' }, { status: 413 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const maxSize = 3 * 1024 * 1024; // 3MB limit for images/PDFs

    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File exceeds limit: 3MB' }, { status: 413 });
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported Media Type: ' + file.type }, { status: 415 });
    }

    const dangerousExtensions = /\.(exe|sh|bat|js|html|php|svg)$/i;
    if (dangerousExtensions.test(file.name)) {
      return NextResponse.json({ error: 'Dangerous file extension detected' }, { status: 400 });
    }

    const safe = String(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}-${safe}`;

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: path,
      Body: buffer,
      ContentType: file.type,
    });

    await s3.send(command);

    // Construct the local proxy URL since the bucket is private
    const publicUrl = `/api/media/${path}`;

    return NextResponse.json({ url: publicUrl }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return handleApiError(error);
  }
}

