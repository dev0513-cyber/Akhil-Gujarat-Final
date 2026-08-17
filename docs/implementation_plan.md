# Technical Audit & Migration Report

## A. CURRENT ARCHITECTURE
The current architecture is a highly fragmented Next.js hybrid app:
* **Routing**: Uses the Next.js `app/` router (`app/(main)` and `app/(admin)`), but the route files (`page.tsx`) act as empty wrappers that import traditional React components from `src/pages/`.
* **Rendering**: Because `src/pages/*` use `"use client"`, almost the entire application renders as a Single Page Application (Client-Side Rendering), defeating Next.js App Router's primary benefits.
* **APIs**: Backend logic lives in the legacy `pages/api/` directory using vanilla JavaScript (`.js`), while the frontend uses TypeScript. 
* **Authentication**: Managed via Supabase Auth. The frontend reads the local JWT session, passes it as a Bearer token to `pages/api/*`, where `auth-helper.js` verifies it using `supabase.auth.getUser()`.
* **Database Access**: API endpoints interface with Supabase using `db-client.js`. Critically, this client is initialized with the `SUPABASE_SERVICE_ROLE_KEY`, which bypasses Row Level Security (RLS) entirely.
* **Storage**: File uploads are handled via `pages/api/upload.js`, which receives files converted to Base64 strings by the frontend, decodes them to buffers on the Node server, and uploads them to a Supabase bucket (`news-media`).

## B. SECURITY RISKS
* **Service-Role Key Exposure Risks**: Using the service-role key in `db-client.js` is extremely dangerous if the API endpoints lack bulletproof validation. A vulnerability in an endpoint immediately grants complete, unrestricted database access.
* **Missing Authorization**: While `requireAdmin` checks if a valid token exists, there doesn't appear to be strict Role-Based Access Control (RBAC) ensuring the user is specifically an *admin* (as opposed to any authenticated user, if public signup is ever enabled).
* **Missing RLS**: Because the service-role key is used, Postgres RLS is entirely bypassed and effectively useless.
* **File Upload Vulnerabilities**: `upload.js` accepts Base64 strings. There is minimal MIME-type validation (`contentType || 'image/jpeg'`). An attacker could upload a malicious payload (e.g., HTML/JS disguised as an image) which could lead to XSS if served directly from the same domain.
* **Missing Input Validation**: Database insertion endpoints (e.g., `articles.js`) do not use robust validation libraries (like Zod) to sanitize HTML content, trusting the client's Rich Text Editor HTML completely, leading to XSS risks.
* **Missing Rate Limiting**: The API endpoints (`pages/api/*`) have no request throttling, leaving the database vulnerable to simple Denial of Service (DoS) or brute-force fetching.

## C. SEO RISKS
* **Client-Side Metadata**: `src/components/SEO.tsx` injects meta tags via `document.createElement`. While Googlebot executes JS, social media crawlers (Facebook, X, WhatsApp) do not. Link previews will break or show default site info instead of the specific news article.
* **Missing generateMetadata**: The Next.js App Router's native `generateMetadata` function is not utilized at all.
* **Missing Canonical URLs**: Canonical URLs are injected late on the client-side, causing SEO bots to potentially read duplicate content warnings before JS hydration.
* **Structured Data**: JSON-LD is also injected client-side, risking non-indexing by less sophisticated crawlers.

## D. ARCHITECTURE RISKS
* **Duplicated Routing & src/pages Dependency**: Maintaining `src/pages` while using `app/` is an anti-pattern. Next.js 13+ App Router intends for pages to live directly in `app/`.
* **pages/api Dependency**: Mixing App Router with legacy `pages/api` limits edge caching capabilities and fragments the codebase.
* **Unnecessary Client Components**: Entire pages (like `Article.tsx`) are marked `"use client"`, forcing the browser to download unnecessary JavaScript.
* **Unnecessary useEffect Data Fetching**: Data is fetched client-side (loading spinners everywhere) instead of utilizing Next.js Server Components for instant, zero-layout-shift rendering.
* **TypeScript/JavaScript Boundary Problems**: The frontend assumes strict types (`ArticleType`), but the backend APIs are `.js` files without type guarantees, creating silent failure risks if schema structures change.

