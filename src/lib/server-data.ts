import supabase from './supabase';
import { hydrateArticles } from '../../app/api/utils';
import { unstable_cache } from 'next/cache';
import { applyArticleSearchAndOrder } from './query-utils';
import { getISTDayRange } from './format';
import type { Ad } from './types';

export const getArticles = async (params: Record<string, string | number | boolean> = {}) => {
  return unstable_cache(
    async () => {
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

    let qTerms: string | string[] | undefined = params.q as string | undefined;
    if (typeof qTerms === 'string' && qTerms.trim()) {
      const trans = await getGujaratiTransliteration(qTerms);
      if (trans && trans !== qTerms) {
        qTerms = [qTerms, trans];
      }
    }
    query = applyArticleSearchAndOrder(query, qTerms);

    const take = Math.min(Number(params.limit) || 40, 100);
    query = query.limit(take);

    const { data, error } = await query;
    if (error) throw error;

    const [categories, cities] = await Promise.all([getCategories(), getCities()]);
    return hydrateArticles(data || [], { categories, cities });
    },
    ['articles-cache', JSON.stringify(params)],
    { revalidate: 60, tags: ['feed-articles'] }
  )();
};

async function getGujaratiTransliteration(text: string): Promise<string> {
  if (!text || typeof text !== 'string') return text;
  // If it already contains Gujarati, no need to transliterate
  if (/[\u0A80-\u0AFF]/.test(text)) return text;
  try {
    const res = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=gu-t-i0-und&num=1`, {
      signal: AbortSignal.timeout(2500)
    });
    if (!res.ok) return text;
    const json = await res.json();
    if (json[0] === 'SUCCESS' && json[1]?.[0]?.[1]?.[0]) {
      return json[1][0][1][0];
    }
  } catch {
    // Ignore fetch timeout/errors
  }
  return text;
}

// Uncached specifically to prevent search cache poisoning (arbitrary 'q' params filling Next.js Data Cache)
export const searchArticles = async (q: string, limit = 40) => {
  let query = supabase.from('articles')
    .select('id, headline, description, image_url, video_url, category_id, city_id, published_at, is_trending, slug, author')
    .eq('status', 'published');

  let qTerms: string | string[] = q;
  if (typeof q === 'string' && q.trim()) {
    const trans = await getGujaratiTransliteration(q);
    if (trans && trans !== q) {
      qTerms = [q, trans];
    }
  }

  query = applyArticleSearchAndOrder(query, qTerms);
  query = query.limit(Math.min(limit, 100));

  const { data, error } = await query;
  if (error) throw error;

  const [categories, cities] = await Promise.all([getCategories(), getCities()]);
  return hydrateArticles(data || [], { categories, cities });
};

export const getCities = unstable_cache(
  async () => {
    const { data, error } = await supabase.from('cities').select('id, name_en, name_gu, slug, sort_order').order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  ['cities-cache'],
  { revalidate: 3600, tags: ['cities'] }
);

export const getCategories = unstable_cache(
  async () => {
    const { data, error } = await supabase.from('categories').select('id, name_en, name_gu, slug, sort_order, description').order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  ['categories-cache'],
  { revalidate: 3600, tags: ['categories'] }
);

export const getPages = unstable_cache(
  async () => {
    const { data, error } = await supabase.from('static_pages').select('id, slug, title_gu, title_en, content, seo_title, seo_description, updated_at').order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  ['pages-cache'],
  { revalidate: 3600, tags: ['pages'] }
);

export const getSettings = unstable_cache(
  async () => {
    const { data, error } = await supabase.from('site_settings').select('key, value, updated_at');
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

const getCachedAdsForSlot = unstable_cache(
  async (slot: string) => {
    const { data, error } = await supabase
      .from('ads')
      .select('id, title, image_url, link_url, slot, frame, is_active, created_at')
      .eq('slot', slot)
      .eq('is_active', true)
      .limit(20);
    if (error) throw error;

    // Server-side coarse filtering (relies on cache expiration for precision)
    return data || [];
  },
  ['ads-by-slot'],
  { revalidate: 300, tags: ['ads'] }
);

export const getActiveAdsForSlot = async (slot: string) => {
  return getCachedAdsForSlot(slot);
};

export const getAdsForSlot = async (slot: string): Promise<Ad | null> => {
  const data = await getActiveAdsForSlot(slot);
  if (!data || data.length === 0) return null;
  return data[0] as Ad; // Return first ad for presence checks and tests
};

export const getArticleBySlug = async (slug: string) => {
  return unstable_cache(
    async () => {
      const { data, error } = await supabase.from('articles').select('id, headline, description, content, image_url, extra_images, video_url, category_id, city_id, published_at, created_at, updated_at, status, is_trending, slug, author, source, tags, seo_title, seo_description').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data;
    },
    ['article-by-slug', slug],
    { revalidate: 60, tags: ['articles', `article-detail-${slug}`] }
  )();
};
