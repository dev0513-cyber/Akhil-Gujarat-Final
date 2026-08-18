# Remove Reading Time / View Count / Viewer + Drop view_count Column — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the reading-time badge, view count, Eye (viewer) icon, and admin Total Views stat from the site, and drop the `view_count` column from Supabase.

**Architecture:** Three independent layers: (1) data layer — stop selecting/writing/validating `view_count` in types, validation, API routes, and server-data (verified by tsc + updated tests + grep); (2) UI layer — remove the badge/count/stat elements and the now-dead `readingTime()` helper; (3) database — drop the column via migration (Supabase MCP attempt first, manual SQL fallback).

**Tech Stack:** Next.js 16.3.1 (App Router), TypeScript, Vitest, Supabase (Postgres), zod, lucide-react.

## Global Constraints

- Remove all of: `view_count` (code + DB columns on `articles` and `epapers`, irreversible), `readingTime()` helper, the "1 મિનિટ વાંચન" span, the "0 વાંચન" span + Eye icon, and the "કુલ વાંચન / Total Views" Dashboard stat. Nothing else changes.
- Meta row on the article page keeps: date (Clock icon) + author. Category/city links (MapPin/Tag) untouched.
- Dashboard keeps 3 stats (Published, Draft, Videos) in a `grid-cols-2 lg:grid-cols-3` grid.
- DB migration SQL (idempotent, single run): `ALTER TABLE public.articles DROP COLUMN IF EXISTS view_count;` and `ALTER TABLE public.epapers DROP COLUMN IF EXISTS view_count;`
- No changes to `src/lib/api.ts`; responses simply stop carrying the field.
- Verification commands: `npx tsc --noEmit` (must be clean), `npm run lint` (0 errors; 5 pre-existing `no-img-element` warnings OK), `npm test` (28 tests, one assertion removed in validation test), grep `view_count` and `readingTime` over `app/`, `src/`, `__tests__/` must return zero matches at the end.
- Branch: `feat/taja-samachar-today-filter`, clean working tree, commits only for files belonging to the task.

---

### Task 1: Remove view_count from the data layer

**Files:**
- Modify: `__tests__/validation.test.ts:19` (remove one assertion)
- Modify: `src/lib/types.ts:30,54` (remove `view_count` from `EPaper` (line 30) and `Article` (line 54) types)
- Modify: `src/lib/validation.ts:23,50` (remove `view_count` from `articleSchema` (line 23) and `ePaperSchema` (line 50))
- Modify: `app/api/articles/route.ts:51,72-78,102` (remove `view_count` writes/select)
- Modify: `src/lib/server-data.ts:9` (remove `view_count` from select)

**Interfaces:**
- Consumes: nothing (pure removal).
- Produces: `Article` and the article input type WITHOUT `view_count`; zod schemas without `view_count`; article GET/list responses without `view_count`. Task 2's tsc pass depends on these being gone.

- [ ] **Step 1: Remove the view_count assertion from the validation test**

In `__tests__/validation.test.ts`, delete the line (currently line 19):
```ts
      expect(result.data.view_count).toBe(0); // default applied
```

- [ ] **Step 2: Run the validation test to confirm it still passes**

Run: `npx vitest run __tests__/validation.test.ts`
Expected: PASS (remaining assertions; the deletion removes the only `view_count` reference in tests).

- [ ] **Step 3: Remove view_count from types**

In `src/lib/types.ts`, delete `  view_count: number;` from BOTH:
- the `EPaper` type (line 30)
- the `Article` type (line 54)

- [ ] **Step 4: Remove view_count from validation schemas**

In `src/lib/validation.ts`, delete `  view_count: z.number().default(0),` from BOTH:
- `articleSchema` (line 23)
- `ePaperSchema` (line 50)

- [ ] **Step 5: Remove view_count from the API route**

In `app/api/articles/route.ts`:

a) Delete line 51 from `buildArticleRow`:
```ts
    row.view_count = 0;
```

b) Replace the view-increment branch in `fetchSingleArticle` (currently lines 72-78):
```ts
  } else if (!req.headers.get('authorization')) {
    await supabase
      .from('articles')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', data.id);
    data.view_count = (data.view_count || 0) + 1;
  }
```
with just the closing brace of the `if`:
```ts
  }
```
(the `if (data.status !== 'published') { ... }` block above stays unchanged)

c) In the `buildListQuery` select string (line 102), delete `view_count, ` so it reads:
```ts
  let query = supabase.from('articles').select('id, headline, description, image_url, extra_images, video_url, category_id, city_id, published_at, created_at, updated_at, status, is_trending, slug, author');
```

- [ ] **Step 6: Remove view_count from server-data**

In `src/lib/server-data.ts` (line 9), delete `view_count, ` from the select so it reads:
```ts
    let query = supabase.from('articles').select('id, headline, description, image_url, video_url, category_id, city_id, published_at, is_trending, slug, author');
```

- [ ] **Step 7: Verify type safety and full suite**

Run: `npx tsc --noEmit`
Expected: clean (proves no remaining code references `view_count`).

Run: `npm test`
Expected: 28/28 passing (7 files).

- [ ] **Step 8: Verify no code references remain**

Run (PowerShell):
```powershell
Get-ChildItem -Path app,src,__tests__ -Recurse -Include *.ts,*.tsx | Select-String -Pattern "view_count"
```
Expected: no matches (zero output).

