"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getAdFrame } from '../lib/ads';
import type { Ad } from '../lib/types';

export default function AdBannerClient({ ads, className = 'my-8' }: Readonly<{ ads: Ad[]; className?: string }>) {
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    if (!ads || ads.length === 0) return;

    const now = new Date();
    const validAds = ads.filter(a => {
      if (a.start_date && new Date(a.start_date) > now) return false;
      if (a.end_date && new Date(a.end_date) < now) return false;
      return true;
    });

    if (validAds.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAd(validAds[Math.floor(Math.random() * validAds.length)]);
    }
  }, [ads]);

  if (!ad) return null;

  const frame = getAdFrame(ad.frame);
  const box = `block border border-rule/60 bg-white overflow-hidden ${frame.maxWidth} mx-auto`;

  const content = (
    <div className={`relative w-full ${frame.aspect}`}>
      <Image
        src={ad.image_url}
        alt={ad.title}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 1600px"
        unoptimized={ad.image_url.startsWith('/api/media')}
      />
    </div>
  );

  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40 mb-1.5 font-medium text-center">
        જાહેરાત / Advertisement
      </p>
      {ad.link_url ? (
        <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className={box}>
          {content}
        </a>
      ) : (
        <div className={box}>
          {content}
        </div>
      )}
    </div>
  );
}
