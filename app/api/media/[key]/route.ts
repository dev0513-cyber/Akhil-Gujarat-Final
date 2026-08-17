import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { handleApiError } from '../../utils';

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

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const { key } = await params;
    if (!key) return new NextResponse('Not Found', { status: 404 });

    const command = new GetObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: key,
    });

    const response = await s3.send(command);

    if (!response.Body) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Convert the readable stream from AWS SDK to a Web ReadableStream
    const stream = response.Body.transformToWebStream();

    const headers = new Headers();
    if (response.ContentType) headers.set('Content-Type', response.ContentType);
    if (response.ContentLength) headers.set('Content-Length', response.ContentLength.toString());
    headers.set('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year

    return new NextResponse(stream, { headers });
  } catch (error) {
    const err = error as Error & { name?: string };
    if (err.name === 'NoSuchKey') {
      return new NextResponse('Not Found', { status: 404 });
    }
    console.error('Media proxy error:', error);
    return handleApiError(error);
  }
}
