# Card Share Buttons + Instagram Share — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a share icon to every in-use news card (hero, feature, standard, row) that opens the native share sheet on mobile and a 4-option popover on desktop, and add an Instagram share button to the article page share row.

**Architecture:** One new client component (`CardShareButton`) composes the existing `ShareButtons` row inside a desktop popover, or calls `navigator.share` directly on mobile. `ShareButtons` gains a hybrid Instagram button (native sheet when available, clipboard fallback). `NewsCard` (server component) renders `CardShareButton` as a SIBLING of its `<Link>` — never inside it — to avoid the nested-interactive-element hydration bug this repo previously fixed.

**Tech Stack:** Next.js 16.3.1 (App Router), React 19, TypeScript, lucide-react (Share2 icon), existing inline SVG icon pattern.

## Global Constraints

- No new dependencies, no env vars, no API/DB changes, no new routes.
- Share URL on cards is ALWAYS built client-side: `window.location.origin + '/news/' + slug`.
- Instagram has no direct-post URL; the button uses hybrid behavior: `navigator.share({ title, url })` when available, else clipboard + 2s feedback "લિંક કોપી થઈ — Instagram માં પેસ્ટ કરો".
- Copy-link button (લિંક કોપી) behavior and text unchanged. WhatsApp/Facebook anchors unchanged.
- `compact` and `video` NewsCard variants are dead code — NOT touched.
- Verification: `npx tsc --noEmit` clean, `npm run lint` 0 errors (6 pre-existing warnings incl. the `req` unused-param warning in app/api/articles/route.ts — not ours), `npm test` 28/28. No component-test infra exists in this repo; UI correctness is verified by typecheck + build.
- Branch: `feat/taja-samachar-today-filter`, clean working tree, commit only the task's files.

---

### Task 1: Instagram button in ShareButtons

**Files:**
- Modify: `src/components/ShareButtons.tsx`

**Interfaces:**
- Consumes: existing `ShareButtons` props `{ title: string; url?: string; compact?: boolean }`.
- Produces: `ShareButtons` with an Instagram button between Facebook and the copy button. Task 2 composes it with `compact` + `url` props (both already supported).

- [ ] **Step 1: Add Instagram state and handler**

In `src/components/ShareButtons.tsx`:

a) After `const [copied, setCopied] = useState(false);` add:
```tsx
  const [igCopied, setIgCopied] = useState(false);
```

b) After the `copy` function (which stays unchanged), add:
```tsx
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
```

- [ ] **Step 2: Add the Instagram button between Facebook and the copy button**

Insert between the Facebook `</a>` (line 52) and the copy `<button>` (line 53):
```tsx
      <button type="button" className={btn} onClick={shareInstagram}>
        {igCopied ? <Check size={13} /> : <InstagramIcon />}
        {igCopied ? 'કોપી થયું — Instagram માં પેસ્ટ કરો' : 'Instagram'}
      </button>
```

- [ ] **Step 3: Add the InstagramIcon component**

After the `FacebookIcon` function at the end of the file, add:
```tsx
function InstagramIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — Expected: clean.
Run: `npm run lint` — Expected: 0 errors, 6 pre-existing warnings.
Run: `npm test` — Expected: 28/28 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/ShareButtons.tsx
git commit -m "feat: add Instagram share button with native sheet and copy fallback"
```

### Task 2: CardShareButton component

**Files:**
- Create: `src/components/CardShareButton.tsx`

**Interfaces:**
- Consumes: `ShareButtons` with props `{ title, url, compact }` (Task 1), `Share2` from lucide-react.
- Produces: `CardShareButton({ title: string; slug: string; className?: string; light?: boolean })` — Task 3 consumes it. Behavior: tap → `navigator.share({ title, url })` if available (mobile), else toggles a popover containing `<ShareButtons title url compact />`. Popover closes on outside click / Escape. `light` (default false) → white icon style for dark hero banner.

- [ ] **Step 1: Create the component**

Create `src/components/CardShareButton.tsx` with exactly:
```tsx
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
        <div className="absolute right-0 top-10 z-30 bg-white border border-rule shadow-lg p-3 rounded-md w-max max-w-[240px]">
          <ShareButtons title={title} url={shareUrl} compact />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` — Expected: clean.
Run: `npm run lint` — Expected: 0 errors, 6 pre-existing warnings.
Run: `npm test` — Expected: 28/28 passing.

- [ ] **Step 3: Commit**

```bash
git add src/components/CardShareButton.tsx
git commit -m "feat: add share button for news cards"
```

### Task 3: Wire CardShareButton into NewsCard variants

**Files:**
- Modify: `src/components/NewsCard.tsx`

