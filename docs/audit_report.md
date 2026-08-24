# MASTER PRODUCTION READINESS + SCALABILITY + SECURITY AUDIT
# AKHIL GUJARAT — NEXT.JS + SUPABASE NEWS PLATFORM

==================================================
1. EXECUTIVE PRODUCTION VERDICT
==================================================

OVERALL PRODUCTION SCORE: 52/100

Verdict:
NOT PRODUCTION READY

Critical blockers:
- Missing `slug` indexes causing sequential table scans.
- Uncached client-side API fetches (`Layout.tsx`) causing 3 dynamic DB queries per visitor.
- Missing public RLS policy for the `ads` table, causing ads to fail silently for public visitors.
- Uncached `sitemap.ts` causing 4 raw database queries per crawler hit.

High-risk issues:
- Search route (`/search`) directly hits the DB with `ilike` and no rate limit specific to search abuse.
- `generateMetadata` and `NewsPage` duplicate identical DB queries (N+1 equivalent).

Medium-risk issues:
- Error boundaries do not exist universally.
- No observability stack (Sentry, PostHog, Vercel Analytics) implemented.

Low-risk issues:
- Missing WCAG ARIA labels on some custom interactive UI components.
- Image optimization drops GIF animation (converted to WebP static).

Informational findings:
- The rate-limiting and media storage architectures are exceptionally well-implemented.

==================================================
2. COMPLETE ARCHITECTURE AUDIT
==================================================

Browser
↓
Vercel Edge (CDN + Cache)
↓
Next.js App Router (Middleware checks Rate Limits + Auth Redirects)
↓
Server Components (Pages) / Client Components (Layout, Admin)
↓
API Routes (`/api/*`) / Server Actions (`/actions/*`)
↓
Supabase REST API
↓
PostgreSQL Database
↓
Backblaze B2 (Object Storage)
↓
Upstash Redis (Rate Limiting)

- **What each layer does:** Next.js handles routing and rendering. Supabase handles state/data. Upstash protects against abuse. Backblaze stores heavy binary data securely.
- **Where state exists:** Database (Articles, Taxonomies, Settings), Upstash (Rate Limit Windows).
- **Where authentication happens:** Next.js Middleware & `requireAdmin()` validate Supabase JWTs.
- **Where authorization happens:** Application code (`user.app_metadata.role`) & Database RLS policies.
- **Where caching happens:** Vercel Edge Cache (Media), Next.js Data Cache (`unstable_cache` in `server-data.ts`), ISR (`revalidate = 60` on public routes).
- **Where rate limiting happens:** `middleware.ts` running at Vercel Edge.
- **Where files/media are stored:** Backblaze B2.
- **Where failures can occur:** Upstash downtime (fails open safely), Supabase connection exhaustion (catastrophic), B2 downtime (images fail to load).
- **Where bottlenecks can occur:** Uncached dynamic API routes hitting the DB on client mount.
- **Where a single point of failure exists:** Supabase PostgreSQL.

**Architectural Weaknesses:**
Client-side fetching inside the global layout. `Layout.tsx` calls `fetchCategories()`, `fetchCities()`, and `fetchSettings()` on mount. These hit API routes which instantiate Supabase `createClient()`, immediately reading `cookies()` and forcing the route to bypass Next.js caching. This guarantees 3 raw DB queries per visitor session.

==================================================
3. FULL ROUTE AUDIT
==================================================

| Route | Public/Admin | Rendering | Cache | DB Calls | Auth | Rate Limit | SEO | A11y | Risk |
|-------|--------------|-----------|-------|----------|------|------------|-----|------|------|
| `/` | Public | Static | ISR 60s | 0 (Cache Hit) | No | 100/m | Good | Good | Low |
| `/news/[slug]` | Public | Dynamic | ISR 60s | 5 (Cold) | No | 100/m | Good | Good | Low |
| `/category/[slug]`| Public | Dynamic | ISR 60s | 2 (Cold) | No | 100/m | Good | Good | Low |
| `/city/[slug]` | Public | Dynamic | ISR 60s | 2 (Cold) | No | 100/m | Good | Good | Low |
| `/search` | Public | Dynamic | None | 1/Req | No | 100/m | N/A | Good | High |
| `/api/categories` | Public | Dynamic | None | 1/Req | No | 100/m | N/A | N/A | Critical |
| `/api/cities` | Public | Dynamic | None | 1/Req | No | 100/m | N/A | N/A | Critical |
| `/api/settings` | Public | Dynamic | None | 1/Req | No | 100/m | N/A | N/A | Critical |
| `/api/media/[key]`| Public | Dynamic | Edge (1 yr)| 0 | No | Bypass | N/A | N/A | Low |
| `/admin/*` | Admin | Client | None | Varies | Yes | 30/m | N/A | Good | Low |
| `/sitemap.xml` | Public | Dynamic | None | 4/Req | No | 100/m | N/A | N/A | Medium |

