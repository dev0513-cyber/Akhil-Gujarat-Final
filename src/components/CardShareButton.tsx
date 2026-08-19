"use client";
import { useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import ShareButtons from './ShareButtons';

export default function CardShareButton({
  title,
  slug,
  className = '',
  light = false,
}: Readonly<{ title: string;
  slug: string;
  className?: string;
  light?: boolean }>) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/news/${slug}` : '';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleClick = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch {
        // user cancelled — ignore
      }
      return;
    }
    setOpen((v) => !v);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        aria-label="શેર કરો"
        aria-expanded={open}
        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${
          light
            ? 'bg-white/90 text-ink hover:bg-white'
            : 'bg-white/90 text-ink hover:text-crimson border border-rule'
        }`}
      >
        <Share2 size={14} />
      </button>
      {open && (
        <div className="absolute right-0 bottom-10 z-30 bg-white border border-rule shadow-lg p-3 rounded-md w-max max-w-[240px]">
          <ShareButtons title={title} url={shareUrl} compact />
        </div>
      )}
    </div>
  );
}
