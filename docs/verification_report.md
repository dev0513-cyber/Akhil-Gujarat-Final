# PHASE 1 — VERIFIED SUPABASE FINDINGS

## A. Executive Summary

This phase involved a read-only, forensic verification of the codebase to validate the claims made in the previous audit regarding Supabase database usage, caching flaws, and schema deficiencies. 

The investigation verified that the most critical problems (missing indexes, missing caching on dynamic article routes, redundant taxonomy queries) **do exist in the codebase**. However, one specific claim regarding request duplication between `generateMetadata` and `NewsPage` was technically incorrect due to Next.js's native `fetch` request memoization during the same render pass. 

Overall, the core conclusion stands: **The article detail page is highly inefficient and will exceed Supabase free-tier limits at 10k daily visitors.**

---

## B. Previous Audit Claims — Verified vs Incorrect

| Previous Claim | Status | Evidence | Severity |
| -------------- | ------ | -------- | -------- |
| Article page makes 5 DB queries per cold load | **VERIFIED** | `NewsPage` (1), `hydrateArticles` (2), `getAds` (1), `getArticles` (1) = 5 queries. | CRITICAL |
| `generateMetadata` & `NewsPage` duplicate DB queries | **INCORRECT** | Both call `supabase.from...`, but Next.js automatically memoizes identical `fetch` requests within a single server render pass. It only hits the DB once. | LOW |
| `hydrateArticles` causes 2 full table scans per article load | **VERIFIED** | `app/(main)/news/[slug]/page.tsx` line 65 calls it without `options`, forcing it to query `categories` and `cities` directly from Supabase (lines 83-86 in `utils.ts`). | CRITICAL |
| Database lacks secondary indexes | **VERIFIED** | `database/schema.sql` only contains Primary Keys and `UNIQUE` constraints (for slugs). | CRITICAL |
| Homepage is fully cached | **VERIFIED** | `server-data.ts` wraps all homepage data fetches in `unstable_cache`. | LOW |

---

## C. Article Page Request Flow

**File:** `app/(main)/news/[slug]/page.tsx`

1. **`generateMetadata()`**
   - **Operation:** `supabase.from('articles').select('*').eq('slug', slug).maybeSingle()`
   - **Cache mechanism:** Next.js Request Memoization (memoizes within this specific page load). Uncached across multiple visitors.

2. **`NewsPage()`**
   - **Operation:** `supabase.from('articles').select('*').eq('slug', slug).maybeSingle()`
   - **Cache mechanism:** Next.js Request Memoization (uses the result from `generateMetadata` without hitting the DB again). Uncached across multiple visitors.

3. **`hydrateArticles(data)`** (called in `NewsPage`)
   - **Operation:** 
     - `supabasePublic.from('categories').select('*')`
     - `supabasePublic.from('cities').select('*')`
   - **Why it executes:** `NewsPage` fails to pass the `options: { categories, cities }` arguments, triggering the fallback database queries inside `app/api/utils.ts`.
   - **Cache mechanism:** NONE. The fallback queries do not use `unstable_cache`.

4. **`getAdsForSlot('article_sidebar')`**
   - **Operation:** `supabase.from('ads').select('*').eq('slot', slot).eq('is_active', true).limit(20)`
   - **Cache mechanism:** NONE. Executed freshly on every page view.

5. **`getArticles({ category_id: ..., limit: 5 })`** (Related Articles)
   - **Operation:** Executes complex query in `server-data.ts`
   - **Cache mechanism:** `unstable_cache` (Cache Hit most of the time).

---

## D. Verified Supabase Request Count

| Step | Function | Table | Operation | Supabase Call? | Cached? |
| ---- | -------- | ----- | --------- | -------------- | ------- |
| 1 | `generateMetadata` | `articles` | SELECT | YES | NO (cross-request) |
| 2 | `NewsPage` | `articles` | SELECT | NO (Memoized) | YES (per-request) |
| 3 | `hydrateArticles` | `categories` | SELECT | YES | NO |
| 4 | `hydrateArticles` | `cities` | SELECT | YES | NO |
| 5 | `getAdsForSlot` | `ads` | SELECT | YES | NO |
| 6 | `getArticles` | `articles` | SELECT | YES | YES (unstable_cache) |

**ARTICLE PAGE — VERIFIED REQUEST COUNT**

Cold request:
**5 Supabase operations**

Potential duplicate operations:
**0** (Next.js request memoization prevents the metadata duplication)

Cache-hit request (where related articles are cached):
**4 Supabase operations**

---

## E. Homepage Request Flow

**File:** `app/(main)/page.tsx`

