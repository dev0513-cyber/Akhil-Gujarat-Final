import { createClient } from '@supabase/supabase-js';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'node:path';

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

/** Collect all object keys from a single paginated S3 response page */
function collectPageKeys(contents, keySet) {
  for (const obj of contents) {
    if (obj.Key) keySet.add(obj.Key);
  }
}

/** List all object keys in the B2 bucket, handling pagination. */
async function fetchB2Keys(s3Client) {
  const s3Keys = new Set();
  let continuationToken;
  do {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: B2_BUCKET_NAME,
      ContinuationToken: continuationToken,
    }));
    if (response.Contents) collectPageKeys(response.Contents, s3Keys);
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);
  return s3Keys;
}

/** Extract media keys referenced by a field that may start with /api/media/ */
function addMediaKey(url, keySet) {
  if (url?.startsWith('/api/media/')) keySet.add(url.replace('/api/media/', ''));
}

/** Collect all media keys referenced in article records. */
function collectArticleKeys(articles, keySet) {
  for (const a of articles) {
    addMediaKey(a.image_url, keySet);
    if (Array.isArray(a.extra_images)) {
      for (const img of a.extra_images) {
        if (typeof img === 'string') addMediaKey(img, keySet);
      }
    }
  }
}

/** Collect all media keys referenced in epaper records. */
function collectEpaperKeys(epapers, keySet) {
  for (const e of epapers) {
    addMediaKey(e.thumbnail_url, keySet);
    addMediaKey(e.pdf_url, keySet);
  }
}

/** Collect all media keys referenced in ad records. */
function collectAdKeys(ads, keySet) {
  for (const ad of ads) {
    addMediaKey(ad.image_url, keySet);
  }
}

/** Fetch all media keys currently referenced in the database. */
async function fetchDatabaseKeys(dbClient) {
  const dbKeys = new Set();
  const { data: articles } = await dbClient.from('articles').select('image_url, extra_images');
  if (articles) collectArticleKeys(articles, dbKeys);
  const { data: epapers } = await dbClient.from('epapers').select('thumbnail_url, pdf_url');
  if (epapers) collectEpaperKeys(epapers, dbKeys);
  const { data: ads } = await dbClient.from('ads').select('image_url');
  if (ads) collectAdKeys(ads, dbKeys);
  return dbKeys;
}

/** Find keys present in storage but not referenced by the database. */
function findOrphans(s3Keys, dbKeys) {
  const orphans = [];
  for (const key of s3Keys) {
    if (!dbKeys.has(key)) orphans.push(key);
  }
  return orphans;
}

/** Log the orphan report to stdout. */
function reportOrphans(orphans) {
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

async function detectOrphans() {
  console.log('Fetching all B2 objects...');
  const s3Keys = await fetchB2Keys(s3);
  console.log(`Found ${s3Keys.size} objects in B2.`);

  console.log('Fetching database references...');
  const dbKeys = await fetchDatabaseKeys(supabase);
  console.log(`Found ${dbKeys.size} unique file references in database.`);

  reportOrphans(findOrphans(s3Keys, dbKeys));
}

try {
  await detectOrphans();
} catch (error) {
  console.error(error);
}
