import { NextResponse } from 'next/server';
import { withAdminApi } from '../wrappers';
import { logger } from '../../../src/lib/logger';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

import { s3, B2_BUCKET_NAME } from '../../../src/lib/b2';

export const POST = withAdminApi(async (req) => {
  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength && Number.parseInt(contentLength, 10) > 3 * 1024 * 1024) { // 3MB hard limit for photos/epapers
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

    // Enforce binary validation
    if (file.type === 'application/pdf') {
      // PDF magic bytes: %PDF- (25 50 44 46 2D)
      if (buffer.length < 5 || buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46 || buffer[4] !== 0x2D) {
        return NextResponse.json({ error: 'Invalid PDF binary signature' }, { status: 415 });
      }
    } else {
      // For images, force Sharp to parse the metadata. If it fails, it's not a real image.
      try {
        const metadata = await sharp(buffer).metadata();
        if (!['jpeg', 'png', 'webp', 'gif'].includes(metadata.format || '')) {
          return NextResponse.json({ error: 'Invalid image format detected' }, { status: 415 });
        }
        
        // Optimize images (except GIF) to WebP, max 1600px wide.
        if (metadata.format !== 'gif') {
          const optimized = await sharp(buffer)
            .rotate()
            .resize({ width: 1600, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          if (optimized.length < buffer.length) {
            body = optimized;
            contentType = 'image/webp';
          }
        }
      } catch {
        return NextResponse.json({ error: 'Invalid or corrupt image file' }, { status: 415 });
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
    logger.error('Upload error', error);
    throw error;
  }
});
