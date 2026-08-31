import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkData() {
  const { data: ads, error } = await supabase.from('ads').select('id, title, image_url, link_url, slot, frame, is_active, created_at').order('created_at', { ascending: false }).range(0, 20);
  
  if (error) {
    console.error(error);
    return;
  }

  let totalSize = 0;
  for (const ad of ads) {
    const size = JSON.stringify(ad).length;
    totalSize += size;
    console.log(`Ad ${ad.id}: title="${ad.title}", image_url starts with ${ad.image_url ? ad.image_url.substring(0, 30) : 'null'}... length=${ad.image_url ? ad.image_url.length : 0}`);
  }
  console.log(`Total payload size for 20 ads: ${totalSize / 1024} KB`);
}

checkData().catch(console.error);