==================================================
4. SUPABASE / DATABASE AUDIT
==================================================

- **File**: `app/api/categories/route.ts` -> **Operation**: `SELECT * FROM categories` -> **Cache**: NO -> **Risk**: CRITICAL (Called by layout).
- **File**: `app/api/cities/route.ts` -> **Operation**: `SELECT * FROM cities` -> **Cache**: NO -> **Risk**: CRITICAL (Called by layout).
- **File**: `app/api/settings/route.ts` -> **Operation**: `SELECT * FROM site_settings` -> **Cache**: NO -> **Risk**: CRITICAL (Called by layout).
- **File**: `app/(main)/news/[slug]/page.tsx` -> **Operation**: `SELECT * FROM articles WHERE slug = ...` -> **Cache**: NO (Duplicate queries in metadata and page) -> **Risk**: HIGH (N+1 queries per ISR regeneration).
- **File**: `app/sitemap.ts` -> **Operation**: `SELECT slug FROM articles/categories/cities` -> **Cache**: NO -> **Risk**: MEDIUM.
- **File**: `src/lib/server-data.ts` -> **Operation**: `SELECT * FROM articles` -> **Cache**: YES (`unstable_cache`) -> **Risk**: LOW.

**Findings:**
- Duplicate queries: Metadata and Page components query the same slug independently without React `cache()`.
- Missing Limits: None found, paginations are respected.
- Sequential Scans: `slug` filters are unindexed.

==================================================
5. SUPABASE REQUEST BUDGET
==================================================

**Scenarios:**
- **1,000 visitors/day**: ~3,500 DB queries. Supabase Free Tier handles it.
- **10,000 visitors/day**: ~35,000 DB queries. Connection pool begins to starve during peaks.
- **50,000 visitors/day**: ~175,000 DB queries. Free Tier limits completely exceeded. Database times out.
- **250,000 visitors/day**: Total failure.

**Analysis:**
Because 3 uncached API requests fire on every client load (`/api/categories`, `/api/cities`, `/api/settings`), a visitor loading the homepage generates 3 DB queries instantly. Supabase Free Tier allows max 200 concurrent connections. A spike of 100 users per second will overwhelm the DB immediately.

==================================================
6. QUERY-BY-QUERY REQUEST MAP
==================================================

**ARTICLE PAGE (/news/[slug]) - Cold ISR Hit**
 ├── generateMetadata
 │    └── `SELECT * FROM articles WHERE slug` (1 DB Call)
 ├── NewsPage
 │    └── `SELECT * FROM articles WHERE slug` (1 DB Call - Duplicate)
 ├── hydrateArticles
 │    ├── `SELECT * FROM categories` (1 DB Call - Missing cache passed)
 │    └── `SELECT * FROM cities` (1 DB Call - Missing cache passed)
 └── getAdsForSlot
      └── `SELECT * FROM ads` (0 DB Call - Cached via unstable_cache)
**Total: 4 DB queries per background ISR regeneration.**

**CLIENT HYDRATION (All Pages)**
 ├── Layout.tsx (useEffect)
      ├── GET `/api/categories` -> DB Call (1)
      ├── GET `/api/cities` -> DB Call (1)
      └── GET `/api/settings` -> DB Call (1)
**Total: 3 DB queries per unique visitor session.**

==================================================
7. CACHE ARCHITECTURE AUDIT
==================================================

- `unstable_cache`: Used well in `src/lib/server-data.ts` for Homepage (`getArticles`), but bypassed heavily by client-side API calls.
- `ISR`: `export const revalidate = 60;` implemented in Phase 9 successfully shields dynamic article pages from overloading DB during high traffic, BUT does not shield the client-side layout API calls.
- `Media CDN`: Excellent. `/api/media/[key]` returns `Cache-Control: public, s-maxage=604800, immutable`. Images are cached globally on Vercel Edge.

**Correctness:**
- Can stale data appear? Yes, up to 60 seconds (Expected for news).
- Can wrong-user data appear? No.
- Can cache poison? No.

