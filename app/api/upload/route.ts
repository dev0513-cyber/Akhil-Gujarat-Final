import { NextResponse } from 'next/server';
import { handleApiError, requireAdminMutation } from '../utils';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';


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
const adminError = await requireAdminMutation(req);
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

    const allowedExtensions = /\.(jpg|jpeg|png|webp|gif|pdf)$/i;
    if (!allowedExtensions.test(file.name)) {
      return NextResponse.json({ error: 'Invalid file extension' }, { status: 400 });
    }

    const safe = String(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}-${safe}`;

// Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let body = buffer;
    let contentType = file.type;

    // Optimize images (except GIF, which may be animated) to WebP, max 1600px wide.
    // Keeps stored files small so the /api/media proxy streams quickly on first fetch.
    if (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp') {
      try {
        const optimized = await sharp(buffer)
          .rotate()
          .resize({ width: 1600, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        if (optimized.length < buffer.length) {
          body = optimized;
          contentType = 'image/webp';
        }
      } catch {
        // Fall back to the original bytes if optimization fails
      }
    }

    // Upload to Backblaze B2
    const command = new PutObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: path,
      Body: body,
      ContentType: contentType,
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

