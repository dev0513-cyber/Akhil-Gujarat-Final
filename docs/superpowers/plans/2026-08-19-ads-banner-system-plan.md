# Ads Banner System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins upload ad banner images and place them in named slots on the homepage, article pages, and category/city pages.

**Architecture:** New `ads` table in Supabase (RLS: public read, admin write). Public pages read ads server-side through a `getAdsForSlot(slot)` helper and render them via a server `AdBanner` component (one random active ad per slot). Admin CRUD goes through a new `/api/ads` route following the existing categories route pattern, with a new `/admin/ads` page following the EPapers admin pattern.

**Tech Stack:** Next.js 16.3.1 (App Router, Turbopack), Supabase Postgres + Storage, Zod validation, SWR (admin), lucide-react, vitest.

## Global Constraints

- Follow existing repo patterns exactly: server components fetch via `src/lib/supabase.ts`; admin client components fetch via `src/lib/api.ts` → `/api/*` routes with `authHeaders()`; API routes use `requireAdmin`, `handleApiError`, `handleAdminDelete` from `app/api/utils.ts`.
- No new dependencies, no new env vars.
- Supabase MCP tools and `supabase` CLI are NOT available (timeouts) — DB migration SQL must be handed to the user to run manually in the Supabase SQL Editor.
- Verification baseline: `npx tsc --noEmit` clean; `npm run lint` 0 errors / 6 pre-existing warnings; `npm test` 28/28 existing tests.
- Commit style: `feat: ...` or `fix: ...`, one commit per task.
- All UI copy is bilingual via `t('ગુજરાતી', 'English')` (admin) or Gujarati-first (public).
- A server component may render a client component as a child, but never the reverse; share buttons must stay siblings of `<Link>` (never nested).

---

### Task 1: Database migration + types + slot constants

**Files:**
- Create: `src/lib/ads.ts`
- Modify: `src/lib/types.ts` (append `Ad` type)
- No test file (no logic — constants only; covered by Task 2 tests)

**Interfaces:**
- Produces: `AD_SLOTS` (array of `{ key, labelGu, labelEn }`), `AD_SLOT_KEYS` (string array), `Ad` type — used by Tasks 2-5.

- [ ] **Step 1: Run the migration SQL manually (user action)**

The Supabase MCP/CLI are unavailable. Open the Supabase SQL Editor and run:

```sql
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  link_url text not null,
  slot text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.ads enable row level security;

create policy "ads_public_read" on public.ads for select using (true);
create policy "ads_admin_insert" on public.ads for insert with check (auth.role() = 'authenticated');
create policy "ads_admin_update" on public.ads for update using (auth.role() = 'authenticated');
create policy "ads_admin_delete" on public.ads for delete using (auth.role() = 'authenticated');
```

Confirm the RLS policy names match the style of the existing tables (check one existing policy via `select policyname from pg_policies where tablename = 'articles';` and rename if the convention differs). Tell the user the table is live before proceeding.

- [ ] **Step 2: Create `src/lib/ads.ts`**

```ts
export const AD_SLOTS = [
  { key: 'homepage_after_hero', labelGu: 'હોમપેજ — હીરો પછી', labelEn: 'Homepage — after hero' },
  { key: 'homepage_between', labelGu: 'હોમપેજ — સેક્શન વચ્ચે', labelEn: 'Homepage — between sections' },
  { key: 'article_top', labelGu: 'આર્ટિકલ — ઉપર', labelEn: 'Article — top' },
  { key: 'article_middle', labelGu: 'આર્ટિકલ — વચ્ચે', labelEn: 'Article — middle' },
  { key: 'article_bottom', labelGu: 'આર્ટિકલ — નીચે', labelEn: 'Article — bottom' },
  { key: 'category_top', labelGu: 'વિભાગ — ઉપર', labelEn: 'Category — top' },
] as const;

export type AdSlotKey = (typeof AD_SLOTS)[number]['key'];

export const AD_SLOT_KEYS: readonly [string, ...string[]] = AD_SLOTS.map((s) => s.key);
```

- [ ] **Step 3: Append `Ad` type to `src/lib/types.ts`**

