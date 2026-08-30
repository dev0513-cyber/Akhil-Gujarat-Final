import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import https from 'https';

// --- CONFIGURATION ---
const {
  SEED_SUPABASE_CONFIRM,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  B2_ENDPOINT,
  B2_REGION,
  B2_ACCESS_KEY_ID,
  B2_SECRET_ACCESS_KEY,
  B2_BUCKET_NAME,
} = process.env;

if (SEED_SUPABASE_CONFIRM !== 'YES') {
  console.error("❌ ERROR: SEED_SUPABASE_CONFIRM=YES is not set. Aborting to protect production data.");
  process.exit(1);
}

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

// --- CONSTANTS & HELPERS ---
const TOTAL_ARTICLES = 365;
const TOTAL_EPAPERS = 365;
const UNIQUE_IMAGES_COUNT = 25; // Fetch 25 unique random images

const GUJARATI_HEADLINES = [
  "અમદાવાદમાં ભારે વરસાદની આગાહી, તંત્ર એલર્ટ મોડ પર",
  "રાજ્યમાં શિક્ષણ ક્ષેત્રે નવા નિયમો અંગે મહત્વપૂર્ણ જાહેરાત",
  "સૌરાષ્ટ્રમાં ખેડૂતો માટે નવી સહાય યોજના જાહેર",
  "શેરબજારમાં ઉછાળો: સેન્સેક્સ નવા શિખરે પહોંચ્યો",
  "ગુજરાત વિધાનસભા ચૂંટણી: પક્ષોએ તૈયારીઓ તેજ કરી",
  "સુરતમાં ડાયમંડ બુર્સનું ભવ્ય ઉદ્ઘાટન",
  "રાજકોટમાં નવો ફ્લાયઓવર ખુલ્લો મુકાયો",
  "વડોદરામાં એમ.એસ. યુનિવર્સિટીનો નવો અભ્યાસક્રમ",
  "ગીરના જંગલમાં સિંહોની વસ્તીમાં નોંધપાત્ર વધારો",
  "કચ્છના રણોત્સવમાં આ વર્ષે રેકોર્ડબ્રેક પ્રવાસીઓ",
  "સ્માર્ટ સિટી પ્રોજેક્ટ: ગાંધીનગરમાં નવી સુવિધાઓ",
  "ગુજરાતમાં વિદેશી રોકાણ આકર્ષવા સરકારની નવી નીતિ",
  "આરોગ્ય ક્ષેત્રે મોટી જાહેરાત: નવી હોસ્પિટલો બનશે",
  "ખેતીમાં આધુનિક ટેકનોલોજીના ઉપયોગ અંગે માર્ગદર્શન",
  "રાજ્યમાં બેરોજગારી ઘટાડવા નવા રોજગાર મેળાનું આયોજન"
];

const GUJARATI_BODY = `
<p>ગાંધીનગર: રાજ્ય સરકાર દ્વારા આજે એક મહત્વપૂર્ણ નિર્ણય લેવામાં આવ્યો છે. આ નિર્ણયથી સામાન્ય લોકોને મોટો ફાયદો થશે. સંબંધિત વિભાગોને આ અંગે તાત્કાલિક અમલ કરવા માટે સૂચના આપવામાં આવી છે.</p>
<p>આ ઉપરાંત, આગામી દિવસોમાં વધુ કેટલીક યોજનાઓની જાહેરાત થવાની સંભાવના છે. લોકો આ નિર્ણયોને આવકારી રહ્યા છે અને તેમના જીવનમાં હકારાત્મક બદલાવની અપેક્ષા રાખી રહ્યા છે. વિકાસ કાર્યોને વેગ આપવા માટે પણ નવી ગ્રાન્ટ ફાળવવામાં આવી છે.</p>
<p>અધિકારીઓએ જણાવ્યું છે કે, આ તમામ યોજનાઓનો લાભ છેવાડાના માનવી સુધી પહોંચે તે માટે ખાસ મોનિટરિંગ કમિટીની રચના કરવામાં આવશે. જેના દ્વારા પારદર્શિતા જાળવી શકાશે.</p>
`;

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
        return;
      }
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatSlug(text, index) {
  // Transliterate simply or just use an English seed slug to guarantee URL safety and idempotency
  return `gujarat-news-update-seed-${index}-${Date.now().toString().slice(-4)}`;
}

