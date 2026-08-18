# તાજા સમાચાર Today-Only Filter + Server-Controlled Publish Time — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the homepage તાજા સમાચાર section show only today's articles (Asia/Kolkata date boundary) and make the server own the publish timestamp so draft time and publish time are distinct.

**Architecture:** A small pure IST day-range helper feeds an optional `day` filter into `getArticles`; the homepage renders all of today's articles or hides the section. On the API side, `buildArticleRow` stops trusting the client's `published_at` and stamps it server-side only on the create-published and transition-to-published paths, preserving it on plain edits.

**Tech Stack:** Next.js 16.3.1 App Router, TypeScript, Supabase (PostgREST query builder), Vitest 4, Tailwind v4.

## Global Constraints

- Timezone for "today" is fixed at `Asia/Kolkata` (matches the masthead clock). Do not use visitor-local time.
- `getArticles` caps `limit` at 100 (existing behavior in `src/lib/server-data.ts`).
- The client must never send `published_at`; the server is the sole authority.
- Editing a published article must NOT change `published_at`; `published → draft/archived` must NOT clear it; `draft/archived → published` must stamp fresh server time.
- Existing verification commands: `npx tsc --noEmit`, `npm run lint`, `npm test` (18 tests currently pass; expect 0 lint errors, only the 5 pre-existing `no-img-element` warnings).

---

### Task 1: `getISTDayRange` helper

**Files:**
- Modify: `src/lib/format.ts` (append after `formatTodayMastheadShort`)
- Create: `__tests__/format.test.ts`

**Interfaces:**
- Produces: `export function getISTDayRange(day?: string): { day: string; from: string; to: string }`
  - `day` — `YYYY-MM-DD`, optional; defaults to today in `Asia/Kolkata`.
  - `from` — ISO string of that date's `00:00:00+05:30`.
  - `to` — ISO string of the next date's `00:00:00+05:30`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getISTDayRange } from '../src/lib/format';

