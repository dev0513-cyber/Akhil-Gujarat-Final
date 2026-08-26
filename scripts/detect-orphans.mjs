import { createClient } from '@supabase/supabase-js';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const B2_ENDPOINT = process.env.B2_ENDPOINT || '';
const B2_REGION = process.env.B2_REGION || 'us-east-005';
const B2_ACCESS_KEY_ID = process.env.B2_ACCESS_KEY_ID || '';
const B2_SECRET_ACCESS_KEY = process.env.B2_SECRET_ACCESS_KEY || '';
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || '';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!B2_ACCESS_KEY_ID || !SUPABASE_URL) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const s3 = new S3Client({
  region: B2_REGION,
  endpoint: B2_ENDPOINT,
  credentials: {
    accessKeyId: B2_ACCESS_KEY_ID,
    secretAccessKey: B2_SECRET_ACCESS_KEY,
  },
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function detectOrphans() {
  console.log('Fetching all B2 objects...');
  const s3Keys = new Set();
  let continuationToken = undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: B2_BUCKET_NAME,
      ContinuationToken: continuationToken,
    });
    const response = await s3.send(command);
    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) s3Keys.add(obj.Key);
      }
    }
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log(`Found ${s3Keys.size} objects in B2.`);

  console.log('Fetching database references...');
  const dbKeys = new Set();

  // Articles
  const { data: articles } = await supabase.from('articles').select('image_url, extra_images');
  if (articles) {
    for (const a of articles) {
      if (a.image_url && a.image_url.startsWith('/api/media/')) {
        dbKeys.add(a.image_url.replace('/api/media/', ''));
      }
      if (a.extra_images && Array.isArray(a.extra_images)) {
        for (const img of a.extra_images) {
          if (typeof img === 'string' && img.startsWith('/api/media/')) {
            dbKeys.add(img.replace('/api/media/', ''));
          }
        }
      }
    }
  }

  // EPapers
  const { data: epapers } = await supabase.from('epapers').select('thumbnail_url, pdf_url');
  if (epapers) {
    for (const e of epapers) {
      if (e.thumbnail_url && e.thumbnail_url.startsWith('/api/media/')) dbKeys.add(e.thumbnail_url.replace('/api/media/', ''));
      if (e.pdf_url && e.pdf_url.startsWith('/api/media/')) dbKeys.add(e.pdf_url.replace('/api/media/', ''));
    }
  }

  // Ads
  const { data: ads } = await supabase.from('ads').select('image_url');
  if (ads) {
    for (const ad of ads) {
      if (ad.image_url && ad.image_url.startsWith('/api/media/')) dbKeys.add(ad.image_url.replace('/api/media/', ''));
    }
  }

  console.log(`Found ${dbKeys.size} unique file references in database.`);

  const orphans = [];
  for (const key of s3Keys) {
    if (!dbKeys.has(key)) {
      orphans.push(key);
    }
  }

  console.log(`\n=== ORPHAN REPORT ===`);
  console.log(`Total Orphans Detected: ${orphans.length}`);

  if (orphans.length > 0) {
    console.log('Orphaned Keys (first 50):');
    orphans.slice(0, 50).forEach(k => console.log(`- ${k}`));
    console.log('\nTo clean up these files, a manual review is recommended before deletion.');
  } else {
    console.log('No orphaned files found! Storage is clean.');
  }
}

detectOrphans().catch(console.error);
