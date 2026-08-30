
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, MapPin, Tag } from 'lucide-react';
import { getArticles, getAdsForSlot, getArticleBySlug, getCategories, getCities } from '../../../../src/lib/server-data';
import { formatDateTimeGu, splitParagraphs } from '../../../../src/lib/format';
import NewsCard from '../../../../src/components/NewsCard';
import ShareButtons from '../../../../src/components/ShareButtons';
import AdBanner from '../../../../src/components/AdBanner';
import VideoEmbed from '../../../../src/components/VideoEmbed';
import type { Article } from '../../../../src/lib/types';
import { hydrateArticles } from '../../../api/utils';
import type { ReactNode } from 'react';

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug } = await params;
  const data = await getArticleBySlug(slug);
  if (!data) return { title: 'Not Found' };

  const title = data.seo_title || data.headline;
  const description = data.seo_description || data.description;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://akhilgujarat.com');
  const url = `${siteUrl}/news/${slug}`;
  
  const ogImageUrl = data.image_url 
    ? (data.image_url.startsWith('http') ? data.image_url : `${siteUrl}${data.image_url.startsWith('/') ? '' : '/'}${data.image_url}`)
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      siteName: 'Akhil Gujarat',
      images: ogImageUrl ? [{ url: ogImageUrl }] : [],
      publishedTime: data.published_at || undefined,
      modifiedTime: data.updated_at || undefined,
      authors: [data.author || 'Akhil Gujarat'],
      locale: 'gu_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : [],
    },
  };
}

import { notFound } from 'next/navigation';

export default async function NewsPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const data = await getArticleBySlug(slug);
  
  if (!data) {
    notFound();
  }

  const [categories, cities] = await Promise.all([getCategories(), getCities()]);
  const [article] = await hydrateArticles(data, { categories, cities });
  const rawRelated = await getArticles({ category_id: article.category_id, limit: 5 });
  const related = rawRelated.filter((a: Article) => a.id !== article.id).slice(0, 4);
  const sidebarAd = await getAdsForSlot('article_sidebar');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.headline,
    description: article.description,
    image: article.image_url,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { '@type': 'Organization', name: article.author || 'અખિલ ગુજરાત' },
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: 'Akhil Gujarat',
      logo: { '@type': 'ImageObject', url: `https://akhilgujarat.com/favicon.svg` },
    },
    mainEntityOfPage: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://akhilgujarat.com'}/news/${slug}`,
  };

  const paragraphs = splitParagraphs(article.content);
  const tags = (article.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);

  const articleJsx: ReactNode = (
    <article className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {article.category && (
            <Link
              href={`/category/${article.category.slug}`}
              className="bg-crimson text-white px-2 py-0.5 uppercase tracking-wider"
            >
              {article.category.name_gu}
            </Link>
          )}
          {article.city && (
            <Link href={`/city/${article.city.slug}`} className="inline-flex items-center gap-1 text-ink/55">
              <MapPin size={12} /> {article.city.name_gu}
            </Link>
          )}
        </div>

        <h1 className="font-display text-3xl md:text-4xl leading-snug mt-3">{article.headline}</h1>
        <p className="mt-3 text-lg text-ink/70 font-gujarati leading-relaxed">{article.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/50">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} /> {formatDateTimeGu(article.published_at)}
          </span>
          {article.author && <span>{article.author}</span>}
        </div>

        <AdBanner slot="article_top" className="mt-6" />

        <ShareButtons title={article.headline} description={article.description} />

        {article.image_url && (
          <figure className="mt-6">
            <div className="relative w-full aspect-video max-h-[460px] overflow-hidden">
              <Image src={article.image_url} alt={article.headline} fill sizes="(max-width: 768px) 100vw, 800px" className="object-cover" priority unoptimized={article.image_url.startsWith('/api/media')} />
            </div>
            {article.source && (
              <figcaption className="text-[11px] text-ink/45 mt-1.5">સ્રોત / ક્રેડિટ: {article.source}</figcaption>
            )}
          </figure>
        )}

        <div className="mt-6 space-y-4 font-gujarati text-[17px] leading-[1.85] text-ink/90">
          {paragraphs.map((p: string, i: number) => (
            <div key={p.slice(0, 30).replace(/\s+/g, '-') + '-' + i}>
              <p>{p}</p>
              {i === 0 && <AdBanner slot="article_middle" />}
            </div>
          ))}
        </div>

        {article.extra_images && article.extra_images.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-xl mb-4 border-b border-rule pb-2">ફોટો ગેલેરી (Photo Gallery)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {article.extra_images.map((src: string, i: number) => (
                <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="relative aspect-[4/3] overflow-hidden group block rounded border border-rule">
                  <Image src={src} alt={`${article.headline} - photo ${i+1}`} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized={src.startsWith('/api/media')} />
                </a>
              ))}
            </div>
          </div>
        )}

        {article.video_url && (
          <div className="mt-8">
            <h2 className="font-display text-xl mb-3">વિડિયો</h2>
            <VideoEmbed url={article.video_url} title={article.headline} />
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Tag size={14} className="text-ink/40" />
            {tags.map((t: string) => (
              <Link
                key={t}
                href={`/search?q=${encodeURIComponent(t)}`}
                className="text-xs border border-rule px-2 py-1 bg-white hover:border-crimson"
              >
                {t}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-rule pt-4">
<ShareButtons title={article.headline} description={article.description} />
        </div>

        <AdBanner slot="article_bottom" className="mt-8" />
    </article>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {sidebarAd ? (
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-8">
          <div className="min-w-0">
            {articleJsx}
            {related.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-2xl border-b-2 border-ink pb-1.5 mb-5">સંબંધિત સમાચાર</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {related.map((a: Article) => (
                    <NewsCard key={a.id} article={a} variant="standard" />
                  ))}
                </div>
              </section>
            )}
          </div>
          <aside>
            <AdBanner slot="article_sidebar" />
          </aside>
        </div>
      ) : (
        <>
          {articleJsx}
          {related.length > 0 && (
            <section className="max-w-6xl mx-auto px-4 pb-12">
              <h2 className="font-display text-2xl border-b-2 border-ink pb-1.5 mb-5">સંબંધિત સમાચાર</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {related.map((a: Article) => (
                  <NewsCard key={a.id} article={a} variant="standard" />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