- [ ] **Step 9: Commit**

```bash
git add __tests__/validation.test.ts src/lib/types.ts src/lib/validation.ts app/api/articles/route.ts src/lib/server-data.ts
git commit -m "refactor: stop tracking view counts in code"
```

### Task 2: Remove reading-time badge, view count UI, and Dashboard stat

**Files:**
- Modify: `app/(main)/news/[slug]/page.tsx:5,7,118-121` (remove spans + imports)
- Modify: `src/lib/format.ts:97-101` (delete `readingTime`)
- Modify: `src/components/admin/Dashboard.tsx:5,24,34,38` (remove stat + import)

**Interfaces:**
- Consumes: `Article` type without `view_count` (Task 1).
- Produces: article page meta row with date + author only; no `readingTime` export in `src/lib/format.ts`.

- [ ] **Step 1: Remove the two spans from the article page meta row**

In `app/(main)/news/[slug]/page.tsx`, delete these two spans (currently lines 118-121):
```tsx
          <span>{readingTime(article.content)}</span>
          <span className="inline-flex items-center gap-1">
            <Eye size={12} /> {article.view_count || 0} વાંચન
          </span>
```
The meta row (line 114) keeps the date span and the `{article.author && <span>{article.author}</span>}` line.

- [ ] **Step 2: Clean up article page imports**

In `app/(main)/news/[slug]/page.tsx`:

a) Line 5: change
```tsx
import { Clock, Eye, MapPin, Tag } from 'lucide-react';
```
to
```tsx
import { Clock, MapPin, Tag } from 'lucide-react';
```

b) Line 7: change
```tsx
import { formatDateTimeGu, readingTime, splitParagraphs } from '../../../../src/lib/format';
```
to
```tsx
import { formatDateTimeGu, splitParagraphs } from '../../../../src/lib/format';
```

- [ ] **Step 3: Delete the readingTime helper**

In `src/lib/format.ts`, delete the entire function (currently lines 97-101):
```ts
export function readingTime(text: string): string {
  const wordsPerMinute = 200;
  const words = (text || '').trim().split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / wordsPerMinute));
  return `${mins} મિનિટ વાંચન`;
}
```

- [ ] **Step 4: Remove the Total Views stat from the Dashboard**

In `src/components/admin/Dashboard.tsx`:

a) Delete line 24:
```ts
  const views = articles.reduce((s, a) => s + (a.view_count || 0), 0);
```

b) Delete line 38:
```tsx
        <Stat icon={TrendingUp} label={t('કુલ વાંચન', 'Total Views')} value={views} lang={lang} />
```

c) Line 34: change
```tsx
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
```
to
```tsx
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-3">
```

d) Line 5: change
```tsx
import { FileText, Newspaper, TrendingUp, Video, Plus } from 'lucide-react';
```
to
```tsx
import { FileText, Newspaper, Video, Plus } from 'lucide-react';
```

- [ ] **Step 5: Verify no references remain**

Run (PowerShell):
```powershell
Get-ChildItem -Path app,src,__tests__ -Recurse -Include *.ts,*.tsx | Select-String -Pattern "readingTime|view_count|વાંચન"
```
Expected: no matches (zero output).

- [ ] **Step 6: Full verification**

Run: `npx tsc --noEmit` — Expected: clean.
Run: `npm run lint` — Expected: 0 errors, 5 pre-existing `no-img-element` warnings.
Run: `npm test` — Expected: 28/28 passing.

- [ ] **Step 7: Commit**

```bash
git add "app/(main)/news/[slug]/page.tsx" src/lib/format.ts src/components/admin/Dashboard.tsx
git commit -m "feat: remove reading time and view count from UI"
```

### Task 3: Drop view_count column in Supabase

**Files:**
- No code files. One migration against the remote Supabase project.

**Interfaces:**
- Consumes: Task 1 (no code reads `view_count` anymore).
- Produces: `articles` and `epapers` tables without `view_count` columns.

- [ ] **Step 1: Apply the migration via Supabase MCP**

Call `supabase_apply_migration` with:
- name: `drop_view_count_columns`
- query:
  ```sql
  ALTER TABLE public.articles DROP COLUMN IF EXISTS view_count;
  ALTER TABLE public.epapers DROP COLUMN IF EXISTS view_count;
  ```

Expected: success, no error. (Both statements are idempotent; `epapers.view_count` exists per the `EPaper` type, and `IF EXISTS` makes it safe either way.)

- [ ] **Step 2: If the MCP connection times out (known issue), fall back to manual SQL**

If Step 1 fails with a connection timeout (the Supabase MCP has been timing out in this session):
- Tell the user to run these exact statements in the Supabase Dashboard → SQL Editor → New query → Run:
  ```sql
  ALTER TABLE public.articles DROP COLUMN IF EXISTS view_count;
  ALTER TABLE public.epapers DROP COLUMN IF EXISTS view_count;
  ```
- Do not claim the columns are dropped until the user confirms they ran them.

- [ ] **Step 3: Verify the columns are gone**

Call `supabase_list_tables` (schemas: `["public"]`, verbose: true) and confirm `articles` and `epapers` have no `view_count` column. If MCP is still down, ask the user to confirm from the Table Editor.

- [ ] **Step 4: Report completion**

Summarize for the user: code removals (Tasks 1-2) are committed on branch `feat/taja-samachar-today-filter`; the column-drop status depends on which path Step 1/2 took.
