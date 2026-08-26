import { Metadata } from 'next';
import supabase from '../../../../src/lib/supabase';
import { splitParagraphs } from '../../../../src/lib/format';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase.from('static_pages').select('*').eq('slug', slug).maybeSingle();
  if (!data) return { title: 'Not Found' };
  return {
    title: data.seo_title || data.title_gu,
    description: data.seo_description || data.title_en,
  };
}

import { notFound } from 'next/navigation';

export default async function StaticPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const { data: page } = await supabase.from('static_pages').select('*').eq('slug', slug).maybeSingle();

  if (!page) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <p className="text-[11px] tracking-[0.3em] uppercase text-crimson">{page.title_en}</p>
      <h1 className="font-display text-3xl md:text-4xl mt-1">{page.title_gu}</h1>
      <div className="mt-6 h-px bg-ink" />
      <div className="mt-6 space-y-4 font-gujarati text-[17px] leading-[1.85] text-ink/85">
        {splitParagraphs(page.content).map((p: string, i: number) => (
          <p key={p.slice(0, 30).replace(/\s+/g, '-') + '-' + i}>{p}</p>
        ))}
      </div>
    </div>
  );
}