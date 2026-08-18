# Design: તાજા સમાચાર Today-Only Filter + Server-Controlled Publish Time

Date: 2026-08-18
Status: Approved (user confirmed IST boundary, hide-empty behavior)

## Goal

1. The **તાજા સમાચાર (Latest News)** section on the homepage shows **only articles published today** (Asia/Kolkata date boundary, matching the top-bar clock). When the date rolls over at midnight IST, the section automatically switches to the new day's articles. The section is hidden entirely when no articles were published today.
2. **Draft time and publish time are distinct.** Saving a draft must not stamp a publish time. Clicking Publish stamps `published_at` with the live server time at the moment of publishing. The main site shows only the real publish time.

## Current Behavior (problems)

- `app/(main)/page.tsx`: `restLatest = latest.filter(...).slice(0, 8)` — latest 8 regardless of date.
- `src/components/admin/ArticleEditor.tsx:122`: client always sends `published_at: form.published_at || new Date().toISOString()` in the payload.
- `app/api/articles/route.ts` `buildArticleRow` (lines 9–40): `publishedAt = body.published_at || (status === 'published' ? now : null)` — because the client always sends a value, the server keeps the **draft-creation timestamp** as the publish time. Editing a published article also never refreshes it.

## Design

### 1. Server-controlled publish time

**Client (`ArticleEditor.tsx`):**
- Remove `published_at` from `prepareArticlePayload` output (and from `FormState` usage — the field becomes informational only; remove the hidden timestamp handling).

**Server (`app/api/articles/route.ts`):**

`buildArticleRow(body, isCreate, existingStatus?)`:
- **POST (create):** `status === 'published'` → `published_at = new Date().toISOString()`; `draft`/`archived` → `null`.
- **PUT (update):** fetch the current row's status before updating:
  - `draft|archived → published`: `published_at = new Date().toISOString()` (fresh live time)
  - `published → published` (editing): **preserve** existing `published_at`
  - `published → draft|archived`: preserve existing `published_at` (history; re-publishing later gets a fresh time)

The main site already renders `published_at` via `formatDateGu` — it now shows the true publish moment automatically.

### 2. તાજા સમાચાર = today's articles (IST)

**`src/lib/server-data.ts`:**
- Add `getISTDayRange(day?: string)` helper (or equivalent): given a `YYYY-MM-DD` (defaults to today in `Asia/Kolkata` via `Intl.DateTimeFormat`), returns `{ from: ISO string, to: ISO string }` covering `00:00:00+05:30` to `next day 00:00:00+05:30`.
- `getArticles` accepts optional `day: string` param → applies `.gte('published_at', from).lt('published_at', to)`.

**`app/(main)/page.tsx`:**
- Fetch today's articles with `getArticles({ day, limit: 100 })` for the તાજા સમાચાર section (all of today's articles, publish-time order, newest first — no 8-item slice).
- Render all returned articles in the existing grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`).
- **Hide the section entirely** when zero articles are returned.
- Hero, trending, HighlightBand sections unchanged.

**Caching:**
- `unstable_cache` serializes the params into the cache key → each IST date gets its own cache entry; `revalidate: 60` gives fresh results within a minute of any publish or midnight rollover.

## Edge Cases

- **Midnight IST rollover:** day range computed per request → section switches to the new day automatically.
- **Editing a published article** does not bump `published_at` (no homepage re-ordering churn).
- **Re-publishing** (archived → published) gets a fresh publish time.
- **>100 articles in one day:** `getArticles` caps `limit` at 100 — accepted practical limit for a news day; documents in code comment.

## Testing

- Unit test: `getISTDayRange` — fixed dates, UTC-midnight edge (e.g., 18:30 UTC = 00:00 IST next day), returns correct ISO boundaries.
- Unit test: publish transition logic — create published sets time; create draft leaves null; draft→published sets fresh time; published→published preserves; published→draft preserves.
- Verify: typecheck, lint, existing 18 tests pass.

## Files Touched

- `src/components/admin/ArticleEditor.tsx`
- `app/api/articles/route.ts`
- `src/lib/server-data.ts`
- `app/(main)/page.tsx`
- Tests in `__tests__/`
