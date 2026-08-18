# Remove Reading Time, View Count, and Viewer Icon + Drop view_count Column

**Date:** 2026-08-18
**Status:** Approved by user
**Branch:** feat/taja-samachar-today-filter (working tree includes prior feature)

## Goal

Completely remove the following from the site and database:

1. "1 મિનિટ વાંચન" — the reading-time badge on the public article page
2. "0 વાંચન" — the view count on the public article page
3. "viewer" — the Eye (viewer) icon next to the view count (no separate viewer feature exists; the Eye icon is the only "viewer" element on the site)
4. The "કુલ વાંચન / Total Views" stat from the admin Dashboard
5. The `view_count` column from the Supabase `articles` table (irreversible data loss — explicitly requested by user)

## Changes

### 1. Public article page — `app/(main)/news/[slug]/page.tsx`

- Remove the reading-time span: `<span>{readingTime(article.content)}</span>` (line 118)
- Remove the view count span: `<Eye size={12} /> {article.view_count || 0} વાંચન` (lines 119-121)
- Meta row keeps: date (Clock icon) + author
- Remove `Eye` from the lucide-react import; remove `readingTime` from the format import. `Clock`, `MapPin`, `Tag` remain (still used).

### 2. Dead code — `src/lib/format.ts`

- Delete the `readingTime(text: string): string` function (lines ~97-101). Nothing else references it after change 1.

### 3. Admin Dashboard — `src/components/admin/Dashboard.tsx`

- Remove the `views` computation (line 24): `const views = articles.reduce((s, a) => s + (a.view_count || 0), 0);`
- Remove the Total Views stat (line 38): `<Stat icon={TrendingUp} label={t('કુલ વાંચન', 'Total Views')} value={views} lang={lang} />`
- Change stat grid to `grid-cols-2 lg:grid-cols-3` (3 stats remain: Published, Draft, Videos)
- Remove `TrendingUp` from the lucide-react import

### 4. Types and validation

- `src/lib/types.ts` — remove `view_count: number;` from the `Article` type (line 30) and from the article input type (line 54)
- `src/lib/validation.ts` — remove `view_count: z.number().default(0),` from both article schemas (lines 23 and 50)

### 5. API — `app/api/articles/route.ts`

- Remove `row.view_count = 0;` from the create branch of `buildArticleRow` (line 51)
- Remove the entire view-increment block in `fetchSingleArticle` (lines 72-78) — the `update({ view_count: (data.view_count || 0) + 1 })` write and the `data.view_count` reassignment
- Remove `view_count` from the list select string (line 102)

### 6. Server data — `src/lib/server-data.ts`

- Remove `view_count` from the select string (line 9)

### 7. Tests — `__tests__/validation.test.ts`

- Remove the `view_count` default-0 assertion (line 19)
- Verify no other test references `view_count` (only validation.test.ts does, per grep)

### 8. Database — Supabase migration

```sql
ALTER TABLE public.articles DROP COLUMN IF EXISTS view_count;
```

- Attempt via Supabase MCP first; if the MCP connection continues to time out, the user runs the single line in the Supabase SQL Editor (Dashboard → SQL Editor → New query → Run).
- This permanently deletes all stored view counts. User explicitly requested deletion.

## Non-Changes

- No other columns or features affected. `published_at`, `created_at`, `updated_at`, `status`, etc. untouched.
- No schema change to other tables.
- Client `src/lib/api.ts` needs no change — responses simply no longer carry the field.

## Verification

- `npx tsc --noEmit` clean
- `npm run lint` 0 errors (5 pre-existing `no-img-element` warnings)
- `npm test` all pass (28 tests, with the validation test updated)
- Grep confirms zero remaining references to `view_count` and `readingTime` in `app/`, `src/`, `__tests__/`
- DB: `view_count` column dropped