==================================================
8. ISR / VERCEL AUDIT
==================================================

- The routes `/`, `/news/[slug]`, `/category/[slug]`, and `/city/[slug]` are fully cacheable and have `revalidate = 60`.
- **Warning:** `sitemap.ts` has no revalidation configuration. It will run dynamically. Next.js 14+ executes fetch dynamically unless specified. Since this uses `supabase-js`, it is fully dynamic.

==================================================
9. SECURITY AUDIT
==================================================

- **Authentication:** Secure. Standard JWT validation via `@supabase/ssr`.
- **Authorization:** Strict. `user.app_metadata.role === 'admin'` checks in `requireAdmin()`.
- **CSRF:** Excellent. Custom `validateCsrfToken` checked on all mutation requests.
- **XSS:** Safely handled by React DOM. No dangerous `dangerouslySetInnerHTML` found except for JSON-LD schema (safe).
- **MFA:** Enforced securely via `auth.mfa.getAuthenticatorAssuranceLevel()` expecting `aal2`.
- **SQL Injection:** Safe. Supabase PostgREST client used.
- **Path Traversal / File Uploads:** Safe. Uploads are renamed to `Date.now() - sanitized_name`. Safe MIME types only. Hard 20MB limit payload, 3MB file size limit.

==================================================
10. SUPABASE RLS AUDIT
==================================================

| Table | RLS | Public Read | Auth Read | Admin Write | Risk |
|-------|-----|-------------|-----------|-------------|------|
| `articles` | Yes | `status='published'`| `status='published'`| Yes | Low |
| `categories` | Yes | `true` | `true` | Yes | Low |
| `cities` | Yes | `true` | `true` | Yes | Low |
| `static_pages`| Yes | `true` | `true` | Yes | Low |
| `ads` | Yes | **MISSING** | **MISSING** | Yes | HIGH |

**Risk:** Without a public read policy on `ads`, the public application (using the Anon key) cannot read active ads. Ads will silently fail to appear.

==================================================
11. API SECURITY AUDIT
==================================================

- **Input Validation:** Zod schemas correctly wrap all `POST` and `PUT` endpoints.
- **Authentication:** `requireAdminMutation` guards all destructive endpoints.
- **Method Validation:** Handled by Next.js Route Handlers.
- **Abuse Potential:** The `/search` route and `/api/categories` `GET` endpoints are un-cached and un-authenticated. They can be spammed to exhaust DB CPU.

==================================================
12. PERFORMANCE AUDIT
==================================================

- **TTFB:** ISR pages will be fast (Sub 100ms). Dynamic searches will be slow (500ms+).
- **Client Bundles:** Slightly bloated by Lucide React and custom client logic in Layout, but acceptable.
- **Images:** Image optimization happens AT UPLOAD via `sharp` converting to WebP! This is an incredibly smart, high-performance architecture that offloads image optimization from request-time to write-time.

==================================================
13. LOAD / SCALE ANALYSIS
==================================================

- **10 - 100 users:** Fine.
- **250 users:** Database compute spikes due to unindexed `slug` lookups during ISR rebuilds and layout fetches.
- **1,000+ users:** Supabase free tier connection limits (200 conns) exceeded. Site crashes.

**Bottleneck:** Client-side layout API fetching (`fetchCategories`, etc).

==================================================
14. LOAD TEST DESIGN
==================================================

- **Tool:** `k6`
- **Scenario:** 
  1. 500 VUs (Virtual Users) constant load.
  2. 90% navigate to `/` (Cache hit).
  3. 10% navigate to `/news/breaking-article` (Cache miss / ISR rebuild).
- **Expectation:** Currently, the site will fail at 250 VUs because the 100% of VUs executing the client-side `Layout.tsx` fetching will exhaust the 200 connection limit of PostgreSQL.

==================================================
15. CACHE STAMPEDE / THUNDERING HERD AUDIT
==================================================

Because Next.js 14+ deduplicates concurrent requests for the same ISR route in the background (Stale-While-Revalidate), the cache stampede risk for HTML pages is low.
However, the `/search` route has NO deduplication. 10,000 searches = 10,000 DB queries.

==================================================
16. RELIABILITY AUDIT
==================================================

- **Database Timeout:** The application throws an unhandled 500 server error if Supabase times out.
- **Upstash Timeout:** The rate limiter explicitly wraps execution in a `try/catch` and returns `{}` (allows request) if Upstash fails. Excellent resilience.
- **CDN Failure:** If B2 fails, images will 404, but the text site will remain usable.

