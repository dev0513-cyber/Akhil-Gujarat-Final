'use client';
import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

export default function CardShareButton({
  title,
  light = false,
}: Readonly<{ title: string;
  light?: boolean; }>) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';

  const share = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
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
      className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${
        light
          ? 'bg-white/90 text-ink hover:bg-white'
          : 'bg-white border border-rule text-ink hover:bg-ink/5'
      }`}
    >
      {copied ? <Check size={15} /> : <Share2 size={15} />}
    </button>
  );
}
