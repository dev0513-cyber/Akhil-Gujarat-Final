import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('articles').select('slug, headline, status').order('created_at', { ascending: false }).limit(5);
  console.log('Recent Slugs:', data);
  
  // also try to find the specific one
  const specificDecoded = 'ગોદાવરી-નદીની-દુર્ઘટના-મહિલાને-બચાવાઈ-પરિવારના-ત્રણ-સભ્યો-મૃત-હાલતમાં-મળ્યા-તેલંગાણા-ટુડે';
  const { data: d1 } = await supabase.from('articles').select('slug').eq('slug', specificDecoded);
  console.log('Decoded search result:', d1);

  const specificEncoded = encodeURIComponent(specificDecoded);
  const { data: d2 } = await supabase.from('articles').select('slug').eq('slug', specificEncoded);
  console.log('Encoded search result:', d2);
}

run();