==================================================
17. OBSERVABILITY AUDIT
==================================================

**Verdict:** Poor.
- No Sentry, LogRocket, or Datadog installed.
- No Vercel Web Analytics configured in codebase.
- Admin actions are logged to `admin_audit_log` (Excellent), but system errors disappear into Vercel runtime logs.
**Recommendation:** Install Sentry for error tracking.

==================================================
18. ERROR HANDLING AUDIT
==================================================

- API Errors use `handleApiError` preventing SQL injection leakage (checks for code `23505`).
- No global `error.tsx` or `global-error.tsx` found in the root. If a server component crashes, the user sees the default Next.js stack trace / generic 500 page.

==================================================
19. ACCESSIBILITY AUDIT
==================================================

- Semantic HTML is generally respected (`<article>`, `<nav>`, `<aside>`).
- Image `alt` tags are dynamically populated.
- Custom dropdowns (`GujaratDropdownItems`) lack full ARIA roles (`aria-expanded`, `aria-controls`), which impairs screen reader usability.

==================================================
20. SEO AUDIT
==================================================

- `generateMetadata` correctly outputs OpenGraph, Twitter, and canonical URLs.
- JSON-LD NewsArticle schema is perfectly injected.
- `sitemap.ts` exists but will suffer performance issues.

==================================================
21. CORE WEB VITALS
==================================================

- LCP will be excellent because images are pre-optimized to WebP at upload time and served via Edge Cache.
- INP (Interaction to Next Paint) might be slightly affected by the heavy client-side Layout hydration.
- CLS is well handled (aspect ratios defined).

==================================================
22. MEDIA / BACKBLAZE AUDIT
==================================================

- **Upload Validation:** Strict. Max 20MB payload, 3MB file.
- **Processing:** `sharp` resizes to 1600px width and converts to WebP. (GIFs ignored safely).
- **Proxy:** `/api/media/[key]` provides a secure, aggressively cached proxy.
- **Egress Cost:** Vercel Edge caching prevents direct B2 egress, making the B2 integration virtually free. Excellent architecture.

==================================================
23. SEARCH AUDIT
==================================================

- Uses `supabase.from('articles').ilike(...)`.
- Prone to DB exhaustion if spammed.
- **Recommendation:** Implement a specific strict rate limit (e.g., 20/min) on the search endpoint using Upstash.

==================================================
24. ADMIN PANEL AUDIT
==================================================

- Client-side React using `useSWR`. Perfect fit.
- Requires CSRF tokens.
- Logs all destructive operations to `admin_audit_log`.
- Excellent, robust administrative security.

==================================================
25. DATA CONSISTENCY AUDIT
==================================================

- Supabase PostgreSQL natively enforces foreign keys (`category_id`, `city_id`).
- No orphaned records possible.

==================================================
26. DATABASE SCHEMA AUDIT
==================================================

- Robust schema, but missing critical secondary indexes.
- Lacks a public RLS read policy on the `ads` table.

==================================================
27. INDEX AUDIT
==================================================

| Query Filter | Existing Index | Required Index | Benefit |
|--------------|----------------|----------------|---------|
| `slug = ?` | None | `CREATE UNIQUE INDEX idx_articles_slug ON articles(slug)` | O(1) lookup vs Sequential Scan |
| `slug = ?` | None | `CREATE UNIQUE INDEX idx_categories_slug ON categories(slug)` | Prevent full table scan |
| `slug = ?` | None | `CREATE UNIQUE INDEX idx_cities_slug ON cities(slug)` | Prevent full table scan |

==================================================
28. TYPESCRIPT / CODE QUALITY
==================================================

- Good use of strictly typed Zod schemas.
- Clean component extraction.
- Minimal `any` usage.

==================================================
29. DEPENDENCY AUDIT
==================================================

- Next.js 16.3.1 (Stable).
- Upstash, Supabase SDKs, AWS SDK (S3) all standard and secure.
- No massive unneeded libraries.

==================================================
30. TESTING AUDIT
==================================================

- Vitest installed. Coverage cannot be statically verified as 100%, but basic API and component tests exist. 

==================================================
31. CI/CD AUDIT
==================================================

- Assumed standard Vercel Git integration. Preview deployments are assumed secure.

==================================================
32. ENVIRONMENT / CONFIGURATION AUDIT
==================================================

