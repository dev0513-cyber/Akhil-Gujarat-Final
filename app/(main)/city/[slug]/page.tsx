import { Metadata } from 'next';
import Link from 'next/link';
import supabase from '../../../../src/lib/supabase';
import { getArticles } from '../../../../src/lib/server-data';
import NewsCard from '../../../../src/components/NewsCard';
import { ErrorBanner } from '../../../../src/components/Skeleton';
import type { Article } from '../../../../src/lib/types';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase.from('cities').select('*').eq('slug', slug).maybeSingle();
  if (!data) return { title: 'શહેર' };
  return {
    title: data.name_gu,
    description: `${data.name_gu} શહેરના તાજા ગુજરાતી સમાચાર — અખિલ ગુજરાત.`,
  };
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: city } = await supabase.from('cities').select('*').eq('slug', slug).maybeSingle();
  
  if (!city) {
    return <ErrorBanner message="આ શહેર મળ્યું નથી" />;
  }

  const items = await getArticles({ city_id: city.id, limit: 40 });
  const title = city.name_gu || 'શહેર';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/category/gujarat" className="text-[11px] hover:underline tracking-[0.3em] uppercase text-crimson">
        &larr; ગુજરાત
      </Link>
      <h1 className="font-display text-3xl md:text-4xl mt-1">{title} સમાચાર</h1>

      <div className="mt-6 h-px bg-ink/10" />

      {items.length === 0 ? (
        <p className="py-16 text-center font-gujarati text-ink/50">આ શહેરમાં હજુ સમાચાર નથી.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {items.map((a: Article) => (
            <NewsCard key={a.id} article={a} variant="feature" />
          ))}
        </div>
      )}
    </div>
  );
}