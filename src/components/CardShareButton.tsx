'use client';
import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

export default function CardShareButton({
  title,
  description,
  slug,
  light = false,
}: Readonly<{ title: string;
  description?: string;
  slug: string;
  light?: boolean; }>) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== 'undefined' ? `${window.location.origin}/news/${slug}` : '';

  const share = async () => {
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
      className={`absolute bottom-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 active:opacity-80 ${
        light
          ? 'bg-white/90 text-ink hover:bg-white'
          : 'bg-white border border-rule text-ink hover:bg-ink/5'
      }`}
    >
      {copied ? <Check size={15} /> : <Share2 size={15} />}
    </button>
  );
}
