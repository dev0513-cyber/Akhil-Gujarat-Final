import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkImages() {
  const { data: ads, error } = await supabase.from('ads').select('image_url').range(0, 20);
  if (error) {
    console.error(error);
    return;
  }

  for (const ad of ads) {
    if (!ad.image_url) continue;
    try {
      let url = ad.image_url;
      if (url.startsWith('/')) {
        url = `http://localhost:3000${url}`;
      }
      const res = await fetch(url, { method: 'HEAD' });
      const size = res.headers.get('content-length');
      console.log(`${ad.image_url}: ${size ? (parseInt(size) / 1024 / 1024).toFixed(2) + ' MB' : 'unknown size'}`);
    } catch (e) {
      console.error(`Failed to fetch HEAD for ${ad.image_url}:`, e.message);
    }
  }
}

checkImages().catch(console.error);