The Homepage executes `Promise.all` calling four helpers from `src/lib/server-data.ts`:
1. `getArticles({ limit: 80 })` (Latest)
2. `getArticles({ trending: 1, limit: 8 })` (Trending)
3. `getCities()` (Cities List)
4. `getArticles({ day: ..., limit: 100 })` (Today's News)

**Homepage cold request:** 4 Supabase Operations.
**Homepage cache-hit behavior:** Fully served from Next.js Data Cache.
**Cache lifetime:** 60 seconds (`revalidate: 60`) for articles, 3600 seconds for cities.
**Supabase operations on cold request:** 4
**Supabase operations on cache hit:** 0

---

## F. Database Index Inventory

**File:** `database/schema.sql`

| Table | Column/Expression | Index Exists? | Index Type | Evidence |
| ----- | ----------------- | ------------- | ---------- | -------- |
| `articles` | `id` | YES | Primary Key | `PRIMARY KEY` |
| `articles` | `slug` | YES | Unique Constraint | `UNIQUE` |
| `articles` | `status` | **NO** | - | Not in schema |
| `articles` | `category_id` | **NO** | - | Not in schema |
| `articles` | `city_id` | **NO** | - | Not in schema |
| `articles` | `published_at` | **NO** | - | Not in schema |
| `articles` | `is_trending` | **NO** | - | Not in schema |
| `categories` | `slug` | YES | Unique Constraint | `UNIQUE` |
| `cities` | `slug` | YES | Unique Constraint | `UNIQUE` |

---

## G. Query Efficiency Findings

| Location | Filter | Sort | Limit | Likely Index Needed? | Existing Index? |
| -------- | ------ | ---- | ----- | -------------------- | --------------- |
| `server-data.ts:getArticles` | `status`, `category_id`, `is_trending`, `published_at` | None | 40-100 | YES | **NO** |
| `server-data.ts:getAdsForSlot` | `slot`, `is_active` | None | 20 | YES | **NO** |
| `utils.ts:hasNameConflict` | `name_en`, `name_gu` | None | 1 | NO (rare admin action) | NO |

---

## H. N+1 Findings

No traditional looping N+1 patterns (e.g., `for` loops making DB calls) were found in the codebase. 

However, there is a structural inefficiency in `app/(main)/news/[slug]/page.tsx` via `hydrateArticles` that triggers 2 extra table scans (`categories`, `cities`) for *every single article view*. This is the closest equivalent to a systemic N+1 architecture flaw on public routes.

---

## I. Client-Side Request Findings

**PUBLIC WEBSITE:**
No public-facing client components directly query Supabase or initiate unnecessary polling. The frontend is cleanly decoupled using Server Components. 

**ADMIN PANEL:**
`src/components/admin/*.tsx` utilize `useSWR` for fetching data from the API routes (e.g., `/api/articles`). This is standard and appropriate for an authenticated SPA admin interface. No runaway polling or realtime subscription issues were found.

---

## J. Caching Findings

| Route | Rendering | Cache Mechanism | Revalidate | Supabase Data | Concern |
| ----- | --------- | --------------- | ---------- | ------------- | ------- |
| `/` | Dynamic | `unstable_cache` | 60s / 3600s | `articles`, `cities` | Low (Optimized) |
| `/news/[slug]` | Dynamic | NONE | - | `articles`, `ads`, taxonomy | **HIGH** |
| `/category/[slug]` | Dynamic | `unstable_cache` | 60s | `articles` | Low |
| `/city/[slug]` | Dynamic | `unstable_cache` | 60s | `articles` | Low |
| `/search` | Dynamic | NONE | - | `articles` | Low (search is naturally dynamic) |

---

## K. Security Findings

**NO CHANGE RECOMMENDED.**

The following security implementations are verified and correct:
- **RLS**: Properly configured in `schema.sql`. Public can only SELECT `status = 'published'`.
- **Admin Authorization**: Middleware and `requireAdmin()` check `app_metadata.role` securely.
- **CSRF**: `validateCsrfToken` protects API mutations.
- **Session Limits**: Hard 24-hour expiration implemented.

---

## L. Corrected Supabase Traffic Estimates

- 10,000 daily visitors generating 25,000 page views (10,000 home, 15,000 articles).
- Homepage views = 0 queries (mostly cache hits).
- Article views = 15,000 * 4 uncached queries = 60,000 queries per day.
- **Verdict**: The previous audit estimated ~75,000. The verified estimate is ~60,000. Both exceed the ideal baseline by a massive margin and represent a genuine threat to free-tier stability.

---

## M. Critical Findings We Should Actually Fix

1. **Missing Secondary Indexes**: Must add indexes for `status`, `category_id`, `city_id`, `is_trending`, and `published_at` in Supabase.
2. **Missing Arguments in `hydrateArticles`**: Must pass cached `getCategories()` and `getCities()` to `hydrateArticles` in `NewsPage` to prevent 2 redundant full-table scans per page view.
3. **Missing Ads Caching**: Must wrap `getAdsForSlot` in `unstable_cache` (e.g., with a 60s revalidate) so ads don't force a database query on every single page load.
4. **Uncached Article Detail Fetch**: The main article query should be wrapped in `React.cache()` and potentially `unstable_cache` to drastically reduce DB load for viral articles.

---

## N. Findings That Should NOT Be Changed

1. **Client-Side Admin Fetching**: The `useSWR` implementation in `app/(admin)` is appropriate and should remain.
2. **RLS Policies**: They are secure and robust.
3. **Request Deduplication**: No manual caching is needed to fix the `generateMetadata` duplication, as Next.js already handles this natively.

---

# PHASE 1 VERDICT

Confirmed Critical Issues:
1. `articles` table is completely missing secondary indexes.
2. `hydrateArticles` is missing taxonomy arguments in `NewsPage`, causing 2 redundant table scans per view.
3. `getAdsForSlot` and the main article fetch in `NewsPage` bypass all caching, ensuring a minimum of 4 database queries per article view.

Previous Audit Claims That Were Incorrect:
1. `generateMetadata` and `NewsPage` do NOT duplicate database hits across a single page load. Next.js Request Memoization successfully deduplicates the `fetch` calls under the hood.

Recommended Next Step:
Proceed to Phase 2: Create a surgical Implementation Plan to fix the caching bypasses in `NewsPage` and deploy the missing database indexes.

FILES MODIFIED:
NONE
