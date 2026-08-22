import supabase from './supabase';
import { hydrateArticles } from '../../app/api/utils';
import { unstable_cache } from 'next/cache';
import { applyArticleSearchAndOrder } from './query-utils';
import { getISTDayRange } from './format';
import type { Ad } from './types';

export const getArticles = unstable_cache(
  async (params: Record<string, string | number | boolean> = {}) => {
    let query = supabase.from('articles').select('id, headline, description, image_url, video_url, category_id, city_id, published_at, is_trending, slug, author');

    if (params.status) {
      query = query.eq('status', params.status);
    } else {
      query = query.eq('status', 'published');
    }

    if (params.category_id) query = query.eq('category_id', params.category_id);
    if (params.city_id) query = query.eq('city_id', params.city_id);
    if (params.trending) query = query.eq('is_trending', true);
    if (params.video) query = query.not('video_url', 'is', null).neq('video_url', '');
    if (params.day) {
      const { from, to } = getISTDayRange(String(params.day));
      query = query.gte('published_at', from).lt('published_at', to);
    }
    
    query = applyArticleSearchAndOrder(query, params.q as string | undefined);

    const take = Math.min(Number(params.limit) || 40, 100);
    query = query.limit(take);

    const { data, error } = await query;
    if (error) throw error;

    const [categories, cities] = await Promise.all([getCategories(), getCities()]);
    return hydrateArticles(data || [], { categories, cities });
  },
  ['articles-cache'],
  { revalidate: 60, tags: ['articles'] }
);

export const getCities = unstable_cache(
  async () => {
    const { data, error } = await supabase.from('cities').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  ['cities-cache'],
  { revalidate: 3600, tags: ['cities'] }
);

export const getCategories = unstable_cache(
  async () => {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  ['categories-cache'],
  { revalidate: 3600, tags: ['categories'] }
);

export const getPages = unstable_cache(
  async () => {
    const { data, error } = await supabase.from('static_pages').select('*').order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  ['pages-cache'],
  { revalidate: 3600, tags: ['pages'] }
);

export const getActiveAdsForSlot = unstable_cache(
  async (slot: string) => {
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .eq('slot', slot)
      .eq('is_active', true)
      .limit(20);
    if (error) throw error;
    return data || [];
  },
  ['ads-by-slot'],
  { revalidate: 300, tags: ['ads'] }
);

export const getAdsForSlot = async (slot: string): Promise<Ad | null> => {
  const data = await getActiveAdsForSlot(slot);
  if (!data || data.length === 0) return null;
  return data[Math.floor(Math.random() * data.length)] as Ad;
};

export const getArticleBySlug = unstable_cache(
  async (slug: string) => {
    const { data, error } = await supabase.from('articles').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data;
  },
  ['article-by-slug'],
  { revalidate: 60, tags: ['articles'] }
);
