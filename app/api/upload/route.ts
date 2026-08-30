import { NextResponse } from 'next/server';
import { withAdminApi } from '../wrappers';
import { logger } from '../../../src/lib/logger';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

import { s3, B2_BUCKET_NAME } from '../../../src/lib/b2';

const MAX_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|webp|gif|pdf)$/i;

function validatePdfSignature(buffer: Buffer): boolean {
  return buffer.length >= 5
    && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44
    && buffer[3] === 0x46 && buffer[4] === 0x2D;
}

async function optimizeImage(buffer: Buffer, fileType: string): Promise<{ body: Buffer; contentType: string }> {
  const metadata = await sharp(buffer).metadata();
  if (!['jpeg', 'png', 'webp', 'gif'].includes(metadata.format || '')) {
    throw new Error('INVALID_FORMAT');
  }
  if (metadata.format === 'gif') {
    return { body: buffer, contentType: fileType };
  }
  const optimized = await sharp(buffer).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  if (optimized.length < buffer.length) {
    return { body: optimized, contentType: 'image/webp' };
  }
  return { body: buffer, contentType: fileType };
}

async function processAndValidateBinary(fileType: string, buffer: Buffer): Promise<{ body?: Buffer; contentType?: string; error?: string; status?: number }> {
  if (fileType === 'application/pdf') {
    if (!validatePdfSignature(buffer)) {
      return { error: 'Invalid PDF binary signature', status: 415 };
    }
    return { body: buffer, contentType: fileType };
  }
  try {
    return await optimizeImage(buffer, fileType);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'INVALID_FORMAT') return { error: 'Invalid image format detected', status: 415 };
    return { error: 'Invalid or corrupt image file', status: 415 };
  }
}

function validateFileInput(file: File): NextResponse | null {
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File exceeds limit: 3MB' }, { status: 413 });
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported Media Type: ' + file.type }, { status: 415 });
  }
  if (!ALLOWED_EXTENSIONS.test(file.name)) {
    return NextResponse.json({ error: 'Invalid file extension' }, { status: 400 });
  }
  return null;
}

export const POST = withAdminApi(async (req) => {
  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_SIZE) {
      return NextResponse.json({ error: 'Payload Too Large' }, { status: 413 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileError = validateFileInput(file);
    if (fileError) return fileError;

    const safe = String(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}-${safe}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const binaryResult = await processAndValidateBinary(file.type, buffer);
    if (binaryResult.error) {
      return NextResponse.json({ error: binaryResult.error }, { status: binaryResult.status });
    }

    await s3.send(new PutObjectCommand({ Bucket: B2_BUCKET_NAME, Key: path, Body: binaryResult.body, ContentType: binaryResult.contentType }));

    return NextResponse.json({ url: `/api/media/${path}` }, { status: 201 });
  } catch (error) {
    logger.error('Upload error', error);
    throw error;
  }
});
