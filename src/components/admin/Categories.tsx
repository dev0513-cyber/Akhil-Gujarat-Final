"use client";
import { fetchCategories, saveCategory, deleteCategory } from '../../lib/api';
import { TaxonomyManager } from './TaxonomyManager';
import type { Category } from '../../lib/types';

export default function Categories({ initialCategories }: Readonly<{ initialCategories: Category[] }>) {
  return (
    <TaxonomyManager<Category>
      initialData={initialCategories}
      cacheKey="categories"
      fetcher={fetchCategories}
      saver={saveCategory}
      deleter={deleteCategory}
      titleEn="Categories"
      titleGu="વિભાગો"
      descriptionEn="Categories for news classification."
      descriptionGu="સમાચાર વર્ગીકરણ માટેની શ્રેણીઓ."
      hasDescriptionField={true}
    />
  );
}
