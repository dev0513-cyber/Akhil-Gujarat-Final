import { NextResponse } from 'next/server';
import { withAdminApi } from '../wrappers';
import { logger } from '../../../src/lib/logger';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { s3, B2_BUCKET_NAME } from '../../../src/lib/b2';

export const POST = withAdminApi(async (req) => {
  try {
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
    throw error;
  }
});