```ts
export type Ad = {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  slot: string;
  is_active: boolean;
  created_at: string;
};
```

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit`
Expected: clean.

```bash
git add src/lib/ads.ts src/lib/types.ts
git commit -m "feat: ads slot constants and Ad type"
```

---

### Task 2: `getAdsForSlot` helper + tests

**Files:**
- Modify: `src/lib/server-data.ts` (append helper)
- Test: `__tests__/ads.test.ts` (new)

**Interfaces:**
- Consumes: `Ad` type from `src/lib/types.ts`
- Produces: `getAdsForSlot(slot: string): Promise<Ad | null>` — used by Task 4's AdBanner. Random pick among active ads for the slot; `null` when none.

- [ ] **Step 1: Write the failing test**

Create `__tests__/ads.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
const builder: Record<string, unknown> = {};
const methods = ['select', 'eq', 'limit', 'order'];
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

import { getAdsForSlot } from '../src/lib/server-data';

const ads = [
  { id: 'a', title: 'Ad 1', image_url: 'http://x/1.jpg', link_url: 'http://l', slot: 'article_top', is_active: true, created_at: '2026-08-19T00:00:00Z' },
  { id: 'b', title: 'Ad 2', image_url: 'http://x/2.jpg', link_url: 'http://l', slot: 'article_top', is_active: true, created_at: '2026-08-19T00:00:00Z' },
];

describe('getAdsForSlot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(builder);
  });

  it('filters by slot and is_active and returns one random ad', async () => {
    builder.then = (resolve: (val: unknown) => void) => resolve({ data: ads, error: null });
    const ad = await getAdsForSlot('article_top');
    expect(mockFrom).toHaveBeenCalledWith('ads');
    expect(builder.eq).toHaveBeenCalledWith('slot', 'article_top');
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(ads).toContain(ad);
  });

  it('returns null when the slot has no active ads', async () => {
    builder.then = (resolve: (val: unknown) => void) => resolve({ data: [], error: null });
    const ad = await getAdsForSlot('article_top');
    expect(ad).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/ads.test.ts`
Expected: FAIL — `getAdsForSlot is not a function`.

- [ ] **Step 3: Implement `getAdsForSlot`**

Append to `src/lib/server-data.ts` (after `getPages`):

```ts
import type { Ad } from './types';

export const getAdsForSlot = async (slot: string): Promise<Ad | null> => {
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('slot', slot)
    .eq('is_active', true)
    .limit(20);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return data[Math.floor(Math.random() * data.length)] as Ad;
};
```

Move the new `import type { Ad }` line to the top with the other imports (line 5 area). Deliberately NOT wrapped in `unstable_cache` — ads must rotate per page load and appear instantly when the admin toggles them (article page does direct fetches the same way).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/ads.test.ts`
Expected: PASS (2 tests). Then `npm test` — expected: 30/30.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server-data.ts __tests__/ads.test.ts
git commit -m "feat: getAdsForSlot helper with slot and active filtering"
```

---

### Task 3: `/api/ads` route + validation + tests

**Files:**
- Modify: `src/lib/validation.ts` (append `adSchema`)
- Create: `app/api/ads/route.ts`
- Test: `__tests__/ads-api.test.ts` (new)

**Interfaces:**
- Consumes: `AD_SLOT_KEYS` from `src/lib/ads.ts`; `Ad` type.
- Produces: `adSchema` (zod), and the route `GET / POST / PUT / DELETE /api/ads` — consumed by Task 5's `fetchAds`/`saveAd`/`deleteAd`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/ads-api.test.ts` (mirrors `articles-api.test.ts` structure):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT } from '../app/api/ads/route';
import * as utils from '../app/api/utils';

vi.mock('../app/api/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/api/utils')>();
  return { ...actual, requireAdmin: vi.fn() };
});

const createMockBuilder = (resolvedValue: unknown) => {
  const builder: Record<string, ReturnType<typeof vi.fn>> & { then?: (resolve: (val: unknown) => void) => void } = {};
  const methods = ['select', 'eq', 'order', 'limit', 'single', 'insert', 'update', 'delete'];
  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  builder.then = (resolve: (val: unknown) => void) => resolve(resolvedValue);
  return builder;
};

const mockFrom = vi.fn();
vi.mock('../src/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: mockFrom, auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) } })),
}));

