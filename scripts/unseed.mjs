import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

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

async function removeSupabaseData() {
  console.log("🗑️ Removing seeded articles from Supabase...");
  // Delete by slug first
  let { error: artError1 } = await supabase
    .from('articles')
    .delete()
    .like('slug', '%seed%'); // Broadened to catch anything with seed
  if (artError1) console.error("❌ Error deleting articles by slug:", artError1);
  
  // Delete by description (in case slug missed some)
  let { error: artError2 } = await supabase
    .from('articles')
    .delete()
    .eq('description', "આ એક અગત્યના સમાચાર છે જે રાજ્યના અનેક લોકોને સ્પર્શે છે. (Seed Description)");
  if (artError2) console.error("❌ Error deleting articles by description:", artError2);
  else console.log("✅ Seeded articles deleted.");

  console.log("🗑️ Removing seeded epapers from Supabase...");
  let { error: epError } = await supabase
    .from('epapers')
    .delete()
    .like('title', '%(Seed)%');
  
  if (epError) console.error("❌ Error deleting epapers:", epError);
  else console.log("✅ Seeded epapers deleted.");
}

async function removeB2Data() {
  console.log("☁️ Fetching seeded files from B2 bucket...");
  try {
    let isTruncated = true;
    let continuationToken = undefined;
    let totalDeleted = 0;

    while (isTruncated) {
      const listCommand = new ListObjectsV2Command({
        Bucket: B2_BUCKET_NAME,
        ContinuationToken: continuationToken,
      });
      
      const response = await s3.send(listCommand);
      const { Contents, IsTruncated, NextContinuationToken } = response;
      
      if (!Contents || Contents.length === 0) {
        break;
      }

      const seedFiles = Contents
        .filter(file => file.Key && file.Key.toLowerCase().includes('seed'))
        .map(file => ({ Key: file.Key }));
      
      if (seedFiles.length > 0) {
        console.log(`🗑️ Deleting ${seedFiles.length} seed files from B2 (batch)...`);
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: B2_BUCKET_NAME,
          Delete: {
            Objects: seedFiles,
            Quiet: false,
          }
        });

        const delRes = await s3.send(deleteCommand);
        if (delRes.Errors && delRes.Errors.length > 0) {
          console.error("❌ Errors deleting some files from B2:", delRes.Errors);
        } else {
          totalDeleted += delRes.Deleted?.length || 0;
        }
      }

      isTruncated = IsTruncated;
      continuationToken = NextContinuationToken;
    }

    console.log(`✅ Total seed files deleted from B2: ${totalDeleted}`);

  } catch (error) {
    console.error("❌ Failed to clean B2 bucket:", error);
  }
}

async function run() {
  await removeSupabaseData();
  await removeB2Data();
  console.log("🎉 Complete unseed process finished!");
}

try {
  await run();
} catch (error) {
  console.error(error);
}
