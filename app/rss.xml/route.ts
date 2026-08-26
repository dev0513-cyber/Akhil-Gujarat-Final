import { getArticles } from '../../src/lib/server-data';
import type { Article } from '../../src/lib/types';

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  const articles = await getArticles({ limit: 50 });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://akhilgujarat.com';

  const items = articles.map((a: Article) => {
    const url = `${siteUrl}/news/${a.slug}`;
    const date = new Date(a.published_at || a.created_at).toUTCString();

    return `
      <item>
        <title><![CDATA[${a.headline}]]></title>
        <link>${url}</link>
        <guid>${url}</guid>
        <pubDate>${date}</pubDate>
        <description><![CDATA[${a.description || ''}]]></description>
        ${a.category?.name_gu ? `<category><![CDATA[${a.category.name_gu}]]></category>` : ''}
        ${a.image_url ? `<enclosure url="${a.image_url.startsWith('http') ? a.image_url : siteUrl + a.image_url}" type="image/jpeg" />` : ''}
      </item>
    `;
  }).join('');

  const feed = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
      <channel>
        <title>Akhil Gujarat News</title>
        <link>${siteUrl}</link>
        <description>Latest Gujarati News from Akhil Gujarat</description>
        <language>gu</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
        ${items}
      </channel>
    </rss>`;

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
    },
  });
}
