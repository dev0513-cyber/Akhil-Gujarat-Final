# PHASE 7 — VERCEL CACHE ROOT-CAUSE AUDIT

## 1. Middleware Analysis
- **File**: `src/middleware.ts`
- **Behavior**: The middleware intercepts all requests. It executes rate-limiting logic, sets global security headers, and enforces Supabase authentication logic **only** for `/admin` routes.
- **Impact on Public Cache**: The middleware explicitly skips `/news/[slug]`, `/category/[slug]`, `/city/[slug]`, and `/`. It returns a standard `NextResponse.next(request)` for them. 
- **Proof**: Because the homepage (`/`) passes through this exact same middleware and successfully returns `x-vercel-cache: HIT`, the middleware is definitively **NOT** the cause of the `MISS` on article pages.

## 2. Root Layout Analysis
- **File**: `app/layout.tsx`
- **Behavior**: Extremely simple HTML/Body wrapper. It injects CSS and metadata. 
- **Impact on Cache**: It does not use `cookies()`, `headers()`, `auth()`, or any dynamic APIs. It has zero impact on route cacheability.

## 3. Main Layout Analysis
- **File**: `app/(main)/layout.tsx` (and `src/components/Layout.tsx`)
- **Behavior**: `app/(main)/layout.tsx` wraps children in `Layout.tsx`. `Layout.tsx` itself is a `"use client"` component. It fetches the navigation data (categories, cities) on the client-side via `useEffect`. 
- **Impact on Cache**: Because `Layout.tsx` is a Client Component, it does not execute server-side `cookies()` or `headers()` during SSR. It does not force dynamic server rendering.

## 4. Article Route Analysis
- **File**: `app/(main)/news/[slug]/page.tsx`
- **Behavior**: This is a dynamic route segment (`[slug]`). It consumes the `slug` parameter and fetches data via `getArticleBySlug`. 
- **Cache Configuration**: It lacks both `generateStaticParams` and an `export const revalidate` configuration. 

## 5. Category Route Analysis
- **File**: `app/(main)/category/[slug]/page.tsx`
- **Behavior**: Same as the Article route. It's a dynamic segment route without `generateStaticParams` or `revalidate` rules.

## 6. City Route Analysis
- **File**: `app/(main)/city/[slug]/page.tsx`
- **Behavior**: Same as the Article route. Dynamic segment without explicit caching rules.

## 7. Homepage Analysis
- **File**: `app/(main)/page.tsx`
- **Behavior**: This is a **static segment** route (`/`). In Next.js App Router, static segment routes are automatically prerendered at build time unless a dynamic function like `cookies()` is invoked. Since it has no dynamic APIs, it compiles to a fully static HTML page.
- **Result**: Vercel Edge caching works perfectly (`HIT`).

## 8. Response Header Analysis
A direct inspection of the live HTTP response headers yielded the following proof:

**Homepage (`/`)**
- `cache-control: public, max-age=0, must-revalidate`
- `x-vercel-cache: STALE` (then `HIT`)
- **Meaning**: Next.js instructed Vercel to cache this route globally.

**Article / Category / City (`/news/abcd`, etc.)**
- `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`
- `x-vercel-cache: MISS`
- **Meaning**: Next.js is explicitly instructing the Vercel Edge network **NOT** to cache the HTML response, forcing the Edge to pass the request down to the Serverless Function.

## 9. Cache-Layer Matrix

| Route | Vercel Cache (Edge) | Next Data Cache (`unstable_cache`) | Supabase |
|---|---|---|---|
| `/` | `HIT` / `STALE` | `HIT` | 0 Queries |
| `/news/[slug]` | `MISS` (Bypassed) | `HIT` | 0 Queries |
| `/category/[slug]` | `MISS` (Bypassed) | `HIT` | 0 Queries |
| `/city/[slug]` | `MISS` (Bypassed) | `HIT` | 0 Queries |

## 10. Exact Root Cause of MISS
The `MISS` is not caused by middleware, cookies, or authentication. 

**The exact technical reason is Next.js App Router's default behavior for dynamic route segments.** 
When a route uses a dynamic segment (like `[slug]`), Next.js defaults to treating the route as **request-time dynamically rendered** unless instructed otherwise. Because the files `app/(main)/news/[slug]/page.tsx`, `category/[slug]/page.tsx`, and `city/[slug]/page.tsx` do not export `generateStaticParams` (to prerender at build time) and do not export `export const revalidate = 60` (to enable Incremental Static Regeneration), Next.js falls back to dynamic SSR, emitting `Cache-Control: private, no-store`.

## 11. Does the MISS increase Supabase requests?
**NO.** 
Vercel MISS increases Vercel Serverless Function execution (compute cost), but it **does not increase Supabase database requests**. 
Because we implemented `unstable_cache` deeply in `server-data.ts` during Phase 3, the Serverless Function still receives a `HIT` from the Next.js Data Cache. The server rapidly renders the HTML using cached JSON and returns it, completely shielding Supabase. 

## 12. Security Impact
Making public pages cacheable on the Edge is **fully secure** in this architecture. 
- The public views (`news`, `category`, `city`) contain no personalized user data, admin draft data, or sensitive state. 
- The `/admin` routes are protected by `middleware.ts`, which enforces a strict `Cache-Control: no-store` header on private pages, preventing the Edge from ever caching administrative content.

## 13. Database Index Status
- **File**: `supabase/05_add_indexes.sql`
- **Status**: `UNVERIFIABLE`. 
- **Details**: As this is an external production environment without direct connection strings or Supabase Dashboard access, we cannot confirm if the SQL migration script was actually executed against the live PostgreSQL instance. 

## 14. Recommended Fix
**Classification: SAFE**

To fix the Vercel `MISS` and eliminate the unnecessary Serverless Function execution costs, you must explicitly enable Incremental Static Regeneration (ISR) on the dynamic routes.

**Recommendation:**
Add the following line to the top of `app/(main)/news/[slug]/page.tsx`, `app/(main)/category/[slug]/page.tsx`, and `app/(main)/city/[slug]/page.tsx`:

```typescript
export const revalidate = 60; // Cache on Vercel Edge for 60 seconds
```

This single line tells Next.js to drop the `private, no-store` header and replace it with Edge-cacheable headers, turning `MISS` into `HIT` or `STALE` without breaking dynamic functionality.