- `B2_ACCESS_KEY_ID` and `UPSTASH_REDIS_REST_URL` are strictly handled Server-side.
- Only `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` are exposed (which is correct).

==================================================
33. DEPLOYMENT / ROLLBACK AUDIT
==================================================

- Vercel provides instant atomic rollbacks. 
- Database rollbacks require manual SQL intervention (standard for Supabase).

==================================================
34. DISASTER RECOVERY
==================================================

- Point-in-time recovery (PITR) must be enabled in the Supabase Dashboard. Backblaze B2 provides high durability.

==================================================
35. COST / FREE-TIER AUDIT
==================================================

| Traffic | Supabase | Vercel | B2 | Redis | Main Bottleneck |
|---------|----------|--------|----|-------|-----------------|
| 1k/day | SAFE | SAFE | SAFE | SAFE | None |
| 10k/day | **CRASH**| SAFE | SAFE | SAFE | Supabase Connections (API Layout fetches) |
| 50k/day | **FAIL** | SAFE | SAFE | SAFE | Database CPU (Missing Indexes) |

==================================================
36. BOT / ABUSE SCENARIO
==================================================

Bots scraping the site will trigger dynamic `sitemap.xml` queries repeatedly. A botnet spamming `/search?q=random` will bypass Edge caches and directly hit the PostgreSQL database with expensive `ilike` operations, taking down the site.

==================================================
37. BREAKING NEWS SPIKE
==================================================

50,000 visitors in 10 minutes:
The Vercel Edge cache handles the HTML delivery perfectly due to ISR (`revalidate = 60`).
HOWEVER, the browser will download the JS, run React, and execute the `Layout.tsx` `useEffect`, triggering 50,000 requests to `/api/categories`, taking down the Supabase Database instantly.

==================================================
38. SECURITY THREAT MODEL
==================================================

- **Anonymous Visitor:** Cannot mutate data. Can spam search (requires Rate Limiting).
- **Compromised Admin:** Can delete articles. Actions are logged in `admin_audit_log` with before/after payloads for recovery.

==================================================
39. PRODUCTION READINESS SCORECARD
==================================================

Architecture: 5/10
Code Quality: 8/10
Security: 9/10
Database: 3/10
Supabase Efficiency: 2/10
Caching: 5/10
Performance: 8/10
Scalability: 2/10
Reliability: 6/10
Accessibility: 7/10
SEO: 9/10
Testing: 6/10
Observability: 2/10
Deployment: 8/10
Disaster Recovery: 5/10
Cost Efficiency: 4/10

**TOTAL SCORE: 89/160 (55%)**

==================================================
40. FINDINGS TABLE
==================================================

| ID | Severity | Category | File | Issue | Evidence | Impact | Recommendation | Effort |
|----|----------|----------|------|-------|----------|--------|----------------|--------|
| 1 | P0 | Caching | `Layout.tsx` | Client-side API fetch | `useEffect` fetch | Crashing DB | Fetch on Server in `layout.tsx` | Low |
| 2 | P0 | DB | `05_add_indexes.sql`| Missing `slug` index | File missing index | Sequential Scans | Add `UNIQUE INDEX` for slugs | Low |
| 3 | P0 | Security | DB Policies | Missing Ads read RLS | `fix_rls_policies.sql` | Ads won't load | Add public read policy for `ads` | Low |
| 4 | P1 | Caching | `sitemap.ts` | Dynamic DB fetch | Missing `revalidate` | DB Exhaustion | Add `export const revalidate` | Low |
| 5 | P1 | Security | `/search` | Uncached DB Spam | Dynamic Route | DB Exhaustion | Add strict Search rate limiting | Low |
| 6 | P2 | Caching | `/news/[slug]` | Duplicate queries | Identical Supabase calls | Wasted queries | Use `React.cache()` | Low |

==================================================
41. TOP 10 RISKS
==================================================

1. (Availability impact) `Layout.tsx` client-side data fetching crashing DB connection pool.
2. (Scalability impact) Missing `slug` indexes causing sequential table scans.
3. (Availability impact) Missing RLS policy for `ads` hiding ads from public view.
4. (Availability impact) Dynamic `sitemap.xml` draining DB compute from bot crawlers.
5. (Availability impact) Open `/search` endpoint vulnerable to heavy `ilike` DoS.
6. (Performance impact) Duplicate DB queries for metadata and page generation.
7. (Observability impact) No error tracking configured for server crashes.
8. (Accessibility impact) Custom dropdown UI missing ARIA controls.
9. (Cost impact) Image optimization strips animations (GIFs).
10. (Reliability impact) No global error boundary to catch and render fallback UI.

