'use client';
import { useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import ShareButtons from './ShareButtons';

export default function CardShareButton({
  title,
  light = false,
}: Readonly<{ title: string;
  light?: boolean; }>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="absolute bottom-2 right-2 z-10">
      <button
        type="button"
        aria-label="શેર કરો"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${
          light
            ? 'bg-white/90 text-ink hover:bg-white'
            : 'bg-white border border-rule text-ink hover:bg-ink/5'
        }`}
      >
        <Share2 size={15} />
      </button>
      {open && (
        <div className="absolute right-0 bottom-10 z-30 w-max max-w-[240px] bg-white border border-rule rounded-xl shadow-lg p-2">
          <ShareButtons title={title} url={typeof window !== 'undefined' ? window.location.href : ''} compact />
        </div>
      )}
    </div>
  );
}
