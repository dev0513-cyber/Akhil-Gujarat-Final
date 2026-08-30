import { createClient } from '@supabase/supabase-js';

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ ERROR: Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("🔍 Validating Production Data Seed...");

  // 1. Articles Validation
  const { data: articles, error: artError } = await supabase.from('articles').select('*').like('slug', '%-seed-%');
  if (artError) {
    console.error("❌ Failed to fetch articles:", artError);
    return;
  }

  console.log(`\n📄 Articles Seeded: ${articles.length}`);
  
  const categoriesCount = {};
  const citiesCount = {};
  const statusCount = {};
  let withVideo = 0;
  let withImage = 0;
  const slugs = new Set();
  let duplicateSlugs = 0;
  let invalidCategory = 0;
  let invalidCity = 0;

  for (const art of articles) {
    if (slugs.has(art.slug)) duplicateSlugs++;
    slugs.add(art.slug);

    if (!art.category_id) invalidCategory++;
    if (!art.city_id) invalidCity++; // Add usage
    else categoriesCount[art.category_id] = (categoriesCount[art.category_id] || 0) + 1;

    if (art.city_id) {
      citiesCount[art.city_id] = (citiesCount[art.city_id] || 0) + 1;
    }

    if (art.video_url) withVideo++;
    if (art.image_url && art.image_url.includes('/api/media/')) withImage++;

    statusCount[art.status] = (statusCount[art.status] || 0) + 1;
  }

  console.log("-> Unique Slugs:", slugs.size);
  console.log("-> Duplicate Slugs:", duplicateSlugs);
  console.log("-> Invalid Category IDs:", invalidCategory);
  console.log("-> Articles with valid Image URLs:", withImage);
  console.log("-> Articles with Video URLs:", withVideo);
  console.log("-> Status distribution:", statusCount);
  console.log("-> Category distribution (Category ID: Count):", categoriesCount);

  // 2. E-papers Validation
  const { data: epapers, error: epError } = await supabase.from('epapers').select('*').like('title', '%(Seed)%');
  if (epError) {
    console.error("❌ Failed to fetch epapers:", epError);
    return;
  }

  console.log(`\n📰 E-papers Seeded: ${epapers.length}`);
  let invalidPdf = 0;
  const dates = new Set();
  let duplicateDates = 0;

  for (const ep of epapers) {
    if (dates.has(ep.published_date)) duplicateDates++;
    dates.add(ep.published_date);

    if (!ep.pdf_url || !ep.pdf_url.includes('/api/media/')) invalidPdf++;
  }

  console.log("-> Unique Publication Dates:", dates.size);
  console.log("-> Duplicate Dates:", duplicateDates);
  console.log("-> Invalid PDF References:", invalidPdf);

  console.log("\n✅ Validation completed.");
}

run().catch(console.error);
