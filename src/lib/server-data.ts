import supabase from './supabase';
import { hydrateArticles } from '../../app/api/utils';
import { unstable_cache } from 'next/cache';

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
    
    if (params.q) {
      const term = `%${params.q}%`;
      query = query.or(`headline.ilike.${term},description.ilike.${term},content.ilike.${term},tags.ilike.${term},seo_title.ilike.${term}`);
    }
    
    query = query.order('published_at', { ascending: false, nullsFirst: false });
    query = query.order('id', { ascending: false });

    const take = Math.min(Number(params.limit) || 40, 100);
    query = query.limit(take);

    const { data, error } = await query;
    if (error) throw error;
    
    return hydrateArticles(data || []);
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
