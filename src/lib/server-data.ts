import supabase from './supabase';
import { hydrateArticles } from '../../app/api/utils';
import { unstable_cache } from 'next/cache';
import { applyArticleSearchAndOrder } from './query-utils';
import { getISTDayRange } from './format';
import type { Ad } from './types';

export const getArticles = unstable_cache(
  async (params: Record<string, string | number | boolean> = {}) => {
    let query = supabase.from('articles').select('id, headline, description, image_url, video_url, category_id, city_id, published_at, is_trending, slug, view_count, author');

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

// Uncached specifically to prevent search cache poisoning (arbitrary 'q' params filling Next.js Data Cache)
export const searchArticles = async (q: string, limit = 40) => {
  let query = supabase.from('articles')
    .select('id, headline, description, image_url, video_url, category_id, city_id, published_at, is_trending, slug, view_count, author')
    .eq('status', 'published');

  query = applyArticleSearchAndOrder(query, q);
  query = query.limit(Math.min(limit, 100));

  const { data, error } = await query;
  if (error) throw error;

  const [categories, cities] = await Promise.all([getCategories(), getCities()]);
  return hydrateArticles(data || [], { categories, cities });
};

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

export const getSettings = unstable_cache(
  async () => {
    const { data, error } = await supabase.from('site_settings').select('*');
    if (error) throw error;

    // Convert to Record<string, string> as expected by Layout
    const map: Record<string, string> = {};
    if (data && Array.isArray(data)) {
      data.forEach(item => { map[item.key] = item.value; });
    }
    return map;
  },
  ['settings-cache'],
  { revalidate: 3600, tags: ['settings'] }
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

    // Server-side coarse filtering (relies on cache expiration for precision)
    const now = new Date();
    return (data || []).filter(ad => {
      if (ad.start_date && new Date(ad.start_date) > now) return false;
      if (ad.end_date && new Date(ad.end_date) < now) return false;
      return true;
    });
  },
  ['ads-by-slot'],
  { revalidate: 300, tags: ['ads'] }
);

export const getAdsForSlot = async (slot: string): Promise<Ad | null> => {
  const data = await getActiveAdsForSlot(slot);
  if (!data || data.length === 0) return null;
  return data[0] as Ad; // Return first ad for presence checks and tests
};

export const getArticleBySlug = unstable_cache(
  async (slug: string) => {
    const { data, error } = await supabase.from('articles').select('id, headline, description, content, image_url, extra_images, video_url, category_id, city_id, published_at, created_at, updated_at, status, is_trending, slug, view_count, author, source, tags, seo_title, seo_description').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data;
  },
  ['article-by-slug'],
  { revalidate: 60, tags: ['articles'] }
);