const validAd = { title: 'Banner', image_url: 'http://x/1.jpg', link_url: 'https://client.example.com', slot: 'article_top', is_active: true };

describe('Ads API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('GET returns ad list', async () => {
    mockFrom.mockReturnValue(createMockBuilder({ data: [{ id: '1', ...validAd }], error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].title).toBe('Banner');
  });

  it('POST rejects unauthorized', async () => {
    vi.mocked(utils.requireAdmin).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as never);
    const res = await POST(new Request('http://localhost/api/ads', { method: 'POST', body: JSON.stringify(validAd) }));
    expect(res.status).toBe(401);
  });

  it('POST rejects invalid slot', async () => {
    vi.mocked(utils.requireAdmin).mockResolvedValueOnce(null);
    const res = await POST(new Request('http://localhost/api/ads', { method: 'POST', body: JSON.stringify({ ...validAd, slot: 'bogus' }) }));
    expect(res.status).toBe(400);
  });

  it('POST accepts valid ad as admin', async () => {
    vi.mocked(utils.requireAdmin).mockResolvedValueOnce(null);
    const builder = createMockBuilder({ data: { id: 'abc', ...validAd }, error: null });
    builder.single = vi.fn().mockResolvedValue({ data: { id: 'abc', ...validAd }, error: null });
    mockFrom.mockReturnValue(builder);
    const res = await POST(new Request('http://localhost/api/ads', { method: 'POST', body: JSON.stringify(validAd) }));
    expect(res.status).toBe(201);
  });

  it('PUT updates and returns ad', async () => {
    vi.mocked(utils.requireAdmin).mockResolvedValueOnce(null);
    const builder = createMockBuilder({ data: { id: 'abc', ...validAd, is_active: false }, error: null });
    builder.single = vi.fn().mockResolvedValue({ data: { id: 'abc', ...validAd, is_active: false }, error: null });
    mockFrom.mockReturnValue(builder);
    const res = await PUT(new Request('http://localhost/api/ads', { method: 'PUT', body: JSON.stringify({ id: 'abc', ...validAd, is_active: false }) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.is_active).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/ads-api.test.ts`
Expected: FAIL — cannot find module `../app/api/ads/route`.

- [ ] **Step 3: Add `adSchema` to `src/lib/validation.ts`**

Append at the end (add `import { AD_SLOT_KEYS } from './ads';` at the top):

```ts
export const adSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(255),
  image_url: z.string().min(1),
  link_url: z.string().min(1),
  slot: z.enum(AD_SLOT_KEYS),
  is_active: z.boolean().default(true),
});
```

- [ ] **Step 4: Create `app/api/ads/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient } from '../../../src/utils/supabase/server';
import { requireAdmin, handleApiError, handleAdminDelete } from '../utils';
import { adSchema } from '../../../src/lib/validation';

export async function GET() {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const body = await req.json();
    const validation = adSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
    }

    const { data, error } = await supabase.from('ads').insert({
      title: validation.data.title,
      image_url: validation.data.image_url,
      link_url: validation.data.link_url,
      slot: validation.data.slot,
      is_active: validation.data.is_active,
    }).select().single();

    if (error) throw error;
    (revalidateTag as (t: string) => void)('ads');
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const validation = adSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
    }

    const patch = {
      title: validation.data.title,
      image_url: validation.data.image_url,
      link_url: validation.data.link_url,
      slot: validation.data.slot,
      is_active: validation.data.is_active,
    };

    const { data, error } = await supabase.from('ads').update(patch).eq('id', body.id).select().single();
    if (error) throw error;
    (revalidateTag as (t: string) => void)('ads');
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request) {
  return handleAdminDelete(req, 'ads', 'ads');
}
```

Note: `revalidateTag('ads')` is harmless here — `getAdsForSlot` does not use caching, but the tag keeps future caching safe and matches repo convention.

- [ ] **Step 5: Run tests**

Run: `npx vitest run __tests__/ads-api.test.ts`
Expected: PASS (5 tests). Then `npm test` — expected: 35/35.

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit; npm run lint`
Expected: tsc clean; lint 0 errors / 6 warnings.

```bash
git add src/lib/validation.ts app/api/ads/route.ts __tests__/ads-api.test.ts
git commit -m "feat: ads admin API route with validation"
```

