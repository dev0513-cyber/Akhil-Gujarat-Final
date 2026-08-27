"use client";
import { useState, useEffect } from 'react';
import { Check, Link2 } from 'lucide-react';

export default function ShareButtons({
  title,
  url,
  compact = false,
}: Readonly<{ title: string;
  url?: string;
  compact?: boolean; }>) {
  const [copied, setCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState(url || '');

  useEffect(() => {
    if (!url) {
      setShareUrl(window.location.href);
    }
  }, [url]);
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(title);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const shareInstagram = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch {
        // user cancelled — ignore
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIgCopied(true);
      setTimeout(() => setIgCopied(false), 2000);
    } catch {
      setIgCopied(false);
    }
  };

  const btn =
    'inline-flex items-center gap-1.5 rounded-full border border-rule bg-white px-3 py-1.5 text-xs font-medium text-ink/80 hover:border-crimson hover:text-crimson transition-colors';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'mt-3'}`}>
      {!compact && (
        <span className="text-xs uppercase tracking-[0.16em] text-ink/45 font-medium">શેર</span>
      )}
      <a
        className={btn}
        href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <WhatsAppIcon />
        WhatsApp
      </a>
      <a
        className={btn}
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <FacebookIcon />
        Facebook
      </a>
      <button type="button" className={btn} onClick={shareInstagram}>
        {igCopied ? <Check size={13} /> : <InstagramIcon />}
        {igCopied ? 'કોપી થયું — Instagram માં પેસ્ટ કરો' : 'Instagram'}
      </button>
      <button type="button" className={btn} onClick={copy}>
        {copied ? <Check size={13} /> : <Link2 size={13} />}
        {copied ? 'કોપી થયું' : 'લિંક કોપી'}
      </button>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.52 3.48A11.8 11.8 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.6 5.96L0 24l6.3-1.65a11.86 11.86 0 0 0 5.75 1.47h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.44-8.44ZM12.06 21.15h-.01a9.86 9.86 0 0 1-5.02-1.37l-.36-.21-3.74.98 1-3.64-.24-.37a9.84 9.84 0 0 1-1.51-5.25c0-5.44 4.43-9.86 9.88-9.86 2.64 0 5.11 1.03 6.98 2.9a9.82 9.82 0 0 1 2.89 6.97c0 5.44-4.43 9.85-9.87 9.85Zm5.42-7.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.04-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22 12.07C22 6.5 17.52 2 12 2S2 6.5 2 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.54V9.84c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.75 8.44-4.91 8.44-9.93Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
