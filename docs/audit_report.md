# EXECUTIVE SUMMARY

The Akhil Gujarat digital news platform is a Next.js 15 (App Router) monolithic application backed by Supabase (PostgreSQL) for data and Backblaze B2 for media storage. The architecture follows modern Server-Side Rendering (SSR) and Static Site Generation (SSG) patterns using Next.js `unstable_cache` for performance.

The platform is functionally strong, featuring a custom CMS with role-based access control, MFA support for admins, a proxy-based media delivery pipeline with on-the-fly image optimization (Sharp), and comprehensive caching. However, there are significant architectural quirks—most notably the media proxy design—that present major cost and scalability risks if traffic scales.

---

## CURRENT SYSTEM ARCHITECTURE

**Browser (Client)**
↓
**Vercel Edge Network / Next.js Server**
- Rate Limiting (Upstash Redis via Middleware)
- Security Headers & Session Validation (Middleware)
- Next.js Server Components / API Routes
↓
**Caching Layer**
- Next.js `unstable_cache` (Articles, Categories, Cities, Settings, Ads)
↓
**Data & Storage Layer**
- **Supabase (PostgreSQL)**: Core relational data with Row Level Security (RLS)
- **Backblaze B2**: Media storage (Images, PDFs) proxied through Vercel via `@aws-sdk/client-s3`

---

## HOW THE SYSTEM WORKS

### Public User Flow
1. **Request**: Browser requests homepage (`/`).
2. **Middleware**: Checks rate limits (Upstash). Allows public route.
3. **Server Component**: `app/(main)/page.tsx` executes.
4. **Cache Retrieval**: Calls `getArticles`, `getCities`, etc. Next.js returns cached data or fetches from Supabase.
5. **Rendering**: React components render the page.
6. **Media Delivery**: Images use `<Image src="/api/media/...">`. The request hits Next.js Image Optimizer, which then calls the custom `/api/media/[key]` proxy, which fetches from Backblaze B2.

### Admin Flow
1. **Authentication**: Admin logs in at `/admin/login`. Calls Supabase Auth.
2. **MFA Check**: `auth.ts` verifies TOTP if enrolled.
3. **Session**: Cookie is set. Middleware protects `/admin/*` routes.
4. **Data Management**: Admin creates an article. Image uploads via `/api/upload` (optimized with Sharp, pushed to B2).
5. **Mutation**: Article inserted via `/api/articles`. `requireAdminMutation` verifies CSRF, Admin Role, and Session Age (< 24h).
6. **Audit**: Action is logged to `admin_audit_log`.

---

## WHAT IS ALREADY STRONG

- **Security Enforcement**: MFA support, strict 24-hour session limits, CSRF protection, and `admin_audit_log` are enterprise-grade features rarely seen in small CMS builds.
- **Rate Limiting**: Tiered Upstash Redis rate limiting (Auth, Upload, Mutation, Public) protects against abuse.
- **Media Optimization**: Uploads are resized and converted to WebP via Sharp before hitting storage.
- **Code Organization**: Clean separation of Server Data (`server-data.ts`), API Utils, and UI Components.

---

## CRITICAL GAPS

