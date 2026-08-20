# Ads v2 — Frames, Optional Links, More Slots, Article-style Actions

**Date:** 2026-08-20
**Status:** Approved by user
**Branch:** feat/taja-samachar-today-filter (continues current branch)

## Goal

Upgrade the ads banner system (built 2026-08-19) with four capabilities:

1. **Frames** — admins pick a display frame per ad (banner / rectangle / skyscraper / small); the frontend renders the ad image inside that frame.
2. **Optional links** — `link_url` may be blank; blank links render a static, non-clickable image.
3. **More placement slots** — 5 new slots (11 total) covering the homepage aside, between category bands, after the city-news section, an article-page sidebar, and the search page.
4. **Article-style admin actions** — the ads table's Edit/Delete actions match the articles admin page's pill-button style.

## Current State (baseline)

- `Ad` type in `src/lib/types.ts`: `id`, `title`, `image_url`, `link_url`, `slot`, `is_active`, `created_at`.
- `AD_SLOTS` in `src/lib/ads.ts`: 6 slots — homepage_after_hero, homepage_between, article_top, article_middle, article_bottom, category_top — plus `AdSlotKey` and `AD_SLOT_KEYS` (tuple-typed for `z.enum`).
- `getAdsForSlot(slot)` in `src/lib/server-data.ts` — uncached, filters `slot` + `is_active`, random pick, `null` when empty, throws on DB error.
- `app/api/ads/route.ts` — GET public; POST/PUT via `requireAdmin` + `adSchema`; DELETE via `handleAdminDelete(req, 'ads', 'ads')`; `revalidateTag('ads')`.
- `adSchema` in `src/lib/validation.ts` — title (1-255), image_url (min 1), link_url (min 1), slot enum, is_active default true.
- `src/components/AdBanner.tsx` — async server component; `{ slot, className='my-8' }`; renders a full-width `<a>` with a labelled container; `null` when no ad.
- `src/components/admin/Ads.tsx` — full CRUD; icon-only Pencil/Trash2 actions; modal form (title, image upload with preview, link, slot dropdown, active checkbox); useSWR(['ads'], fetchAds).
- `src/lib/api.ts` — `fetchAds`, `saveAd` (method `payload.id ? 'PUT' : 'POST'`), `deleteAd`, `uploadFile`.
- Homepage (`app/(main)/page.tsx`): hero + trending aside (3-col grid), homepage_after_hero, તાજા સમાચાર section, homepage_between, three HighlightBands (gujarat/india/international), શહેરી સમાચાર section.
- Article page (`app/(main)/news/[slug]/page.tsx`): single-column `<article className="max-w-3xl mx-auto px-4 py-8">` with article_top / article_middle / article_bottom slots, then a related-articles section.
- Category/city pages: `src/components/FilteredArticleView.tsx` renders category_top.
- Uploads (`app/api/upload/route.ts`): jpeg/png/webp compressed to WebP max-1600px q80 via sharp; gif/pdf untouched.

## Changes

### 1. Frames

- Add `AD_FRAMES` to `src/lib/ads.ts`:

  ```ts
  export const AD_FRAMES = [
    { key: 'banner',     labelGu: 'બેનર',     labelEn: 'Banner',     aspect: 'aspect-[4/1]',  maxWidth: '' },
    { key: 'rectangle',  labelGu: 'લંબચોરસ',  labelEn: 'Rectangle',  aspect: 'aspect-[6/5]',  maxWidth: 'max-w-[300px]' },
    { key: 'skyscraper', labelGu: 'ઊભી',      labelEn: 'Skyscraper',  aspect: 'aspect-[1/2]',  maxWidth: 'max-w-[300px]' },
    { key: 'small',      labelGu: 'નાની',     labelEn: 'Small',       aspect: 'aspect-[16/9]', maxWidth: 'max-w-[160px]' },
  ] as const;
  export type AdFrameKey = (typeof AD_FRAMES)[number]['key'];
  export const AD_FRAME_KEYS: readonly [string, ...string[]] = AD_FRAMES.map((f) => f.key) as unknown as readonly [string, ...string[]];
  ```

