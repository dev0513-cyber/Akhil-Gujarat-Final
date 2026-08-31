import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  B2_ENDPOINT,
  B2_REGION,
  B2_ACCESS_KEY_ID,
  B2_SECRET_ACCESS_KEY,
  B2_BUCKET_NAME,
} = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ ERROR: Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const s3 = new S3Client({
  region: B2_REGION || 'us-east-005',
  endpoint: B2_ENDPOINT,
  credentials: {
    accessKeyId: B2_ACCESS_KEY_ID || '',
    secretAccessKey: B2_SECRET_ACCESS_KEY || '',
  },
});

async function run() {
  console.log("🚀 Starting E-paper Seed...");

  const imagePath = path.join(__dirname, '../public/e-paper.png');
  let buffer;
  try {
    buffer = fs.readFileSync(imagePath);
  } catch (err) {
    console.error("❌ Failed to read public/e-paper.png", err);
    process.exit(1);
  }

  console.log(`☁️ Uploading e-paper.png to Backblaze B2...`);
  const key = `epaper-file-${Date.now()}.png`;
  
  try {
    await s3.send(new PutObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
    }));
  } catch (err) {
    console.error("❌ Failed to upload image to B2", err);
    process.exit(1);
  }

  const fileUrl = `/api/media/${key}`;
  console.log(`✅ Uploaded file: ${fileUrl}`);

  console.log("📝 Inserting 15 E-papers in database...");
  const now = new Date();
  
  for (let i = 0; i < 15; i++) {
    const pubDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
    const titleDate = pubDate.toISOString().split('T')[0];
    
    const epaper = {
      title: `E-paper - ${titleDate} - ${(i + 1).toString().padStart(2, '0')}`,
      published_date: titleDate,
      pdf_url: fileUrl,
      thumbnail_url: null, // As requested: "not as thumbnail as pdf thumbanail fetch autometic"
    };
    
    const { error } = await supabase.from('epapers').insert(epaper);
    if (error) {
      console.error(`❌ Error inserting epaper ${i + 1}:`, error);
    }
  }

  console.log(`✅ 15 E-papers added successfully!`);
}

run().catch(console.error);
