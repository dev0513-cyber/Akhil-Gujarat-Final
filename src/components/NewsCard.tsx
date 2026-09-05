import Link from 'next/link';
import Image from 'next/image';
import { Clock, Play } from 'lucide-react';
import type { Article } from '../lib/types';
import { formatDateGu } from '../lib/format';
import { youtubeThumb } from '../lib/youtube';
import CardShareButton from './CardShareButton';

type Variant = 'hero' | 'feature' | 'standard' | 'row' | 'compact' | 'video';

function VideoPreview({ url }: { url: string }) {
  if (!url) return null;
  const isNative = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm');
  if (isNative) {
    return <video src={url} autoPlay muted loop playsInline className="object-cover w-full h-full absolute inset-0" />;
  }

  const match = url.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
  if (match) {
    // Instagram gradient placeholder instead of a garbled iframe
    return (
      <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] opacity-80" />
    );
  }
  
  // Generic video fallback placeholder
  return (
    <div className="absolute inset-0 w-full h-full bg-ink flex items-center justify-center">
       <div className="absolute inset-0 bg-[url('/images/pattern.png')] opacity-10"></div>
    </div>
  );
}

export default function NewsCard({
  article,
  variant = 'standard',
}: Readonly<{ article: Article;
  variant?: Variant; }>) {
  const href = `/news/${article.slug}`;
  let img = article.image_url || youtubeThumb(article.video_url);
  const hasVideo = Boolean(article.video_url);
  const needsVideoPreview = !img && hasVideo;
  if (!img) img = '/images/og-default.jpg';

  if (variant === 'hero') {
    return (
      <div className="relative h-full">
        <Link href={href} className="group relative block overflow-hidden bg-ink h-full min-h-[320px] md:min-h-[460px] active:scale-[0.98] transition-transform">
          {needsVideoPreview ? (
            <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-700 pointer-events-none">
              <VideoPreview url={article.video_url!} />
            </div>
          ) : (
            <Image
              src={img}
              alt={article.headline}
              fill
              sizes="(max-width: 768px) 100vw, 66vw"
              className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
              unoptimized={img.startsWith('/api/media')}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-8 text-white pointer-events-none">
            <div className="flex items-center gap-2 mb-3">
              {article.category && (
                <span className="bg-crimson text-white text-[11px] tracking-wider uppercase px-2 py-0.5">
                  {article.category.name_gu}
                </span>
              )}
              {article.city && (
                <span className="bg-ink text-white text-[11px] tracking-wider uppercase px-2 py-0.5 border border-white/20">
                  {article.city.name_gu}
                </span>
              )}
              {article.is_trending && (
                <span className="bg-gold text-ink text-[11px] tracking-wider uppercase px-2 py-0.5">
                  ટોપ
                </span>
              )}
            </div>
            <h2 className="font-display text-2xl md:text-4xl leading-snug group-hover:text-gold transition-colors">
              {article.headline}
            </h2>
            <p className="mt-2 text-white/80 text-sm md:text-base line-clamp-2 max-w-3xl font-gujarati">
              {article.description}
            </p>
            <p className="mt-3 text-white/55 text-xs flex items-center gap-2 pb-6 md:pb-0">
              <Clock size={12} /> <span suppressHydrationWarning>{formatDateGu(article.published_at)}</span>
            </p>
          </div>
        </Link>
        <CardShareButton title={article.headline} description={article.description} slug={article.slug} className="absolute bottom-4 right-4 md:bottom-6 md:right-6" light />
      </div>
    );
  }

  if (variant === 'feature') {
    return (
      <div className="relative h-full">
        <Link href={href} className="group flex flex-col h-full bg-white border border-rule/70 hover:shadow-md transition-all active:scale-[0.98]">
          <div className="relative aspect-[16/10] overflow-hidden bg-paper-dark">
            {needsVideoPreview ? (
               <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-500 pointer-events-none">
                 <VideoPreview url={article.video_url!} />
               </div>
            ) : (
              <Image src={img} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized={img.startsWith('/api/media')} />
            )}
            {hasVideo && <PlayBadge />}
          </div>
          <div className="p-4 pb-12 flex-1 flex flex-col pointer-events-none">
            <Meta article={article} />
            <h3 className="font-display text-lg leading-snug mt-1.5 group-hover:text-crimson transition-colors">
              {article.headline}
            </h3>
            <p className="mt-2 text-sm text-ink/70 line-clamp-2 font-gujarati">{article.description}</p>
          </div>
        </Link>
        <CardShareButton title={article.headline} description={article.description} slug={article.slug} className="absolute bottom-3 right-3" />
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className="relative border-b border-rule/60 last:border-0">
        <Link href={href} className="group flex gap-3 py-3 pr-14 transition-transform active:scale-[0.98]">
          <div className="relative w-28 h-20 shrink-0 overflow-hidden bg-paper-dark">
            {needsVideoPreview ? (
               <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-500 pointer-events-none">
                 <VideoPreview url={article.video_url!} />
               </div>
            ) : (
              <Image src={img} alt="" fill sizes="112px" className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized={img.startsWith('/api/media')} />
            )}
            {hasVideo && <PlayBadge small />}
          </div>
          <div className="min-w-0 pointer-events-none">
            <Meta article={article} />
            <h3 className="font-display text-[15px] leading-snug group-hover:text-crimson line-clamp-3">
              {article.headline}
            </h3>
          </div>
        </Link>
        <CardShareButton title={article.headline} description={article.description} slug={article.slug} className="absolute bottom-3 right-0" />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Link href={href} className="group block py-2.5 border-b border-rule/50 last:border-0 transition-transform active:scale-[0.98]">
        <h3 className="font-display text-[15px] leading-snug group-hover:text-crimson">{article.headline}</h3>
        <p className="text-[11px] text-ink/70 mt-1" suppressHydrationWarning>{formatDateGu(article.published_at)}</p>
      </Link>
    );
  }

  if (variant === 'video') {
    return (
      <Link href={href} className="group block transition-transform active:scale-[0.98]">
        <div className="relative aspect-video overflow-hidden bg-ink">
          {needsVideoPreview ? (
             <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-500 pointer-events-none opacity-90">
               <VideoPreview url={article.video_url!} />
             </div>
          ) : (
            <Image src={img} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" unoptimized={img.startsWith('/api/media')} />
          )}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-14 h-14 rounded-full bg-crimson text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play size={22} fill="currentColor" />
            </span>
          </div>
        </div>
        <h3 className="font-display text-base mt-2.5 leading-snug group-hover:text-crimson line-clamp-2">
          {article.headline}
        </h3>
        <p className="text-xs text-ink/70 mt-1" suppressHydrationWarning>{formatDateGu(article.published_at)}</p>
      </Link>
    );
  }

  return (
    <div className="relative">
      <Link href={href} className="group flex flex-col transition-transform active:scale-[0.98]">
        <div className="relative aspect-[16/10] overflow-hidden bg-paper-dark">
          {needsVideoPreview ? (
             <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-500 pointer-events-none">
               <VideoPreview url={article.video_url!} />
             </div>
          ) : (
            <Image src={img} alt="" fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized={img.startsWith('/api/media')} />
          )}
          {hasVideo && <PlayBadge />}
        </div>
        <div className="pointer-events-none mt-1">
          <Meta article={article} />
          <h3 className="font-display text-base md:text-lg leading-snug mt-1.5 group-hover:text-crimson">
            {article.headline}
          </h3>
          <p className="mt-1.5 pb-10 text-sm text-ink/70 line-clamp-2 font-gujarati">{article.description}</p>
        </div>
      </Link>
      <CardShareButton title={article.headline} description={article.description} slug={article.slug} className="absolute bottom-1 right-0" />
    </div>
  );
}

function Meta({ article }: Readonly<{ article: Article }>) {
  return (
    <div className="flex items-center flex-wrap gap-2 text-[11px] text-ink/70 mt-2 pointer-events-none">
      {article.category && (
        <span className="text-crimson font-semibold tracking-wide">{article.category.name_gu}</span>
      )}
      {article.city && (
        <>
          <span className="text-rule">•</span>
          <span className="text-ink font-semibold tracking-wide">{article.city.name_gu}</span>
        </>
      )}
      <span className="text-rule">•</span>
      <span suppressHydrationWarning>{formatDateGu(article.published_at)}</span>
    </div>
  );
}

function PlayBadge({ small = false }: Readonly<{ small?: boolean }>) {
  return (
    <span
      className={`absolute bottom-2 right-2 bg-crimson text-white rounded-full flex items-center justify-center pointer-events-none ${small ? 'w-6 h-6' : 'w-8 h-8'}`}
    >
      <Play size={small ? 11 : 14} fill="currentColor" />
    </span>
  );
}
