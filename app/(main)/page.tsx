import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getArticles, getCities } from '../../src/lib/server-data';
import NewsCard from '../../src/components/NewsCard';
import BreakingTicker from '../../src/components/BreakingTicker';
import type { Article } from '../../src/lib/types';

export default async function Home() {
  const [latest, trending, cities] = await Promise.all([
    getArticles({ limit: 80 }),
    getArticles({ trending: 1, limit: 8 }),
    getCities(),
  ]);

  const byCat = (slug: string) => latest.filter((a: Article) => a.category?.slug === slug);
  const gujarat = byCat('gujarat');
  const india = byCat('india');
  const world = byCat('international');
  
  const hero = trending.length > 0 ? trending[0] : latest[0];
  const side = trending.length > 0 ? trending.slice(1, 5) : latest.slice(1, 5);
  const restLatest = latest.filter((a: Article) => a.id !== hero?.id).slice(0, 8);
  const cityNews = latest.filter((a: Article) => a.city_id).slice(0, 8);

  return (
    <>
      <BreakingTicker items={trending.slice(0, 6)} />

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {hero ? (
          <>
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 h-full">
                <NewsCard article={hero} variant="hero" />
              </div>
              <aside className="bg-white border border-rule p-4 h-full flex flex-col justify-between">
                <div>
                  <SectionHead title="ટ્રેન્ડિંગ / ટોપ ન્યૂઝ" />
                  <div className="flex flex-col h-full">
                    {side.map((a: Article) => (
                      <NewsCard key={a.id} article={a} variant="row" />
                    ))}
                  </div>
                </div>
              </aside>
            </section>

            <section className="mt-10">
              <SectionHead title="તાજા સમાચાર" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {restLatest.map((a: Article) => (
                  <NewsCard key={a.id} article={a} variant="standard" />
                ))}
              </div>
            </section>

            <HighlightBand title="ગુજરાત હાઇલાઇટ્સ" to="/category/gujarat" items={gujarat} />
            <HighlightBand title="ભારત હાઇલાઇટ્સ" to="/category/india" items={india} />
            <HighlightBand title="આંતરરાષ્ટ્રીય હાઇલાઇટ્સ" to="/category/international" items={world} />

            <section className="mt-10">
              <SectionHead title="શહેરી સમાચાર" />
              <div className="flex flex-wrap gap-2 mb-5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {cities.map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/city/${c.slug}`}
                    className="px-3 py-1.5 text-sm border border-rule bg-white hover:border-crimson hover:text-crimson font-gujarati"
                  >
                    {c.name_gu}
                  </Link>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                {cityNews.map((a: Article) => (
                  <NewsCard key={a.id} article={a} variant="row" />
                ))}
              </div>
            </section>


          </>
        ) : (
          <p className="py-20 text-center font-gujarati text-ink/50">હજુ કોઈ સમાચાર પ્રકાશિત નથી.</p>
        )}
      </div>
    </>
  );
}

function SectionHead({ title, to }: Readonly<{ title: string; to?: string }>) {
  return (
    <div className="flex items-end justify-between mb-4 border-b-2 border-ink pb-1.5">
      <h2 className="font-display text-xl md:text-2xl">{title}</h2>
      {to && (
        <Link href={to} className="text-xs text-crimson inline-flex items-center gap-0.5 hover:underline">
          બધા જુઓ <ChevronRight size={13} />
        </Link>
      )}
    </div>
  );
}

function HighlightBand({
  title,
  to,
  items,
}: Readonly<{
  title: string;
  to: string;
  items: Article[];
}>) {
  if (!items.length) return null;
  const [first, ...rest] = items;
  return (
    <section className="mt-10">
      <SectionHead title={title} to={to} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 h-full">
          <NewsCard article={first} variant="feature" />
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0 h-full content-start">
          {rest.slice(0, 6).map((a: Article) => (
            <NewsCard key={a.id} article={a} variant="row" />
          ))}
        </div>
      </div>
    </section>
  );
}