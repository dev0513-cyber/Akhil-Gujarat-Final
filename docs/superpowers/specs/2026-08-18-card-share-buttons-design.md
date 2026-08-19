# Share Buttons on News Cards + Instagram Share

**Date:** 2026-08-18
**Status:** Approved by user
**Branch:** feat/taja-samachar-today-filter (continues current branch)

## Goal

1. Add a share button to every news card in use on the site (hero, feature, standard, row variants), so readers can share an article directly from the main page / listing without opening it.
2. Add an Instagram share button to the article page share row (which appears at top and bottom of the article), alongside WhatsApp and Facebook.
3. Copy-link behavior stays exactly as-is.

## User Decisions (from brainstorming)

- **Instagram behavior (hybrid):** tap → `navigator.share({ title, url })` when available (native sheet shows Instagram on mobile); otherwise copy the link with feedback "લિંક કોપી થઈ — Instagram માં પેસ્ટ કરો". Instagram has no direct post URL API, so this is the only reliable approach.
- **Card variants:** only the 4 used variants — hero, feature, standard, row. compact and video are dead code (unused anywhere) and are NOT touched.
- **Card button style:** icon-only circular Share2 overlay button.
- **Card tap behavior:** native share sheet on mobile (when `navigator.share` exists); popover with the 4 share options on desktop.

## Changes

### 1. `src/components/ShareButtons.tsx` — add Instagram button

- Add an Instagram button after the Facebook button, using the same `btn` styling.
- Click handler (hybrid):
  - if `typeof navigator !== 'undefined' && navigator.share` → `navigator.share({ title, url: shareUrl })`
  - else → `navigator.clipboard.writeText(shareUrl)` + 2s "લિંક કોપી થઈ — Instagram માં પેસ્ટ કરો" feedback state (reuse the existing `copied` state pattern; separate state from the copy button's feedback so both buttons behave independently)
- Add `InstagramIcon` inline SVG component (same 13x13 sizing pattern as WhatsAppIcon/FacebookIcon).
- The existing copy button (લિંક કોપી) is unchanged.
- No other behavior changes; WhatsApp/Facebook anchors unchanged.

### 2. New file `src/components/CardShareButton.tsx` (client component)

- Props: `Readonly<{ title: string; slug: string; className?: string; light?: boolean }>` — `light` (default false) renders the white-on-dark icon style used on the hero banner; default is the dark-on-light overlay style used on feature/standard/row.
- Builds the share URL client-side: `window.location.origin + '/news/' + slug` — correct on every domain, no env dependency.
- Render: a circular icon button (`<button type="button">` with Share2 lucide icon, 30px, white/translucent bg with shadow, crimson hover).
- Tap handler:
  - `navigator.share` available → `navigator.share({ title, url })`, catch AbortError silently.
  - else → toggle popover state.
- Popover: absolutely positioned panel below the button (right-aligned), white bg, border, shadow, z-30; contains `<ShareButtons title={title} url={shareUrl} compact />` (the 4-button row).
- Popover closes on: outside click (document `mousedown` listener added when open) and Escape key.
- Accessibility: `aria-label="શેર કરો"` on the button; `aria-expanded` on popover toggle.

### 3. `src/components/NewsCard.tsx` — wire CardShareButton into the 4 used variants

NewsCard stays a server component; CardShareButton is a client child (allowed — children of server components can be client components). The share button must be a SIBLING of the `<Link>`, never inside it (nested interactive elements cause the hydration error this repo fixed before in EPapers.tsx/ArticleEditor.tsx).

- **hero:** wrap the existing `<Link ...>` in `<div className="relative h-full">`; add `<CardShareButton light className="absolute top-4 right-4 z-10" ... />` after the Link (white icon on the dark banner image).
- **feature:** wrap in `<div className="relative h-full">`; `<CardShareButton className="absolute top-2 right-2 z-10" ... />`.
- **standard:** wrap in `<div className="relative">`; same overlay as feature.
- **row:** wrap the row in `<div className="flex items-stretch gap-1 border-b border-rule/60 last:border-0">`; Link keeps `flex-1 min-w-0`; `<CardShareButton className="self-center mr-1" ... />` as sibling. The Link's own border-b class moves to the wrapper to keep divider styling identical.
- Pass `title={article.headline}` and `slug={article.slug}` everywhere.
- compact and video variants unchanged.

### 4. Article page — no changes needed

`app/(main)/news/[slug]/page.tsx` uses `<ShareButtons title={article.headline} />` at both locations; the Instagram button appears automatically. The default `url` (window.location.href) remains correct there.

## Non-Changes

- No new dependencies, no env vars, no API changes, no DB changes.
- `EPaperClient.tsx` share logic untouched.
- Copy-link behavior and feedback unchanged.
- No new routes or server code.

## Verification

- `npx tsc --noEmit` clean
- `npm run lint` 0 errors (6 pre-existing warnings — includes the `req` unused param warning; not caused by this work)
- `npm test` 28/28
- Manual: card icons render on homepage (hero/standard/row), category page (feature), search page (row); mobile → native sheet; desktop → popover with 4 buttons; Instagram button copies on desktop with feedback; article page shows 4 buttons top + bottom.