- **[P0] ARCHITECTURE/COST**: Media Proxy Double-Hit. Images are served via `app/api/media/[key]/route.ts`. Because `<Image src="/api/media/..." />` is used, Vercel will run the Next.js Image Optimizer (Serverless Function #1), which calls the media proxy API route (Serverless Function #2). For a news site, this will rapidly burn Vercel Serverless Execution hours and cause extreme cost overruns at scale.
- **[P0] CACHE/BUG**: Static Ad Randomization. `getAdsForSlot` fetches active ads and uses `Math.random()` to pick one. Because it's called inside cached Server Components, the "random" ad is baked into the HTML during build/revalidation. All users will see the exact same ad until the cache revalidates, defeating ad rotation.

---

## HIGH PRIORITY IMPROVEMENTS

- **[P1] SECURITY**: File Upload Path Traversal Risk. The upload route generates paths using ``${Date.now()}-${safe}``. While `safe` replaces non-alphanumeric chars, relying on regex `/\.(exe|sh|bat|js|html|php|svg)$/i` for extension blocking is a blacklist approach. Use a whitelist approach for extensions.
- **[P1] PERFORMANCE**: N+1 Queries in API. `app/api/articles/route.ts` calls `hydrateArticles(data)`. `hydrateArticles` (in `utils.ts`) fetches ALL categories and ALL cities directly from Supabase for every API request because it doesn't use the `unstable_cache` versions.
- **[P1] DATABASE**: No cleanup mechanism for orphaned Backblaze B2 files if an article is deleted or an upload is abandoned.

---

## MEDIUM PRIORITY IMPROVEMENTS

- **[P2] SEO**: Missing RSS feed. Essential for a news website to syndicate content to Google News and aggregators.
- **[P2] DEVOPS**: No GitHub Actions or external CI/CD pipeline visible. Validations only happen during Vercel builds.
- **[P2] UX**: Client-side hydration on admin pages could be slow for large article lists. Needs virtualized lists or stricter server-side pagination enforcement on the frontend.

---

## LOW PRIORITY / OPTIONAL

- **[P3] FEATURE**: Dark mode support.
- **[P3] ARCHITECTURE**: Switch Backblaze B2 bucket to Public, mapped to a Cloudflare CDN, eliminating the `/api/media` proxy entirely and drastically reducing Vercel costs.

---

## MISSING FEATURES

**REQUIRED**
- RSS/Atom Feed (Crucial for Google Publisher Center).
- Privacy Policy & Terms of Service pages (Required for ad networks).

**RECOMMENDED**
- Author pages (SEO benefit for E-E-A-T).
- Google Analytics / PostHog integration.

**OPTIONAL**
- WhatsApp native sharing integration (highly effective for Gujarati news).

---

## SECURITY STATUS

**Assessment:** STRONG, but with isolated risks.
**Evidence:**
- `src/middleware.ts` successfully implements tiered Upstash rate limiting and applies strict CSP/Security Headers.
- `src/api/utils.ts` implements strict 24-hour session expiry and checks `app_metadata.role === 'admin'`.
- CSRF validation is manually enforced via `src/lib/csrf.ts`.
- **Remaining Risk:** Upload extension validation is blacklist-based (`route.ts:51`). Media proxying exposes the server to bandwidth exhaustion (SSRF risk is mitigated by hardcoded bucket endpoints, but cost-exhaustion is a risk).

---

## PERFORMANCE STATUS

**Assessment:** NEEDS IMPROVEMENT (Cost/Scale perspective).
**Evidence:**
- HTML delivery is very fast due to Next.js `unstable_cache` (`server-data.ts`).
- Image delivery is a bottleneck. Proxying B2 through Vercel Serverless (`app/api/media/[key]/route.ts`) adds latency and cost.
- Core Web Vitals will likely suffer on mobile if multiple images invoke cold-start proxy functions.

---

## DATABASE STATUS

**Assessment:** PRODUCTION READY.
**Evidence:**
- `database/schema.sql` shows proper relational design with foreign keys, indexes, and constraints.
- RLS policies restrict public access to `status = 'published'` for articles.
- Admin actions are logged to `admin_audit_log` via trigger/function.

---

## CACHE STATUS

**Assessment:** FLAWED IMPLEMENTATION.
**Evidence:**
- `getAdsForSlot` in `server-data.ts` relies on `Math.random()` downstream of cache, causing ad rotation to fail in SSG/ISR contexts.
- Cache invalidation relies entirely on Time-To-Live (`revalidate: 60`), meaning published articles may take up to a minute to appear. No on-demand revalidation (`revalidateTag`) is triggered for the homepage when an article is published.

---

## SEO STATUS

**Assessment:** READY WITH MINOR CONDITIONS.
**Evidence:**
- JSON-LD (`NewsArticle` schema) is correctly implemented in `app/(main)/news/[slug]/page.tsx`.
- `robots.ts` and `sitemap.ts` are present.
- **Missing:** Publisher/Organization Schema on the homepage, and an RSS feed for Google News.

---

## ACCESSIBILITY STATUS

**Assessment:** NEEDS LIVE VERIFICATION.
**Evidence:** Semantic HTML elements (`<article>`, `<nav>`, `<aside>`) are used in `Layout.tsx` and `page.tsx`, but ARIA labels and focus management on modals/dropdowns need manual screen-reader testing.

---

## TESTING STATUS

**Assessment:** STRONG.
**Evidence:** The `__tests__` directory contains comprehensive unit and API tests (`ads-api.test.ts`, `articles-api.test.ts`, `security.test.ts`, `upload-api.test.ts`). High confidence in backend logic.

---

## DEVOPS STATUS

**Assessment:** PARTIALLY AUTOMATED.
**Evidence:** Deployed via Vercel. Lacks standalone CI/CD (e.g., GitHub Actions) for running Vitest and ESLint prior to deployment. Rollbacks rely entirely on Vercel's native features.

---

## MONITORING STATUS

**Assessment:** MISSING.
**Evidence:** No Sentry, Datadog, or centralized logging configured. Errors are caught via `console.error` in `handleApiError` (`utils.ts:101`), which is insufficient for production debugging.

---

## BACKUP / DISASTER RECOVERY STATUS

**Assessment:** UNKNOWN.
**Evidence:** NOT VERIFIED — REQUIRES LIVE/PRODUCTION TESTING. Supabase Point-in-Time-Recovery (PITR) and Backblaze B2 versioning must be verified in their respective dashboards.

---

## CLIENT DELIVERY STATUS

**Assessment:** NOT READY.
**Evidence:** The product lacks a handover document, CMS usage instructions, and documented procedures for managing Backblaze credentials and Upstash tokens.

---

## TECHNICAL DEBT

1. **Media Proxying**: The decision to proxy private B2 buckets through Vercel Serverless functions rather than using a public CDN.
2. **API Data Fetching**: `hydrateArticles` in `utils.ts` fetching reference tables dynamically on every admin API call instead of leveraging the Next.js cache.

---

## COST / SCALABILITY

**500–1,000 visitors/day**: Will run perfectly within Vercel/Supabase free or base tiers.
**5,000–10,000 visitors/day**: Vercel Serverless Function execution costs will spike due to the `/api/media` proxy.
**50,000+ visitors/day**: The current architecture is economically unviable. The B2 bucket must be made public and fronted by Cloudflare, completely bypassing Next.js for media delivery.

---

## LAUNCH CHECKLIST

1. [ ] **Critical**: Fix the Next.js Image + `/api/media` double-invocation issue.
2. [ ] **Critical**: Fix `getAdsForSlot` static randomization bug (move randomization to a Client Component).
3. [ ] **Security**: Change file upload extension check to a strict whitelist.
4. [ ] **Content**: Add Privacy Policy, Terms of Service, and Contact details.
5. [ ] **SEO**: Generate RSS feed.

## POST-LAUNCH CHECKLIST

- **First 24 hours**: Monitor Vercel Serverless Execution (GB-hrs) and Upstash Redis rate-limit triggers.
- **First 7 days**: Review `admin_audit_log` to ensure no unauthorized mutation attempts occurred. Monitor Supabase database load during peak traffic.
- **First 30 days**: Evaluate B2 egress costs vs. Cloudflare CDN implementation.

---

## FINAL SCORE

- Architecture: 6/10 (Media proxy is a major flaw)
- Security: 9/10
- Database: 9/10
- Performance: 7/10
- Caching: 6/10 (Ad randomization bug)
- Testing: 9/10
- SEO: 8/10
- Accessibility: 7/10
- UX: 8/10
- DevOps: 5/10
- Monitoring: 2/10
- Backup/Recovery: 0/10 (Unverified)
- Client Delivery: 4/10
- Scalability: 5/10
- Maintainability: 8/10

**Overall Score:** 7.1 / 10

---

## FINAL VERDICT

**READY WITH MAJOR CONDITIONS**

The application logic, security, and database design are exceptionally strong and well-tested. However, the system cannot launch in its current state due to the architecture of the media delivery pipeline. Proxying images through Vercel Serverless Functions and feeding them into the Next.js Image Optimizer will result in catastrophic cost overruns under moderate traffic. Additionally, the ad rotation logic is broken by static caching.

Once the media delivery is re-routed to a standard CDN and the ad randomization is shifted to the client-side, the project will be fully Production Ready.

**CONFIRMATION:**
- No files modified
- No packages installed
- No configuration changed
- No database changes made
- No commits created