// --- SEED EXECUTION ---
async function run() {
  console.log("🚀 Starting Production-Safe Seed...");

  // 1. Fetch live categories and cities
  console.log("📡 Fetching existing categories and cities...");
  const { data: categories, error: catError } = await supabase.from('categories').select('id');
  const { data: cities, error: cityError } = await supabase.from('cities').select('id');

  if (catError || cityError) {
    console.error("❌ Failed to fetch relations:", catError || cityError);
    process.exit(1);
  }
  if (!categories || categories.length === 0) {
    console.error("❌ No categories found. The seed requires existing categories.");
    process.exit(1);
  }

  // 2. Fetch/Upload Media to B2
  console.log(`☁️ Uploading ${UNIQUE_IMAGES_COUNT} images to Backblaze B2...`);
  const uploadedImagePaths = [];
  for (let i = 0; i < UNIQUE_IMAGES_COUNT; i++) {
    try {
      const buffer = await fetchBuffer(`https://picsum.photos/seed/${i * 99}/800/600`);
      const key = `${Date.now()}-seed-image-${i}.jpg`;
      await s3.send(new PutObjectCommand({
        Bucket: B2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg',
      }));
      uploadedImagePaths.push(`/api/media/${key}`);
      process.stdout.write('.');
    } catch (err) {
      console.error(`\n⚠️ Failed to upload image ${i}`, err.message);
    }
  }
  console.log(`\n✅ Uploaded ${uploadedImagePaths.length} images.`);

  console.log("☁️ Uploading 1 test PDF to Backblaze B2...");
  const pdfBuffer = Buffer.from('%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%EOF\n');
  const pdfKey = `${Date.now()}-seed-document.pdf`;
  await s3.send(new PutObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: pdfKey,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
  }));
  const pdfUrl = `/api/media/${pdfKey}`;
  console.log(`✅ Uploaded PDF: ${pdfUrl}`);

  // 3. Prevent Duplicates
  console.log("🔍 Checking existing seed articles to maintain idempotency...");
  const { data: existingSeed } = await supabase.from('articles').select('slug').like('slug', '%-seed-%');
  const existingSlugs = new Set((existingSeed || []).map(a => a.slug));
  console.log(`Found ${existingSlugs.size} previously seeded articles.`);

  // 4. Generate Articles
  console.log("📝 Generating 365 articles...");
  const articlesToInsert = [];
  const now = new Date();

  for (let i = 0; i < TOTAL_ARTICLES; i++) {
    // Generate dates progressively over the last 365 days
    const daysAgo = TOTAL_ARTICLES - i;
    const pubDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    // Add random hour/minute
    pubDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

    const slug = formatSlug(getRandom(GUJARATI_HEADLINES), i);
    if (existingSlugs.has(slug)) continue;

    const hasVideo = Math.random() < 0.15; // 15% with video
    const status = Math.random() < 0.90 ? 'published' : 'draft';

    articlesToInsert.push({
      headline: getRandom(GUJARATI_HEADLINES),
      description: "આ એક અગત્યના સમાચાર છે જે રાજ્યના અનેક લોકોને સ્પર્શે છે. (Seed Description)",
      content: GUJARATI_BODY,
      image_url: getRandom(uploadedImagePaths),
      extra_images: [],
      category_id: getRandom(categories).id,
      city_id: cities && cities.length > 0 && Math.random() > 0.2 ? getRandom(cities).id : null,
      published_at: pubDate.toISOString(),
      slug: slug,
      video_url: hasVideo ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : null,
      status: status,
      is_trending: Math.random() < 0.05, // 5% trending
      author: "Akhil Gujarat Desk",
    });
  }

  if (articlesToInsert.length > 0) {
    console.log(`💾 Inserting ${articlesToInsert.length} articles into Supabase (Batching)...`);
    for (let i = 0; i < articlesToInsert.length; i += 50) {
      const batch = articlesToInsert.slice(i, i + 50);
      const { error } = await supabase.from('articles').insert(batch);
      if (error) {
        console.error("❌ Batch insert error:", error);
      } else {
        process.stdout.write('█');
      }
    }
    console.log("\n✅ Articles inserted.");
  } else {
    console.log("✅ All articles already seeded.");
  }

  // 5. Generate E-papers
  console.log("📰 Generating 365 E-papers...");
  const epapersToInsert = [];
  const { data: existingEpapers } = await supabase.from('epapers').select('title').like('title', '%(Seed)%');
  const existingEpaperTitles = new Set((existingEpapers || []).map(e => e.title));

  for (let i = 0; i < TOTAL_EPAPERS; i++) {
    const daysAgo = TOTAL_EPAPERS - i;
    const pubDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    const titleDate = pubDate.toISOString().split('T')[0];
    const title = `અખિલ ગુજરાત ઇ-પેપર - ${titleDate} (Seed)`;

    if (existingEpaperTitles.has(title)) continue;

    epapersToInsert.push({
      title: title,
      published_date: titleDate,
      pdf_url: pdfUrl,
      thumbnail_url: getRandom(uploadedImagePaths),
    });
  }

  if (epapersToInsert.length > 0) {
    console.log(`💾 Inserting ${epapersToInsert.length} e-papers into Supabase...`);
    for (let i = 0; i < epapersToInsert.length; i += 50) {
      const batch = epapersToInsert.slice(i, i + 50);
      const { error } = await supabase.from('epapers').insert(batch);
      if (error) {
        console.error("❌ E-paper batch insert error:", error);
      } else {
        process.stdout.write('█');
      }
    }
    console.log("\n✅ E-papers inserted.");
  } else {
    console.log("✅ All e-papers already seeded.");
  }

  console.log("🎉 Seeding completed successfully!");
}

run().catch(console.error);