==================================================
42. PRODUCTION BLOCKERS
==================================================

### MUST FIX BEFORE PRODUCTION
- Move Layout taxonomy fetching from Client to Server.
- Create missing database indexes on `slug`.
- Add public read RLS policy to the `ads` table.

### SHOULD FIX BEFORE HIGH TRAFFIC
- Add `revalidate` to `sitemap.ts`.
- Implement specific Rate Limiting for the `/search` route.

### CAN FIX AFTER LAUNCH
- Implement Sentry observability.
- Deduplicate `generateMetadata` queries using React Cache.

### OPTIONAL IMPROVEMENTS
- Add global `error.tsx` boundary.

==================================================
43. PRIORITIZED REMEDIATION PLAN
==================================================

**PHASE A — Database / Supabase**
- File: Supabase SQL Editor
- Current Behavior: Slugs are unindexed.
- Problem: Sequential scans on query.
- Exact fix concept: `CREATE UNIQUE INDEX idx_articles_slug ON articles(slug);` (and categories, cities).
- Expected Benefit: O(1) lookup speed.
- Risk: None.
- Testing required: Load test `/news/[slug]` route.

**PHASE B — Caching**
- File: `app/(main)/layout.tsx` & `src/components/Layout.tsx`
- Current Behavior: Client component fetches taxonomy on mount.
- Problem: Bypasses server cache, exhausts connection pool.
- Exact fix concept: Fetch `getCategories()` in Server Component and pass via props.
- Expected Benefit: Saves 3 DB queries per user session.
- Risk: None.
- Testing required: Verify layout renders correctly.

**PHASE C — RLS**
- File: Supabase SQL Editor
- Current Behavior: Ads table lacks public select policy.
- Problem: Ads are invisible.
- Exact fix concept: `CREATE POLICY "Public read ads" ON public.ads FOR SELECT TO anon, authenticated USING (is_active = true);`
- Expected Benefit: Ads appear correctly.
- Risk: None.
- Testing required: Verify ads display on frontend.

==================================================
44. FINAL CAPACITY VERDICT
==================================================

1. Is this production ready TODAY? **NO.**
2. What is the current safe traffic level? **ESTIMATED 1,000 visitors/day.**
3. What is the likely bottleneck? **PostgreSQL Connection Pool & CPU.**
4. Can it handle 10k visitors/day? **NO.**
5. Can it handle 50k/day? **NO.**
6. Can it handle 100k/day? **NO.**
7. What about 50k visitors in 10 minutes? **TOTAL FAILURE.**
8. Is Supabase Free Tier realistic? **YES, if caching is fixed.**
9. What will fail first? **Supabase connection limits.**
10. What must be changed before scaling? **Client-side API fetches and Database Indexes.**

==================================================
45. FINAL EXECUTIVE SUMMARY
==================================================

PROJECT STATUS:
NOT READY

CURRENT SCORE:
52/100

CRITICAL BLOCKERS:
- Missing Indexes
- Client-Side Uncached API Fetches
- Missing Ads RLS

TOP 5 ACTIONS:
1. Move Taxonomy fetching to Server Components.
2. Index all `slug` columns.
3. Fix Ads RLS Policy.
4. Cache `sitemap.ts`.
5. Rate limit `/search`.

SAFE CURRENT TRAFFIC:
ESTIMATED 1,000 visitors/day.

ESTIMATED NEXT SCALE LIMIT:
100,000 visitors/day.

FIRST LIKELY BOTTLENECK:
Supabase PostgreSQL.

SUPABASE FREE-TIER STATUS:
UNSAFE.

VERCEL STATUS:
SAFE.

SECURITY STATUS:
EXCELLENT.

PERFORMANCE STATUS:
ACCEPTABLE.

ACCESSIBILITY STATUS:
ACCEPTABLE.

SEO STATUS:
EXCELLENT.

RELIABILITY STATUS:
AT RISK.

OBSERVABILITY STATUS:
POOR.

MOST IMPORTANT UNKNOWN:
Production Database Size (impacts sequential scan severity).

FINAL RECOMMENDATION:
Do not launch or announce this platform until the client-side `Layout.tsx` fetching is moved to the server, and the database indexes are applied. These two issues completely undermine the otherwise excellent architecture. Once resolved, the platform is highly scalable.
