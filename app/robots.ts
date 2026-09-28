import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://akhilgujaratdaily.com';

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/media/'],
      disallow: ['/admin', '/admin/', '/login', '/api/'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
