import { Metadata } from 'next';
import Link from 'next/link';
import { getArticles, getCities } from '../../../../src/lib/server-data';
import { FilteredArticleView } from '../../../../src/components/FilteredArticleView';
import { decodeSlug } from '../../../api/utils';

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const cities = await getCities();
  const data = cities.find((c: any) => c.slug === slug);
  if (!data) return { title: 'શહેર' };
  return {
    title: data.name_gu,
    description: `${data.name_gu} શહેરના તાજા ગુજરાતી સમાચાર — અખિલ ગુજરાત.`,
    alternates: { canonical: `/city/${slug}` },
  };
}

import { notFound } from 'next/navigation';

export default async function CityPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const cities = await getCities();
  const city = cities.find((c: any) => c.slug === slug);
  
  if (!city) {
    notFound();
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