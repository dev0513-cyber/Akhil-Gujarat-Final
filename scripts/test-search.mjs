import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch() {
  const term = '%ગુજરાત%';
  const { data, error } = await supabase
    .from('articles')
    .select('id, headline')
    .or(`headline.ilike.${term},description.ilike.${term},tags.ilike.${term},seo_title.ilike.${term}`)
    .limit(3);
    
  if (error) console.error('Error:', error);
  else console.log('Success:', data);
}

testSearch();