describe('getISTDayRange', () => {
  it('returns IST midnight boundaries for a fixed date', () => {
    const range = getISTDayRange('2026-08-18');
    expect(range.day).toBe('2026-08-18');
    // 00:00:00+05:30 on Aug 18 == 18:30:00Z on Aug 17
    expect(range.from).toBe('2026-08-17T18:30:00.000Z');
    // 00:00:00+05:30 on Aug 19 == 18:30:00Z on Aug 18
    expect(range.to).toBe('2026-08-18T18:30:00.000Z');
  });

  it('defaults to today in IST when no day is given', () => {
    const range = getISTDayRange();
    expect(range.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // IST midnight always maps to 18:30:00.000Z of the previous UTC day
    expect(range.from.endsWith('T18:30:00.000Z')).toBe(true);
    expect(range.to.endsWith('T18:30:00.000Z')).toBe(true);
    // exactly 24 hours apart
    const diff = Date.parse(range.to) - Date.parse(range.from);
    expect(diff).toBe(24 * 60 * 60 * 1000);
  });

  it('handles the IST midnight edge where UTC date differs', () => {
    // 2026-08-18 00:00 IST is still 2026-08-17 in UTC
    const range = getISTDayRange('2026-08-18');
    expect(Date.parse(range.from)).toBe(Date.parse('2026-08-17T18:30:00.000Z'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/format.test.ts`
Expected: FAIL — `getISTDayRange is not a function` (or similar import error).

- [ ] **Step 3: Implement the helper**

Append to `src/lib/format.ts`:

```ts
export function getISTDayRange(day?: string): { day: string; from: string; to: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dayStr = day || formatter.format(new Date());
  const start = new Date(`${dayStr}T00:00:00+05:30`);
  return {
    day: dayStr,
    from: start.toISOString(),
    to: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/format.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts __tests__/format.test.ts
git commit -m "feat: add IST day-range helper for today filters"
```

---

### Task 2: `day` filter in `getArticles`

**Files:**
- Modify: `src/lib/server-data.ts` (inside `getArticles`, after the `video` filter at line 19)
- Create: `__tests__/server-data.test.ts`

**Interfaces:**
- Consumes: `getISTDayRange` from Task 1.
- Produces: `getArticles` accepts optional `params.day` (`'YYYY-MM-DD'`) — applies `.gte('published_at', from).lt('published_at', to)` on the query.

- [ ] **Step 1: Write the failing test**

Create `__tests__/server-data.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const builder: Record<string, unknown> = {};
const methods = ['select', 'eq', 'neq', 'not', 'or', 'order', 'range', 'limit', 'gte', 'lt'];
for (const method of methods) {
  builder[method] = vi.fn().mockReturnValue(builder);
}
builder.then = (resolve: (val: unknown) => void) => resolve({ data: [], error: null });

vi.mock('../src/lib/supabase', () => ({ default: { from: mockFrom } }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('../app/api/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/api/utils')>();
  return {
    ...actual,
    hydrateArticles: vi.fn(async (articles: unknown) => (Array.isArray(articles) ? articles : [articles])),
  };
});

import { getArticles } from '../src/lib/server-data';

describe('getArticles day filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(builder);
  });

  it('filters published articles to the given IST day', async () => {
    await getArticles({ day: '2026-08-18' });
    expect(mockFrom).toHaveBeenCalledWith('articles');
    expect(builder.gte).toHaveBeenCalledWith('published_at', '2026-08-17T18:30:00.000Z');
    expect(builder.lt).toHaveBeenCalledWith('published_at', '2026-08-18T18:30:00.000Z');
    expect(builder.eq).toHaveBeenCalledWith('status', 'published');
  });

  it('does not apply the day filter when day is omitted', async () => {
    await getArticles({ limit: 10 });
    expect(builder.gte).not.toHaveBeenCalled();
    expect(builder.lt).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/server-data.test.ts`
Expected: FAIL — `builder.gte` was not called.

- [ ] **Step 3: Implement the filter**

In `src/lib/server-data.ts`, after the `video` line (`if (params.video) query = query.not(...)...` at line 19), add:

```ts
    if (params.day) {
      const { from, to } = getISTDayRange(String(params.day));
      query = query.gte('published_at', from).lt('published_at', to);
    }
```

And extend the import from `../lib/format`-free module — add to the existing imports in `src/lib/server-data.ts`:

```ts
import { getISTDayRange } from './format';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/server-data.test.ts`
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server-data.ts __tests__/server-data.test.ts
git commit -m "feat: support day-scoped article queries"
```

---

### Task 3: તાજા સમાચાર section shows only today's articles

**Files:**
- Modify: `app/(main)/page.tsx`

**Interfaces:**
- Consumes: `getArticles` (with `day`) from Task 2, `getISTDayRange` from Task 1.
- Produces: Homepage renders `todayNews` (all of today's published articles) in the તાજા સમાચાર grid; section hidden when empty; `restLatest` removed.

- [ ] **Step 1: Update the data fetch**

In `app/(main)/page.tsx`, replace lines 8–13:

```tsx
export default async function Home() {
  const [latest, trending, cities, todayNews] = await Promise.all([
    getArticles({ limit: 80 }),
    getArticles({ trending: 1, limit: 8 }),
    getCities(),
    getArticles({ day: getISTDayRange().day, limit: 100 }),
  ]);
```

Update the import (line 3):

```tsx
import { getArticles, getCities } from '../../src/lib/server-data';
import { getISTDayRange } from '../../src/lib/format';
```

- [ ] **Step 2: Replace the section render**

Remove line 22 (`const restLatest = latest.filter(...)`).

Replace the તાજા સમાચાર section (lines 48–55):

```tsx
            {todayNews.length > 0 && (
              <section className="mt-10">
                <SectionHead title="તાજા સમાચાર" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {todayNews.map((a: Article) => (
                    <NewsCard key={a.id} article={a} variant="standard" />
                  ))}
                </div>
              </section>
            )}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: clean (no errors).

Run: `npm run lint`
Expected: 0 errors, only the 5 pre-existing `no-img-element` warnings.

Run: `npm test`
Expected: all existing tests pass (now 23).

- [ ] **Step 4: Commit**

```bash
git add app/(main)/page.tsx
git commit -m "feat: show only today's articles in taja samachar section"
```

---

### Task 4: Server-controlled publish timestamp

**Files:**
- Modify: `app/api/articles/route.ts` (`buildArticleRow`, `POST`, `PUT`)
- Modify: `src/components/admin/ArticleEditor.tsx` (`prepareArticlePayload`)
- Modify: `__tests__/articles-api.test.ts`

**Interfaces:**
- Produces: `buildArticleRow(body, isCreate, existingStatus?: string | null)` — third arg is the current row's status (PUT only). Rules:
  - create + `published` → `row.published_at = now`
  - create + `draft|archived` → `row.published_at = null`
  - update + `existingStatus !== 'published'` + new status `published` → `row.published_at = now`
  - update otherwise → `row` contains **no** `published_at` key (preserve DB value)
- PUT handler fetches `{ status }` of the existing row before building the row.

- [ ] **Step 1: Write the failing tests**

In `__tests__/articles-api.test.ts`:
- Change the import (line 2) to include `PUT`:

```ts
import { GET, POST, PUT } from '../app/api/articles/route';
```

Append inside the top-level `describe('Articles API', ...)`:

```ts
  describe('Server-controlled published_at', () => {
    const validPayload = {
      headline: 'Admin Post',
      description: 'Test',
      content: '<p>test</p>',
      image_url: 'http://test.jpg',
      slug: 'admin-post',
      category_id: 1,
    };

    it('POST published stamps server time', async () => {
      const req = new Request('http://localhost/api/articles', {
        method: 'POST',
        body: JSON.stringify({ ...validPayload, status: 'published' }),
      });
      vi.mocked(utils.requireAdmin).mockResolvedValueOnce(null);
      const inserted = { id: 1, ...validPayload, status: 'published' };
      const builder = createMockBuilder({ data: inserted, error: null });
      mockFrom.mockReturnValue(builder);

      const res = await POST(req);
      expect(res.status).toBe(201);

      const insertArg = builder.insert.mock.calls[0][0] as Record<string, unknown>;
      expect(insertArg.published_at).toBeTruthy();
      expect(new Date(insertArg.published_at as string).toString()).not.toBe('Invalid Date');
    });

    it('POST draft leaves published_at null', async () => {
      const req = new Request('http://localhost/api/articles', {
        method: 'POST',
        body: JSON.stringify({ ...validPayload, status: 'draft' }),
      });
      vi.mocked(utils.requireAdmin).mockResolvedValueOnce(null);
      const inserted = { id: 1, ...validPayload, status: 'draft' };
      const builder = createMockBuilder({ data: inserted, error: null });
      mockFrom.mockReturnValue(builder);

      await POST(req);

      const insertArg = builder.insert.mock.calls[0][0] as Record<string, unknown>;
      expect(insertArg.published_at).toBeNull();
    });

    it('PUT draft→published stamps fresh server time', async () => {
      const req = new Request('http://localhost/api/articles', {
        method: 'PUT',
        body: JSON.stringify({ ...validPayload, id: 7, status: 'published' }),
      });
      vi.mocked(utils.requireAdmin).mockResolvedValueOnce(null);
      const builder = createMockBuilder({
        data: { id: 7, ...validPayload, status: 'published', published_at: '2026-08-18T10:00:00.000Z' },
        error: null,
      });
      // pre-fetch returns existing draft row
      builder.maybeSingle = vi.fn().mockResolvedValue({ data: { status: 'draft' }, error: null });
      mockFrom.mockReturnValue(builder);

      const res = await PUT(req);
      expect(res.status).toBe(200);

      const updateArg = builder.update.mock.calls[0][0] as Record<string, unknown>;
      expect(updateArg.published_at).toBeTruthy();
      expect(updateArg.published_at).not.toBe('2026-08-18T10:00:00.000Z');
    });

    it('PUT published→published preserves original publish time', async () => {
      const req = new Request('http://localhost/api/articles', {
        method: 'PUT',
        body: JSON.stringify({ ...validPayload, id: 7, status: 'published' }),
      });
      vi.mocked(utils.requireAdmin).mockResolvedValueOnce(null);
      const builder = createMockBuilder({
        data: { id: 7, ...validPayload, status: 'published' },
        error: null,
      });
      builder.maybeSingle = vi.fn().mockResolvedValue({ data: { status: 'published' }, error: null });
      mockFrom.mockReturnValue(builder);

      await PUT(req);

      const updateArg = builder.update.mock.calls[0][0] as Record<string, unknown>;
      expect(updateArg).not.toHaveProperty('published_at');
    });

    it('PUT published→draft preserves original publish time', async () => {
      const req = new Request('http://localhost/api/articles', {
        method: 'PUT',
        body: JSON.stringify({ ...validPayload, id: 7, status: 'draft' }),
      });
      vi.mocked(utils.requireAdmin).mockResolvedValueOnce(null);
      const builder = createMockBuilder({
        data: { id: 7, ...validPayload, status: 'draft' },
        error: null,
      });
      builder.maybeSingle = vi.fn().mockResolvedValue({ data: { status: 'published' }, error: null });
      mockFrom.mockReturnValue(builder);

      await PUT(req);

      const updateArg = builder.update.mock.calls[0][0] as Record<string, unknown>;
      expect(updateArg).not.toHaveProperty('published_at');
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/articles-api.test.ts`
Expected: the 5 new tests FAIL (current code always sets `published_at` from the client / pre-fetch is missing).

- [ ] **Step 3: Implement server changes**

In `app/api/articles/route.ts`, replace `buildArticleRow` (lines 9–40):

```ts
function buildArticleRow(body: Record<string, unknown>, isCreate: boolean, existingStatus?: string | null) {
  const status = body.status || 'draft';
  const now = new Date().toISOString();

  // The server is the sole authority on publish time.
  // - create: published → now, otherwise null
  // - update: only a transition INTO published stamps a fresh time;
  //   plain edits and moves out of published preserve the DB value (omit the key)
  let preservePublishTime = false;
  let publishedAt: string | null = null;
  if (isCreate) {
    publishedAt = status === 'published' ? now : null;
  } else if (status === 'published' && existingStatus !== 'published') {
    publishedAt = now;
  } else {
    preservePublishTime = true;
  }

  const row: Record<string, unknown> = {
    headline: body.headline,
    description: body.description,
    content: body.content,
    image_url: body.image_url || '',
    extra_images: body.extra_images || [],
    category_id: Number(body.category_id),
    city_id: body.city_id ? Number(body.city_id) : null,
    tags: body.tags || '',
    source: body.source || '',
    seo_title: body.seo_title || body.headline,
    seo_description: body.seo_description || body.description,
    slug: String(body.slug).toLowerCase().trim().replace(/\s+/g, '-'),
    video_url: body.video_url || '',
    status,
    is_trending: Boolean(body.is_trending),
    author: body.author || 'અખિલ ગુજરાત ડેસ્ક',
  };

  if (!preservePublishTime) {
    row.published_at = publishedAt;
  }

  if (isCreate) {
    row.view_count = 0;
    row.created_at = now;
    row.updated_at = now;
  }

  return row;
}
```

Update `POST` (line 164):

```ts
    const row = buildArticleRow(validation.data, true, null);
```

Update `PUT` (line 192) — fetch the existing status before building:

```ts
    const { data: existing } = await supabase
      .from('articles')
      .select('status')
      .eq('id', body.id)
      .maybeSingle();

    const row = buildArticleRow(validation.data, false, existing?.status ?? null);
    row.updated_at = new Date().toISOString();
```

- [ ] **Step 4: Update the client to stop sending published_at**

In `src/components/admin/ArticleEditor.tsx`, inside `prepareArticlePayload` (lines 110–125):

Replace:

```ts
    city_id: form.city_id ? Number(form.city_id) : null,
    published_at: form.published_at || new Date().toISOString(),
  };
  if (!isNew && id) payload.id = Number(id);
```

with:

```ts
    city_id: form.city_id ? Number(form.city_id) : null,
  };
  delete payload.published_at; // server controls publish time
  if (!isNew && id) payload.id = Number(id);
```

- [ ] **Step 5: Run all verification**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm run lint`
Expected: 0 errors, only the 5 pre-existing `no-img-element` warnings.

Run: `npm test`
Expected: all pass — 18 existing + 3 (format) + 2 (server-data) + 5 (articles) = 28 total.

- [ ] **Step 6: Commit**

```bash
git add app/api/articles/route.ts src/components/admin/ArticleEditor.tsx __tests__/articles-api.test.ts
git commit -m "feat: server owns publish timestamps (draft vs publish time)"
```
