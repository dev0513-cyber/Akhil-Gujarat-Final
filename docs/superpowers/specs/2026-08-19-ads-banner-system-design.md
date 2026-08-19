# Custom Ads Banner System

**Date:** 2026-08-19
**Status:** Approved by user
**Branch:** feat/taja-samachar-today-filter (continues current branch)

## Goal

Let admins upload ad banner images from the admin panel and place them anywhere they want on the homepage, article pages, and category/city pages via named slots. Ads are image + clickable link, rotate within their slot, and are manually toggled on/off (no dates).

## User Decisions (from brainstorming)

- **Ad anatomy:** image + clickable link URL, opens in a new tab.
- **Placement model:** named slots — admin picks a slot per ad. No visual drag-and-drop editor.
- **Slots:** all six — `homepage_after_hero`, `homepage_between`, `article_top`, `article_middle`, `article_bottom`, `category_top`.
- **Rotation:** a slot can hold multiple active ads; one is picked at random per page load.
- **Scheduling:** no start/end dates; manual active toggle only.
- **Approach:** A — `ads` table in Supabase + server-rendered slot components + admin CRUD page.

## Changes

### 1. Database — new `ads` table (one migration)

| column | type | notes |
|---|---|---|
| id | uuid pk | default gen_random_uuid() |
| title | text | admin label, not shown publicly |
| image_url | text | uploaded image (public Storage) |
| link_url | text | click target |
| slot | text | one of the 6 slot keys |
| is_active | boolean | default true, manual on/off |
| created_at | timestamptz | default now() |

RLS: `select` for all (public content); `insert/update/delete` for authenticated users only — same pattern as existing tables (verify against existing migrations during implementation).

### 2. New file `src/components/AdBanner.tsx` (server component)

- Props: `Readonly<{ slot: string }>`.
- Fetches active ads for the slot server-side via a new `getAdsForSlot(slot)` helper in `src/lib/server-data.ts`; picks one at random (`order by random() limit 1`).
- Renders `null` when no active ads in the slot (zero layout impact).
- Render: `<a href={link_url} target="_blank" rel="noopener noreferrer">` wrapping a full-width `next/image` (natural aspect ratio, responsive), with a small "જાહેરાત / Advertisement" label above and a subtle border. Image `alt` from the ad title.
- Server-rendered: no layout shift, SEO-friendly.

### 3. Slot wiring

| Slot | Where it renders |
|---|---|
| `homepage_after_hero` | `app/(main)/page.tsx` — after the hero/trending grid section, before the તાજા સમાચાર section |
| `homepage_between` | `app/(main)/page.tsx` — after the તાજા સમાચાર section, before the highlight bands |
| `article_top` | `app/(main)/news/[slug]/page.tsx` — after the meta/share row, above the featured image |
| `article_middle` | `app/(main)/news/[slug]/page.tsx` — after the first paragraph inside the content block |
| `article_bottom` | `app/(main)/news/[slug]/page.tsx` — after the bottom share row, before the related-news section |
| `category_top` | `app/(main)/category/[slug]/page.tsx` and `app/(main)/city/[slug]/page.tsx` — below the page header |

### 4. Admin page — `/admin/ads`

- New route `app/(admin)/admin/(protected)/ads/page.tsx` + component `src/components/admin/Ads.tsx`, following the EPapers/Articles patterns (bilingual `t()` labels, alert messages, same styling).
- Sidebar link added to the admin nav layout.
- **List view:** thumbnail, title, slot label (Gujarati), click URL, active toggle, edit/delete.
- **Add/Edit form:** title, image upload (reuse `uploadFile` → `/api/upload` → public Storage bucket), link URL, slot dropdown (6 labels), active checkbox.
- Data layer: `fetchAds`, `saveAd`, `deleteAd` in `src/lib/api.ts` (client-side supabase calls, same pattern as existing CRUD).

### 5. Types

- Add `Ad` type (id, title, image_url, link_url, slot, is_active, created_at) to `src/lib/types.ts`.

## Edge Cases

- Empty slot → AdBanner renders nothing; layout unaffected.
- Broken image/bad link → no special handling; image renders with alt text (admin-managed content).
- Rotation → random pick per page load; no caching complexity.
- Images use the same public Storage bucket as article photos; `next/image` handles responsive sizing (mobile included).

## Non-Changes

- No click tracking, no impressions, no ad scheduling.
- No changes to existing pages beyond slot insertion points.
- No new dependencies, no new env vars.

## Verification

- `npx tsc --noEmit` clean
- `npm run lint` 0 errors (6 pre-existing warnings)
- `npm test` — existing 28/28 stay green + unit tests for `getAdsForSlot` (active filtering, slot filtering, random pick with mocked supabase client)
- Manual: admin creates an ad in each slot; banners render at the right positions on homepage/article/category/city; rotating slots show different ads on reload; inactive ads disappear; deleting an ad removes it from the site.
