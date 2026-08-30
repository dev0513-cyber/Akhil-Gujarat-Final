import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'e:/LUCKY/agon-agent_2-dcf2eb7f/next-app/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('epapers').select('id, title, pdf_url, thumbnail_url, published_date, created_at, updated_at');
  if (error) {
    console.error("Error fetching epapers:", error);
  } else {
    console.log("Success fetching epapers:", data);
  }
}

test();
