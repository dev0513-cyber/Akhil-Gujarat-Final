import { MetadataRoute } from 'next';
import supabase from '../src/lib/supabase';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://akhilgujaratdaily.com';

  const [{ data: articles }, { data: categories }, { data: cities }, { data: pages }] =
    await Promise.all([
      supabase
        .from('articles')
        .select('slug, updated_at, published_at')
        .eq('status', 'published'),
      supabase.from('categories').select('slug'),
      supabase.from('cities').select('slug'),
      supabase.from('static_pages').select('slug, updated_at'),
    ]);

  const sitemap: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },

  ];

  (categories || []).forEach((c) => {
    sitemap.push({
      url: `${base}/category/${c.slug}`,
      changeFrequency: 'hourly',
      priority: 0.8,
    });
  });

  (cities || []).forEach((c) => {
    sitemap.push({
      url: `${base}/city/${c.slug}`,
      changeFrequency: 'hourly',
      priority: 0.7,
    });
  });

  (pages || []).forEach((p) => {
    sitemap.push({
      url: `${base}/p/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    });
  });

  (articles || []).forEach((a) => {
    sitemap.push({
      url: `${base}/news/${a.slug}`,
      lastModified: new Date(a.updated_at || a.published_at || new Date()),
      changeFrequency: 'weekly',
      priority: 0.9,
    });
  });

  return sitemap;
}
