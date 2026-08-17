import NewsCard from './NewsCard';
import type { Article } from '../lib/types';
import { ReactNode } from 'react';

interface FilteredArticleViewProps {
  items: Article[];
  title: string;
  emptyMessage: string;
  children?: ReactNode; // For header content like descriptions or breadcrumbs
}

export function FilteredArticleView({ items, title, emptyMessage, children }: FilteredArticleViewProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {children}
      <h1 className="font-display text-3xl md:text-4xl mt-1">{title}</h1>
      
      <div className="mt-6 h-px bg-ink/10" />

      {items.length === 0 ? (
        <p className="py-16 text-center font-gujarati text-ink/50">{emptyMessage}</p>
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