## E. PERFORMANCE RISKS
* **Base64 Uploads**: Converting large PDFs (E-Papers) or images to Base64 on the client increases payload size by ~33%, blocks the main thread, and causes high memory spikes on the Node server.
* **Unnecessary Client JavaScript**: Fetching markdown/HTML content on the client instead of the server inflates the bundle size.
* **Duplicate API Requests**: Lacking a caching layer (like React Query or Next.js `fetch` cache), navigating tabs triggers identical heavy API calls repeatedly.

## F. DATABASE RISKS
* **RLS Bypassed**: As noted, the service-role key defeats the purpose of Supabase RLS.
* **Relationships**: While `category_id` and `city_id` exist, the backend hydration (`hydrateArticles` in `auth-helper.js`) manually stitches related records via `Promise.all` instead of utilizing Supabase's native Foreign Key joins (`select('*, category(*), city(*)')`). This results in multiple inefficient database queries.
* **Duplicate Data**: No unique constraints evident on fields like `slug`, potentially allowing routing collisions.

## G. TESTING RISKS
* **Missing Unit Tests**: No Jest, Vitest, or React Testing Library implementation is present.
* **Missing API Tests**: API endpoints (`pages/api`) lack automated integration testing.
* **Missing SEO Tests**: No automated checks to ensure `generateMetadata` (when implemented) returns the correct Open Graph tags.
* **Missing Upload Tests**: No coverage for the dangerous Base64 upload logic.

## H. MIGRATION PLAN

> [!WARNING]
> DO NOT IMPLEMENT ANY CHANGES YET. Wait for the user's explicit authorization for Phase 1.

* **Phase 1: Security** (Move away from service-role key, implement RLS, strict API validation via Zod).
* **Phase 2: SEO** (Migrate `SEO.tsx` client logic to `generateMetadata` inside `app/` route wrappers).
* **Phase 3: Upload system** (Replace Base64 with direct Supabase Storage multipart uploads).
* **Phase 4: API migration** (Convert `pages/api/*.js` to App Router `app/api/*/route.ts` with strict TypeScript typing).
* **Phase 5: Server Component migration** (Remove `"use client"` where possible, move data fetching to the server).
* **Phase 6: Data fetching/caching** (Utilize Next.js `fetch` caching and revalidation).
* **Phase 7: Validation and rate limiting** (Implement Upstash or Next.js rate limiting headers).
* **Phase 8: Performance** (Optimize images, remove unnecessary useEffects).
* **Phase 9: Testing** (Implement basic E2E and unit testing).
* **Phase 10: Production deployment/monitoring** (Finalize production environment variables and monitoring).

---

### End of Report Deliverables

**1. Concise list of files needing eventual modification:**
- `app/(main)/*/page.tsx` (all frontend route wrappers)
- `src/pages/*.tsx` (all client components)
- `pages/api/*.js` (all backend endpoints)
- `src/components/SEO.tsx` (to be deprecated/removed)
- `src/lib/api.ts` (data fetching functions)

**2. Dangerous/high-risk files:**
- `pages/api/db-client.js` (Exposes Service Role Key to all API endpoints)
- `pages/api/upload.js` (Accepts unsanitized Base64 payloads)
- `pages/api/auth-helper.js` (Manual relationship stitching, weak auth checks)

**3. Dependencies that should NOT be removed:**
- `@supabase/supabase-js` (Core database driver)
- `tailwindcss`, `lucide-react`, `framer-motion` (Core UI functionality)
- `next`, `react`, `react-dom` (Framework foundation)

**4. Exact Recommendations for Phase 1 (Security):**
- Remove `SUPABASE_SERVICE_ROLE_KEY` from `db-client.js`. Replace it with the standard `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Enable Postgres Row Level Security (RLS) on the Supabase dashboard for `articles`, `categories`, `cities`, `epapers`, and `pages`. Write strict policies allowing `SELECT` for public, and `INSERT/UPDATE/DELETE` only for authenticated admin UUIDs.
- Introduce `zod` for request body validation inside the `pages/api` routes to prevent malicious data injection before saving to the database.

**5. STOP AND WAIT FOR INSTRUCTION.**
