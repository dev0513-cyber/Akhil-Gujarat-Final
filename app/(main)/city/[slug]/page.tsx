import { Metadata } from 'next';
import Link from 'next/link';
import supabase from '../../../../src/lib/supabase';
import { getArticles } from '../../../../src/lib/server-data';
import { ErrorBanner } from '../../../../src/components/Skeleton';
import { FilteredArticleView } from '../../../../src/components/FilteredArticleView';

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase.from('cities').select('*').eq('slug', slug).maybeSingle();
  if (!data) return { title: 'શહેર' };
  return {
    title: data.name_gu,
    description: `${data.name_gu} શહેરના તાજા ગુજરાતી સમાચાર — અખિલ ગુજરાત.`,
  };
}

export default async function CityPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const { data: city } = await supabase.from('cities').select('*').eq('slug', slug).maybeSingle();
  
  if (!city) {
    return <ErrorBanner message="આ શહેર મળ્યું નથી" />;
  }

  const items = await getArticles({ city_id: city.id, limit: 40 });
  const title = `${city.name_gu || 'શહેર'} સમાચાર`;

  return (
    <FilteredArticleView 
      items={items} 
      title={title} 
      emptyMessage="આ શહેરમાં હજુ સમાચાર નથી."
    >
      <Link href="/category/gujarat" className="text-[11px] hover:underline tracking-[0.3em] uppercase text-crimson">
        &larr; ગુજરાત
      </Link>
    </FilteredArticleView>
  );
}