- `Ad` type gains `frame: string` (union `AdFrameKey` preferred; the type file already imports `Ad` in types.ts which currently does not import from ads.ts — keep `frame: string` on `Ad` to avoid a types→ads import cycle; `adSchema` constrains it to the enum).
- `adSchema`: add `frame: z.enum(AD_FRAME_KEYS).default('banner')`.

### 2. Optional links

- `adSchema`: `link_url` becomes optional — `z.string().max(2000).default('')` (empty string = no link). DB column stays `text not null` with empty-string default; no DB change for this.
- Client form: remove the title+link required validation; keep title required only (image required server-side).
- `AdBanner`: when `ad.link_url` is empty, render the frame box as a plain `<div>` instead of `<a>` (no click, no `target`/`rel`).

### 3. AdBanner frame rendering

- New props: `{ slot, className='my-8' }` unchanged. Inside, look up the ad's frame from `AD_FRAMES` (fallback to `banner` for unknown values).
- Structure:

  ```tsx
  <div className={className}>
    <p className="...">જાહેરાત / Advertisement</p>
    {ad.link_url ? (
      <a href={ad.link_url} target="_blank" rel="noopener noreferrer"
         className={`block border border-rule/60 bg-white overflow-hidden ${frame.maxWidth} mx-auto`}>
        <div className={`relative w-full ${frame.aspect}`}>
          <Image src={ad.image_url} alt={ad.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 1600px" />
        </div>
      </a>
    ) : (
      <div className={`block border border-rule/60 bg-white overflow-hidden ${frame.maxWidth} mx-auto`}>
        <div className={`relative w-full ${frame.aspect}`}>
          <Image src={ad.image_url} alt={ad.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 1600px" />
        </div>
      </div>
    )}
  </div>
  ```

  - Banner frame has empty `maxWidth` → `max-w-[300px]`/`max-w-[160px]` absent → full width of the slot container. Non-banner frames are horizontally centered (`mx-auto`) and capped.
  - Mobile: non-banner frames keep their max width even on small screens (standard ad-unit behaviour); banner spans the container width on all breakpoints.
  - The frame box is intentionally a fixed aspect ratio + `object-cover` crop regardless of the uploaded image's own dimensions.

### 4. New slots (11 total)

Append to `AD_SLOTS` in `src/lib/ads.ts` (order matters only for display in the admin dropdown):

- `homepage_trending_sidebar` — labelGu 'હોમપેજ — ટ્રેન્ડિંગ સાઇડબાર', labelEn 'Homepage — trending sidebar'
- `homepage_between_categories` — 'હોમપેજ — વિભાગો વચ્ચે', 'Homepage — between categories'
- `homepage_after_city` — 'હોમપેજ — શહેરી સમાચાર પછી', 'Homepage — after city news'
- `article_sidebar` — 'આર્ટિકલ — સાઇડબાર', 'Article — sidebar'
- `search_top` — 'શોધ — ઉપર', 'Search — top'

Wiring:

- **Homepage** (`app/(main)/page.tsx`):
  - `homepage_trending_sidebar` — inside the trending `<aside>`, after the trending rows (bottom of the aside). Add `<AdBanner slot="homepage_trending_sidebar" className="mt-4" />` after the trending `<div>` (line ~46), inside the `flex flex-col justify-between` aside so it pins to the bottom.
  - `homepage_between_categories` — after the first HighlightBand (after the Gujarat band, before the India band). Insert `<AdBanner slot="homepage_between_categories" className="mt-10" />` between lines 65 and 66.
  - `homepage_after_city` — after the શહેરી સમાચાર `</section>` (after line 88), before the fragment close. `<AdBanner slot="homepage_after_city" className="mt-10" />`.
