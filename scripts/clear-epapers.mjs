import { createClient } from '@supabase/supabase-js';

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function clearEpapers() {
  const { data, error } = await supabase.from('epapers').delete().not('id', 'is', null).select();
  if (error) {
    console.error("❌ Error deleting e-papers:", error);
    process.exit(1);
  }
  console.log(`✅ Successfully deleted ${data ? data.length : 0} e-papers.`);
}

clearEpapers().catch(console.error);