**Interfaces:**
- Consumes: `CardShareButton({ title, slug, className?, light? })` (Task 2).
- Produces: hero/feature/standard/row variants with a share button as a SIBLING of the `<Link>`; compact/video variants byte-identical.

- [ ] **Step 1: Add the import**

At the top of `src/components/NewsCard.tsx`, after the `youtubeThumb` import (line 6), add:
```tsx
import CardShareButton from './CardShareButton';
```

- [ ] **Step 2: hero variant — wrap Link in a relative container, add button**

Replace the hero return (currently lines 22-63) with:
```tsx
  if (variant === 'hero') {
    return (
      <div className="relative h-full">
        <Link href={href} className="group relative block overflow-hidden bg-ink h-full min-h-[320px] md:min-h-[460px]">
          <Image
            src={img}
            alt={article.headline}
            fill
            sizes="(max-width: 768px) 100vw, 66vw"
            className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-8 text-white">
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
            <p className="mt-3 text-white/55 text-xs flex items-center gap-2">
              <Clock size={12} /> {formatDateGu(article.published_at)}
            </p>
          </div>
        </Link>
        <CardShareButton title={article.headline} slug={article.slug} light className="absolute top-4 right-4 z-10" />
      </div>
    );
  }
```

- [ ] **Step 3: feature variant — wrap Link, add button**

Replace the feature return (currently lines 65-81) with:
```tsx
  if (variant === 'feature') {
    return (
      <div className="relative h-full">
        <Link href={href} className="group flex flex-col h-full bg-white border border-rule/70 hover:shadow-md transition-shadow">
          <div className="relative aspect-[16/10] overflow-hidden bg-paper-dark">
            <Image src={img} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
            {hasVideo && <PlayBadge />}
          </div>
          <div className="p-4 flex-1 flex flex-col">
            <Meta article={article} />
            <h3 className="font-display text-lg leading-snug mt-1.5 group-hover:text-crimson transition-colors">
              {article.headline}
            </h3>
            <p className="mt-2 text-sm text-ink/65 line-clamp-2 font-gujarati">{article.description}</p>
          </div>
        </Link>
        <CardShareButton title={article.headline} slug={article.slug} className="absolute top-2 right-2 z-10" />
      </div>
    );
  }
```

- [ ] **Step 4: row variant — wrapper flex, button inline at right**

Replace the row return (currently lines 83-98) with:
```tsx
  if (variant === 'row') {
    return (
      <div className="flex items-stretch gap-1 border-b border-rule/60 last:border-0">
        <Link href={href} className="group flex gap-3 py-3 flex-1 min-w-0">
          <div className="relative w-28 h-20 shrink-0 overflow-hidden bg-paper-dark">
            <Image src={img} alt="" fill sizes="112px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
            {hasVideo && <PlayBadge small />}
          </div>
          <div className="min-w-0">
            <Meta article={article} />
            <h3 className="font-display text-[15px] leading-snug group-hover:text-crimson line-clamp-3">
              {article.headline}
            </h3>
          </div>
        </Link>
        <CardShareButton title={article.headline} slug={article.slug} className="self-center mr-1" />
      </div>
    );
  }
```

- [ ] **Step 5: standard variant — wrap Link, add button**

Replace the final return (currently lines 129-141) with:
```tsx
  return (
    <div className="relative">
      <Link href={href} className="group flex flex-col">
        <div className="relative aspect-[16/10] overflow-hidden bg-paper-dark">
          <Image src={img} alt="" fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
          {hasVideo && <PlayBadge />}
        </div>
        <Meta article={article} />
        <h3 className="font-display text-base md:text-lg leading-snug mt-1.5 group-hover:text-crimson">
          {article.headline}
        </h3>
        <p className="mt-1.5 text-sm text-ink/60 line-clamp-2 font-gujarati">{article.description}</p>
      </Link>
      <CardShareButton title={article.headline} slug={article.slug} className="absolute top-2 right-2 z-10" />
    </div>
  );
```

- [ ] **Step 6: Verify compact/video untouched + full checks**

Run (PowerShell):
```powershell
Select-String -Path "src\components\NewsCard.tsx" -Pattern "CardShareButton" | Measure-Object | Select-Object -ExpandProperty Count
```
Expected: 4 (one per wired variant).

Run: `npx tsc --noEmit` — Expected: clean.
Run: `npm run lint` — Expected: 0 errors, 6 pre-existing warnings.
Run: `npm test` — Expected: 28/28 passing.

- [ ] **Step 7: Commit**

```bash
git add src/components/NewsCard.tsx
git commit -m "feat: add share button to news card variants"
```