- **Article page** (`app/(main)/news/[slug]/page.tsx`):
  - The page fetches `const sidebarAd = await getAdsForSlot('article_sidebar')` (import from `src/lib/server-data`) so the layout can be conditional — otherwise an empty slot would leave a blank 300px column on desktop.
  - When `sidebarAd` exists: wrap the article + related sections in `<div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-8">`. The `<article>` goes in the first column (`min-w-0`, keeps `max-w-3xl mx-auto` for unchanged typography); `<aside>` (second column) renders `<AdBanner slot="article_sidebar" />` (skyscraper/rectangle fit naturally; banner/small also work, centered). Related-articles section spans full width (`lg:col-span-2`).
  - When `sidebarAd` is null: keep the existing single-column layout unchanged.
  - Note: AdBanner re-queries the slot internally for its own render; the page-level `getAdsForSlot` call is only a presence check. The cost is negligible (small table, uncached query) and keeps the layout correct.
- **Search page** (`app/(main)/search/page.tsx`): add `<AdBanner slot="search_top" className="mb-6" />` above the results container.
- Existing 6 slots unchanged.

### 5. Admin UI (`src/components/admin/Ads.tsx`)

- **Table actions → Article-style.** Replace the icon-only Pencil/Trash2 with the Articles.tsx pattern (lines 164-177):
  - Edit: a link/button styled `px-3 py-1 bg-ink text-white text-xs rounded ... font-semibold tracking-wide` labelled `t('સંપાદન', 'Edit')`, opening the edit form.
  - Delete: `<button>` styled `px-3 py-1 bg-red-50 text-crimson border border-red-200 text-xs rounded ...` labelled `t('ડિલીટ', 'Delete')`, disabled while a delete is in flight (`busyId === ad.id`), opening ConfirmDeleteModal.
  - Keep the active-toggle switch as-is.
- **Table columns**: add a Frame column (frame label via AD_FRAMES, bilingual via `useAdminLang`). Link column shows the link text or `—` when empty.
- **Form**: add a Frame dropdown (`AD_FRAMES` options, bilingual labels), mark link field optional (placeholder 'વૈકલ્પિક / Optional'), keep slot dropdown (11 options), keep active checkbox, keep image upload/preview.
- `AdForm` type gains `frame: string`. `emptyForm` gains `frame: 'banner'`. `startEdit` pre-fills `frame`. `handleSubmit` sends `frame` and no longer requires `link_url` (title-only client validation).
- `saveAd` payload in `api.ts` unchanged (already spreads the form; the ad payload just carries the extra `frame` field).

### 6. API / validation

- `adSchema` (in `src/lib/validation.ts`): `title` min 1 max 255; `image_url` min 1; `link_url` optional (`.max(2000).default('')`); `slot` enum AD_SLOT_KEYS; `frame` enum AD_FRAME_KEYS default 'banner'; `is_active` default true. No route changes needed (it uses the schema + handlers generically).

### 7. DB migration (user-run, Supabase SQL Editor)

```sql
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS frame text NOT NULL DEFAULT 'banner';
```

Existing ads default to `banner` — no backfill needed.

## Non-Changes

- No new dependencies. `sharp` upload compression stays as-is (1600px WebP cap is fine for all four frames; display boxes crop via `object-cover`).
- `getAdsForSlot` query unchanged (still `slot` + `is_active`; no frame filtering — a slot may mix frames; the admin chooses the frame that fits the slot).
- Share buttons, card share button, NewsCard — untouched.
- Existing 6 slots' rendering unchanged except they now honor the ad's frame box.

## Verification

- `npx tsc --noEmit` clean.
- `npm run lint` 0 errors / 6 pre-existing warnings.
- `npm test` — updated: ads helper tests cover frame default + optional-link; ads API tests cover frame validation (bad frame → 400) and blank-link acceptance. Baseline 35 → expected 38-40 tests.
- Manual (user, dev server + DB migration applied):
  - Create ads in all 4 frames; verify banner spans width, rectangle/skyscraper/small render centered capped boxes on homepage and article page.
  - Create an ad with blank link → renders static, non-clickable.
  - Verify all 11 slots render (homepage aside, between-categories, after-city, article sidebar desktop layout + mobile stack, search top, existing 6).
  - Admin: Edit/Delete pills match articles page; delete disabled while in flight; frame dropdown persists on edit.