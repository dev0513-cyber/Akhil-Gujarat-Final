"use client";
import { useEffect } from 'react';

type SEOProps = {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  publishedTime?: string;
  jsonLd?: Record<string, unknown> | null;
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default function SEO({
  title,
  description = 'અખિલ ગુજરાત — ગુજરાત, ભારત અને વિશ્વના તાજા ગુજરાતી સમાચાર.',
  image,
  url,
  type = 'website',
  publishedTime,
  jsonLd,
}: SEOProps) {
  useEffect(() => {
    const fullTitle = title.includes('અખિલ ગુજરાત') ? title : `${title} | અખિલ ગુજરાત`;
    document.title = fullTitle;

    const canonicalUrl = url || window.location.href.split('?')[0];
    let imageUrl = `${window.location.origin}/images/og-default.jpg`;
    if (image) {
      if (image.startsWith('http')) {
        imageUrl = image;
      } else {
        imageUrl = `${window.location.origin}${image}`;
      }
    }

    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:site_name', 'Akhil Gujarat');
    upsertMeta('property', 'og:locale', 'gu_IN');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', imageUrl);
    if (publishedTime) upsertMeta('property', 'article:published_time', publishedTime);

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonicalUrl;

    const scriptId = 'ag-jsonld';
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      const leftover = document.getElementById(scriptId);
      if (leftover) leftover.remove();
    };
  }, [title, description, image, url, type, publishedTime, jsonLd]);

  return null;
}
