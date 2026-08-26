import { Metadata } from 'next';
import Link from 'next/link';
import supabase from '../../../../src/lib/supabase';
import { getArticles, getCities } from '../../../../src/lib/server-data';
import { FilteredArticleView } from '../../../../src/components/FilteredArticleView';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase.from('categories').select('*').eq('slug', slug).maybeSingle();
  if (!data) return { title: 'વિભાગ' };
  return {
    title: data.name_gu,
    description: data.description || `${data.name_gu} ના તાજા ગુજરાતી સમાચાર — અખિલ ગુજરાત.`,
  };
}

import { notFound } from 'next/navigation';

export default async function CategoryPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const { data: cat } = await supabase.from('categories').select('*').eq('slug', slug).maybeSingle();
  
  if (!cat) {
    notFound();
  }

  const [items, cities] = await Promise.all([
    getArticles({ category_id: cat.id, limit: 40 }),
    getCities(),
  ]);

  const title = cat.name_gu || 'વિભાગ';

  return (
    <FilteredArticleView 
      items={items} 
      title={title} 
      emptyMessage="આ વિભાગમાં હજુ સમાચાર નથી."
    >
      <p className="text-[11px] tracking-[0.3em] uppercase text-crimson">વિભાગ</p>
      {cat.description && <p className="mt-2 text-ink/60 font-gujarati max-w-2xl">{cat.description}</p>}
      
      {slug === 'gujarat' && cities.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {cities.map((c: any) => (
             <Link 
               key={c.id} 
               href={`/city/${c.slug}`} 
               className="px-4 py-1.5 bg-white border border-rule hover:border-crimson hover:text-crimson text-sm font-semibold font-gujarati rounded-full transition-all hover:shadow-sm"
             >
               {c.name_gu}
             </Link>
          ))}
        </div>
      )}
    </FilteredArticleView>
  );
}