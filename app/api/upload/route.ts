import { NextResponse } from 'next/server';
import { withAdminApi } from '../wrappers';
import { logger } from '../../../src/lib/logger';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

import { s3, B2_BUCKET_NAME } from '../../../src/lib/b2';

async function processAndValidateBinary(fileType: string, buffer: Buffer) {
  if (fileType === 'application/pdf') {
    if (buffer.length < 5 || buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46 || buffer[4] !== 0x2D) {
      return { error: 'Invalid PDF binary signature', status: 415 };
    }
    return { body: buffer, contentType: fileType };
  }
  
  try {
    const metadata = await sharp(buffer).metadata();
    if (!['jpeg', 'png', 'webp', 'gif'].includes(metadata.format || '')) {
      return { error: 'Invalid image format detected', status: 415 };
    }
    
    if (metadata.format !== 'gif') {
      const optimized = await sharp(buffer)
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      if (optimized.length < buffer.length) {
        return { body: optimized, contentType: 'image/webp' };
      }
    }
    return { body: buffer, contentType: fileType };
  } catch {
    return { error: 'Invalid or corrupt image file', status: 415 };
  }
}

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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const binaryResult = await processAndValidateBinary(file.type, buffer);
    if (binaryResult.error) {
      return NextResponse.json({ error: binaryResult.error }, { status: binaryResult.status });
    }
    const { body, contentType } = binaryResult;

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
