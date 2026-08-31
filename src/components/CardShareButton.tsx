'use client';
import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

export default function CardShareButton({
  title,
  description,
  slug,
  className = 'absolute bottom-2 right-2',
  light = false,
}: Readonly<{ title: string;
  description?: string;
  slug: string;
  className?: string;
  light?: boolean; }>) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== 'undefined' ? `${window.location.origin}/news/${slug}` : '';

  const share = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: description, url });
      } catch {
        // user cancelled — ignore
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      aria-label={copied ? 'લિંક કોપી થઈ' : 'શેર કરો'}
      onClick={share}
      className={`z-10 inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-bold tracking-wide transition-colors active:scale-95 ${
        light
          ? 'bg-white/20 text-white backdrop-blur hover:bg-crimson'
          : 'bg-[#f7f1e6] text-ink hover:bg-crimson hover:text-white hover:shadow-sm'
      } ${className}`}
    >
      {copied ? <Check size={13} className={light ? 'text-green-300' : 'text-green-600'} /> : <Share2 size={13} />}
      {copied ? 'કોપી' : 'શેર'}
    </button>
  );
}
