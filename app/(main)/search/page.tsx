import { Metadata } from 'next';
import { Search as SearchIcon } from 'lucide-react';
import { getArticles } from '../../../src/lib/server-data';
import NewsCard from '../../../src/components/NewsCard';
import type { Article } from '../../../src/lib/types';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `શોધ: ${q}` : 'સમાચાર શોધો',
    description: 'અખિલ ગુજરાત પર ગુજરાતી સમાચાર શોધો.',
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const term = q?.trim() || '';

  const items = term ? await getArticles({ q: term, limit: 40 }) : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl">સમાચાર શોધો</h1>
      <form action="/search" method="GET" className="mt-4 flex border border-rule bg-white max-w-xl">
        <input
          name="q"
          defaultValue={term}
          placeholder="શીર્ષક, વર્ણન અથવા ટૅગ..."
          className="flex-1 px-4 py-3 outline-none font-gujarati bg-transparent"
        />
        <button type="submit" className="px-4 text-crimson" aria-label="શોધ">
          <SearchIcon size={18} />
        </button>
      </form>

      {term && <p className="mt-5 text-sm text-ink/55 font-gujarati">“{term}” માટે પરિણામો</p>}
      
      {term && items.length === 0 ? (
        <p className="py-12 font-gujarati text-ink/50">કોઈ સમાચાર મળ્યા નહીં. અન્ય શબ્દ અજમાવો.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8">
          {items.map((a: Article) => (
            <NewsCard key={a.id} article={a} variant="row" />
          ))}
        </div>
      )}
    </div>
  );
}