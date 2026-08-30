import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// We can just select a single row from each table to see the keys returned
const tables = ['articles', 'categories', 'cities', 'ads', 'site_settings', 'static_pages', 'epapers'];

for (const table of tables) {
  console.log(`\n--- TABLE: ${table} ---`);
  const { data, error } = await supabase.from(table).select('*').limit(1);
  if (error) {
    console.log(`Error: ${error.message}`);
  } else if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]).join(', '));
  } else {
    console.log('Table is empty. Cannot infer schema from data alone without pg_meta.');
    // If empty, we can't infer schema simply through REST data unless we use a deliberate bad query
  }
}