---

### Task 4: AdBanner component + slot wiring on public pages

**Files:**
- Create: `src/components/AdBanner.tsx`
- Modify: `app/(main)/page.tsx` (2 insertions)
- Modify: `app/(main)/news/[slug]/page.tsx` (3 insertions)
- Modify: `src/components/FilteredArticleView.tsx` (1 insertion — covers category AND city pages)

**Interfaces:**
- Consumes: `getAdsForSlot` from `src/lib/server-data.ts`
- Produces: `AdBanner({ slot: string; className?: string })` server component — renders `null` when the slot is empty.

- [ ] **Step 1: Create `src/components/AdBanner.tsx`**

```tsx
import Image from 'next/image';
import { getAdsForSlot } from '../lib/server-data';

export default async function AdBanner({ slot, className = 'my-8' }: Readonly<{ slot: string; className?: string }>) {
  const ad = await getAdsForSlot(slot);
  if (!ad) return null;

  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40 mb-1.5 font-medium">
        જાહેરાત / Advertisement
      </p>
      <a
        href={ad.link_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block border border-rule/60 bg-white overflow-hidden"
      >
        <Image
          src={ad.image_url}
          alt={ad.title}
          width={1600}
          height={400}
          className="w-full h-auto object-cover"
        />
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Wire `homepage_after_hero` and `homepage_between` in `app/(main)/page.tsx`**

Add at top (after line 7 `NewsCard` import):

```tsx
import AdBanner from '../../src/components/AdBanner';
```

Insert after the hero grid section's closing `</section>` (currently line 47), before the `{todayNews.length > 0 && (` block:

```tsx
            </section>

            <AdBanner slot="homepage_after_hero" className="mt-10" />

            {todayNews.length > 0 && (
```

Insert after the તાજા સમાચાર section's closing `</section>` (currently line 58), before the first `<HighlightBand`:

```tsx
            </section>

            <AdBanner slot="homepage_between" className="mt-10" />

            <HighlightBand title="ગુજરાત હાઇલાઇટ્સ"
```

- [ ] **Step 3: Wire the three article slots in `app/(main)/news/[slug]/page.tsx`**

Add at top (line 9 area):

```tsx
import AdBanner from '../../../../src/components/AdBanner';
```

**article_top** — insert between the meta row `</div>` (line 119) and the `{article.image_url && (` figure block (line 123):

```tsx
        <AdBanner slot="article_top" className="mt-6" />
```

**article_middle** — replace the paragraphs block (lines 134-138) with:

```tsx
        <div className="mt-6 space-y-4 font-gujarati text-[17px] leading-[1.85] text-ink/90">
          {paragraphs.map((p: string, i: number) => (
            <div key={p.slice(0, 30).replace(/\s+/g, '-') + '-' + i}>
              <p>{p}</p>
              {i === 0 && <AdBanner slot="article_middle" />}
            </div>
          ))}
        </div>
```

**article_bottom** — insert after the bottom share row's closing `</div>` (line 177), still inside `<article>`:

```tsx
        <div className="mt-6 border-t border-rule pt-4">
          <ShareButtons title={article.headline} />
        </div>

        <AdBanner slot="article_bottom" className="mt-8" />
```

- [ ] **Step 4: Wire `category_top` in `src/components/FilteredArticleView.tsx`**

Add import:

```tsx
import AdBanner from './AdBanner';
```

Insert between the divider and the items grid (between line 18 and line 20):

```tsx
      <div className="mt-6 h-px bg-ink/10" />

      <AdBanner slot="category_top" className="mt-8" />

      {items.length === 0 ? (
```

This single insertion covers both category and city pages (both render through `FilteredArticleView`). The search page does NOT use `FilteredArticleView` — no ads there, as designed.

- [ ] **Step 5: Verify and commit**

Run: `npx tsc --noEmit; npm run lint`
Expected: tsc clean; lint 0 errors / 6 warnings.

Manual check with the dev server running (the user's is on port 3000):

- With the `ads` table empty: fetch the homepage (`Invoke-WebRequest http://localhost:3000` in PowerShell) and confirm the HTML contains no `જાહેરાત` label — all three slots render nothing.
- Insert a test ad via SQL editor (`insert into public.ads (title, image_url, link_url, slot, is_active) values ('Test','https://picsum.photos/1200/300','https://example.com','homepage_after_hero',true);`) and verify the banner appears under the hero section; then delete the row.
- Repeat for one article page slot (`article_top`) and the category page (`category_top`).

```bash
git add src/components/AdBanner.tsx "app/(main)/page.tsx" "app/(main)/news/[slug]/page.tsx" src/components/FilteredArticleView.tsx
git commit -m "feat: ad banner slots on homepage, article and category pages"
```

---

### Task 5: Admin page — `/admin/ads`

**Files:**
- Modify: `src/lib/api.ts` (append `fetchAds`, `saveAd`, `deleteAd`)
- Create: `app/(admin)/admin/(protected)/ads/page.tsx`
- Create: `src/components/admin/Ads.tsx`
- Modify: `src/components/AdminLayout.tsx` (nav link + `Megaphone` icon import)

**Interfaces:**
- Consumes: `/api/ads` route from Task 3; `AD_SLOTS` from `src/lib/ads.ts`; `Ad` type.
- Produces: admin UI for full CRUD + active toggle + image upload via `uploadFile`.

- [ ] **Step 1: Add client API functions to `src/lib/api.ts`**

Update the types import (line 2):

```ts
import type { Article, Category, City, StaticPage, SiteSetting, EPaper, Ad } from './types';
```

Append at the end of the file:

```ts
export async function fetchAds(): Promise<Ad[]> {
  const res = await fetch('/api/ads');
  return readJson<Ad[]>(res);
}

export async function saveAd(payload: Partial<Ad>): Promise<Ad> {
  const headers = await authHeaders();
  const res = await fetch('/api/ads', {
    method: payload.id ? 'PUT' : 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return readJson<Ad>(res);
}

export async function deleteAd(id: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch('/api/ads', {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ id }),
  });
  await readJson(res);
}
```

- [ ] **Step 2: Create the page wrapper `app/(admin)/admin/(protected)/ads/page.tsx`**

```tsx
import AdminAds from '@/components/admin/Ads';

export const metadata = {
  title: 'જાહેરાત મેનેજમેન્ટ | અખિલ ગુજરાત CMS',
};

export default function Page() {
  return <AdminAds />;
}
```

- [ ] **Step 3: Create `src/components/admin/Ads.tsx`**

```tsx
"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, Link2 } from 'lucide-react';
import { fetchAds, saveAd, deleteAd, uploadFile } from '../../lib/api';
import type { Ad } from '../../lib/types';
import { AD_SLOTS } from '../../lib/ads';
import { useAdminLang } from '../../contexts/AdminLangContext';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { SuccessModal } from '../SuccessModal';
import { AlertModal } from '../AlertModal';

const emptyForm = { title: '', image_url: '', link_url: '', slot: AD_SLOTS[0].key, is_active: true };

type AdForm = { title: string; image_url: string; link_url: string; slot: string; is_active: boolean };

export default function AdminAds() {
  const { t, lang } = useAdminLang();
  const { data: ads = [], mutate } = useSWR(['ads'], fetchAds);
  const [form, setForm] = useState<AdForm>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Ad | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const gu = lang === 'gu';

  const slotLabel = (key: string) => {
    const s = AD_SLOTS.find((x) => x.key === key);
    return s ? (gu ? s.labelGu : s.labelEn) : key;
  };

  const startCreate = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setImageFile(null);
    setImagePreview(null);
    setShowForm(true);
  };

  const startEdit = (ad: Ad) => {
    setForm({ title: ad.title, image_url: ad.image_url, link_url: ad.link_url, slot: ad.slot, is_active: ad.is_active });
    setEditingId(ad.id);
    setImageFile(null);
    setImagePreview(ad.image_url);
    setShowForm(true);
  };

  const handleImageSelection = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.link_url) {
      setAlertMessage(t('શીર્ષક અને લિંક URL જરૂરી છે', 'Title and link URL are required'));
      return;
    }
    setUploading(true);
    try {
      let imageUrl = form.image_url;
      if (imageFile) imageUrl = await uploadFile(imageFile);
      await saveAd({ id: editingId || undefined, title: form.title, image_url: imageUrl, link_url: form.link_url, slot: form.slot, is_active: form.is_active });
      await mutate();
      setShowForm(false);
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setAlertMessage(t('સાચવવામાં નિષ્ફળ', 'Failed to save'));
    } finally {
      setUploading(false);
    }
  };

  const handleToggle = async (ad: Ad) => {
    try {
      await saveAd({ ...ad, is_active: !ad.is_active });
      await mutate();
    } catch (err) {
      console.error(err);
      setAlertMessage(t('અપડેટ કરવામાં નિષ્ફળ', 'Failed to update'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAd(deleteTarget.id);
      await mutate();
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      setAlertMessage(t('કાઢવામાં નિષ્ફળ', 'Failed to delete'));
      setDeleteTarget(null);
    }
  };

  const inputCls = `mt-1 w-full border border-rule px-3 py-2 text-sm outline-none focus:border-crimson bg-white ${gu ? 'font-gujarati' : ''}`;

  return (
    <div className={gu ? 'font-gujarati' : ''}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink">{t('જાહેરાત મેનેજમેન્ટ', 'Manage Ads')}</h1>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 bg-ink text-white px-4 py-2 text-sm font-bold rounded hover:bg-ink/90 transition-colors"
        >
          <Plus size={16} /> {t('નવી જાહેરાત', 'New Ad')}
        </button>
      </div>

      {ads.length === 0 ? (
        <p className="text-ink/50 py-10 text-center">{t('હજુ કોઈ જાહેરાત નથી.', 'No ads yet.')}</p>
      ) : (
        <div className="bg-white border border-rule overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ink/50 border-b border-rule">
                <th className="px-4 py-3">{t('ફોટો', 'Image')}</th>
                <th className="px-4 py-3">{t('શીર્ષક', 'Title')}</th>
                <th className="px-4 py-3">{t('સ્લોટ', 'Slot')}</th>
                <th className="px-4 py-3">{t('લિંક', 'Link')}</th>
                <th className="px-4 py-3">{t('સક્રિય', 'Active')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad: Ad) => (
                <tr key={ad.id} className="border-b border-rule/50 last:border-0">
                  <td className="px-4 py-2">
                    {ad.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ad.image_url} alt="" className="h-12 w-28 object-cover rounded border border-rule/50" />
                    ) : (
                      <span className="text-ink/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-semibold">{ad.title}</td>
                  <td className="px-4 py-2 text-ink/60">{slotLabel(ad.slot)}</td>
                  <td className="px-4 py-2 text-ink/60 max-w-[180px] truncate">
                    <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="hover:text-crimson">
                      {ad.link_url}
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={ad.is_active}
                      onClick={() => handleToggle(ad)}
                      className={`w-10 h-5 rounded-full transition-colors ${ad.is_active ? 'bg-crimson' : 'bg-ink/15'}`}
                    >
                      <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${ad.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => startEdit(ad)} className="p-1.5 text-ink/50 hover:text-crimson" aria-label={t('સંપાદિત કરો', 'Edit')}>
                        <Pencil size={16} />
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(ad)} className="p-1.5 text-ink/50 hover:text-red-500" aria-label={t('કાઢી નાખો', 'Delete')}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10">
          <form onSubmit={handleSubmit} className="bg-white border border-rule rounded-lg shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-5">
              {editingId ? t('જાહેરાત સંપાદિત કરો', 'Edit Ad') : t('નવી જાહેરાત', 'New Ad')}
            </h2>

            <label className="block text-sm font-bold text-ink mb-4">
              {t('શીર્ષક', 'Title')}
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputCls}
                placeholder={t('જાહેરાતનું નામ (દેખાતું નથી)', 'Ad label (not shown publicly)')}
              />
            </label>

            <label className="block text-sm font-bold text-ink mb-4">
              {t('જાહેરાતનો ફોટો', 'Ad Image')}
              {imagePreview ? (
                <div className="mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="" className="h-28 w-full object-cover rounded border border-rule mb-2" />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setImageFile(null); setForm({ ...form, image_url: '' }); }}
                    className="px-3 py-1 text-xs font-bold text-red-500 border border-red-500 rounded hover:bg-red-50"
                  >
                    {t('ફોટો બદલો', 'Change photo')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('ad-image-upload')?.click()}
                  className="mt-2 w-full border-2 border-dashed border-rule p-6 flex flex-col items-center gap-2 hover:border-crimson transition-colors"
                >
                  <ImageIcon size={28} className="text-ink/40" />
                  <span className="text-sm text-ink/50">{t('ફોટો પસંદ કરો', 'Select image')}</span>
                </button>
              )}
              <input
                id="ad-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelection(f); }}
              />
            </label>

            <label className="block text-sm font-bold text-ink mb-4">
              {t('લિંક URL (ક્લિક કરવા પર ખુલે)', 'Link URL (opens on click)')}
              <div className="relative mt-1">
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
                <input
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  className={`${inputCls} pl-8`}
                  placeholder="https://example.com"
                />
              </div>
            </label>

            <label className="block text-sm font-bold text-ink mb-4">
              {t('સ્થાન (સ્લોટ)', 'Placement (slot)')}
              <select
                value={form.slot}
                onChange={(e) => setForm({ ...form, slot: e.target.value })}
                className={inputCls}
              >
                {AD_SLOTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {gu ? s.labelGu : s.labelEn}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm font-bold text-ink mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              {t('સક્રિય (સાઇટ પર બતાવો)', 'Active (show on site)')}
            </label>

            <div className="flex gap-3 justify-end pt-4 border-t border-rule">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-ink/60 hover:text-ink"
              >
                {t('રદ કરો', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center gap-2 bg-crimson text-white px-5 py-2 text-sm font-bold rounded hover:bg-crimson/90 disabled:opacity-50"
              >
                {uploading ? <Upload size={15} className="animate-pulse" /> : null}
                {uploading ? t('અપલોડ થઈ રહ્યું છે...', 'Uploading...') : t('સાચવો', 'Save')}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={t('જાહેરાત કાઢી નાખો?', 'Delete this ad?')}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
      <SuccessModal open={showSuccess} onClose={() => setShowSuccess(false)} />
      <AlertModal message={alertMessage} onClose={() => setAlertMessage('')} />
    </div>
  );
}
```

Verify the exact props of `ConfirmDeleteModal`, `SuccessModal`, `AlertModal` against their implementations in `src/components/` before finalizing (they were used identically in `EPapers.tsx` — match that usage).

- [ ] **Step 4: Add the nav link in `src/components/AdminLayout.tsx`**

Add `Megaphone` to the lucide-react import (line 4-14 block) and add to the `links` array after the E-Papers entry:

```tsx
  {
    to: "/admin/ads",
    labelGu: "જાહેરાત",
    labelEn: "Ads",
    icon: Megaphone,
  },
```

- [ ] **Step 5: Verify and commit**

Run: `npx tsc --noEmit; npm run lint`
Expected: tsc clean; lint 0 errors (the 6 pre-existing warnings remain).

Manual check: log in to `/admin`, confirm the જાહેરાત link appears, create an ad with an uploaded image in slot `homepage_after_hero`, verify it renders on the homepage; toggle off → disappears (server-rendered, may need hard refresh); edit; delete.

```bash
git add src/lib/api.ts "app/(admin)/admin/(protected)/ads/page.tsx" src/components/admin/Ads.tsx src/components/AdminLayout.tsx
git commit -m "feat: admin ads management page"
```

---

### Task 6: Final verification

**Files:** none.

- [ ] **Step 1: Full check suite**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm run lint`
Expected: `✖ 6 problems (0 errors, 6 warnings)` — same warnings as baseline.

Run: `npm test`
Expected: all test files pass (baseline 28 + 2 ads helper + 5 ads API = 35).

- [ ] **Step 2: End-to-end manual pass**

With the dev server running (user's is on port 3000):

1. Homepage: ad after hero, ad after તાજા સમાચાર (when ads exist for those slots; empty otherwise)
2. Article page: top / middle / bottom banners at the right spots; middle appears after the first paragraph
3. Category page and city page: banner under the header
4. Rotation: two active ads in one slot → different ads on reload (server renders per request — no cache)
5. Inactive ad → gone everywhere; deleted ad → gone everywhere

- [ ] **Step 3: Report to the user**

Summarize: table created (user ran SQL), slots live, admin page at `/admin/ads`, what was verified, remaining user actions (none beyond running the migration SQL if not yet done).
