import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testPerf() {
  console.time('Articles Query');
  await supabase.from('articles').select('id').range(0, 20);
  console.timeEnd('Articles Query');

  console.time('Ads Query');
  await supabase.from('ads').select('id, title, image_url, link_url, slot, frame, is_active, created_at, updated_at').order('created_at', { ascending: false }).range(0, 20);
  console.timeEnd('Ads Query');
}

testPerf().catch(console.error);
