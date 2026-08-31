import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { handleApiError } from '../../utils';
import { logger } from '../../../../src/lib/logger';

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

    const { searchParams } = new URL(req.url);
    const isDownload = searchParams.get('download') === '1';

    const command = new GetObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: key,
      ...(isDownload && { ResponseContentDisposition: `attachment; filename="${key}"` }),
    });

    // Generate a pre-signed URL valid for 1 hour
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    const response = NextResponse.redirect(signedUrl, 307);
    
    // Cache the redirect itself at the Vercel Edge for ~50 minutes, since the signed URL expires in 60 mins.
    // This eliminates Vercel execution time for repeated requests while supporting byte ranges natively via B2.
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3000, stale-while-revalidate=300, immutable');
    
    return response;
  } catch (error) {
    logger.error('Media proxy error', error);
    return handleApiError(error);
  }
}
