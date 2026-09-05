import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearData() {
  console.log("Clearing epapers...");
  const { error: epaperError } = await supabase.from('epapers').delete().neq('id', 0);
  if (epaperError) console.error("Error clearing epapers:", epaperError);
  else console.log("E-Papers cleared successfully.");

  console.log("Clearing ads...");
  // Using a valid UUID zero for the neq check or not.is.null
  const { error: adsError } = await supabase.from('ads').delete().not('id', 'is', null);
  if (adsError) console.error("Error clearing ads:", adsError);
  else console.log("Ads cleared successfully.");
}

clearData();
