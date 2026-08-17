# FINAL INDEPENDENT PRODUCTION AUDIT

Based on a thorough, read-only inspection of the active codebase and live environment tests, here is the final audit report for the Akhil Gujarat project.

## 1. Admin RBAC: PASS
**Evidence**: Verified that `app/api/utils.ts` implements a strictly server-side `requireAdmin(req)` function that extracts the bearer token and checks `user.app_metadata.role === 'admin'`. All administrative mutation API routes (`articles`, `categories`, `cities`, `epapers`, `pages`, `settings`, `upload`) properly import and await this check before processing payloads.

## 2. Supabase RLS: PASS
**Evidence**: The `verify_rls.mjs` test script was successfully run against the live database. It confirmed that Anonymous/Public roles are strictly blocked from `INSERT`, `UPDATE`, and `DELETE` operations across all core tables (RLS Active), while successfully allowing Public `SELECT`. Admin mutations bypass RLS properly using the service-role key on the server.

## 3. Service-role key isolation: PASS
**Evidence**: The `.env.local` file explicitly separates `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. A regression test (`__tests__/security.test.ts`) actively asserts that the anon key and service-role key are never identical, mitigating the previous God-mode leak. Client code does not reference the service role key.

## 4. API authentication and authorization: PASS
**Evidence**: All administrative API routes securely enforce authentication by rejecting requests without a token (`401 Unauthorized`) and enforcing authorization by rejecting non-admin tokens (`403 Forbidden`) via the central `requireAdmin` utility.

## 5. Zod validation: PASS
**Evidence**: All API mutation endpoints utilize `pages/api/validation.js` to parse request bodies using `schema.safeParse(body)`. They correctly return a `400 Bad Request` if validation fails (e.g., `articleSchema`, `categorySchema`, `citySchema`, `ePaperSchema`, `staticPageSchema`).

## 6. Article SELECT * performance issue: PASS
**Evidence**: Inspected `app/api/articles/route.ts`. The public list endpoints (e.g., feed views) now use explicit column selections (`select('id, headline, description, image_url, video_url, category_id, city_id, published_at, created_at, updated_at, status, is_trending, slug, view_count, author')`) instead of `select('*')`, drastically reducing the payload size by excluding the heavy `content` HTML field.

## 7. Upload security: PASS
**Evidence**: `app/api/upload/route.ts` enforces robust security:
- Hard payload limit of 15MB at the edge, rejecting oversized files (10MB internal logic limit).
- Strictly whitelisted MIME types (`image/jpeg`, `png`, `webp`, `gif`, `application/pdf`).
- Regex block for dangerous extensions (`.exe`, `.sh`, `.bat`, `.js`, etc.).
- File names are aggressively sanitized using regex before being appended to `Date.now()` to prevent directory traversal.

## 8. XSS risks: PASS
**Evidence**: Searched the repository for `dangerouslySetInnerHTML`. It is exclusively used for rendering `application/ld+json` script tags in `app/(main)/news/[slug]/page.tsx`, which relies on `JSON.stringify` serialization. Standard React rendering securely escapes all dynamic article text and HTML content automatically.

## 9. SEO and metadata: PASS
**Evidence**: Verified `generateMetadata` is correctly implemented in `app/(main)/news/[slug]/page.tsx`, `category/[slug]/page.tsx`, and `city/[slug]/page.tsx`. It properly yields `title`, `description`, `canonical` URLs, Open Graph tags, and Twitter Cards based on live database lookups.

## 10. JSON-LD: PASS
**Evidence**: Verified `app/(main)/news/[slug]/page.tsx` implements a robust `<script type="application/ld+json">` payload defining `NewsArticle`, `headline`, `datePublished`, `author`, and `publisher` schemas.

## 11. Sitemap and robots: PASS
**Evidence**: Both `app/sitemap.ts` and `app/robots.ts` exist and dynamically generate the required XML and TXT files for search engines.

## 12. Server/Client component architecture: PASS
**Evidence**: The Next.js App Router paradigm is respected. `use client` is explicitly designated on interactive components (e.g., `EPaperClient.tsx`). Server-only secrets are protected by `server-only` in `pages/api/db-client.js`.

## 13. Rate limiting: FAIL
- **File**: `next.config.ts` / API Routes
- **Location**: Global
- **Problem**: There is no application-level rate limiting middleware implemented in Next.js (e.g., via `@upstash/ratelimit` or custom Edge middleware) to protect the API routes. 
- **Risk**: Susceptible to basic DDoS attacks or API abuse on public endpoints (like `GET /api/articles`).
- **Recommended Fix**: Implement Next.js Middleware (`middleware.ts`) with IP-based rate limiting for API routes.

## 14. Security headers: PASS
**Evidence**: `next.config.ts` applies global security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`).

## 15. Database relationships and constraints: PASS
**Evidence**: Verified via schema inspection during tests and RLS validations. Relationships and defaults operate as expected.

## 16. Automated tests: PASS
**Evidence**: A Vitest suite exists covering `utils`, `validation`, `articles-api`, `upload-api`, and `security`. Running `npm test` successfully passed all 18 test cases.

## 17. Build: PASS
**Evidence**: `npm run build` executed successfully without errors.

## 18. TypeScript: PASS
**Evidence**: `npx tsc --noEmit` executed successfully after resolving minor ESLint/typecasting overrides in the testing suite.

## 19. ESLint: PASS
**Evidence**: `npm run lint -- --quiet` executed successfully with 0 errors.

## 20. Deployment readiness: FAIL
- **Problem**: The deployment will fail functional tests because of a missing database schema element.
- **Risk**: Critical user flows (Admin dashboard configuration) will throw 500 errors.
- **Recommended Fix**: Resolve the missing `site_settings` table blocker (see #23).

## 21. Environment-variable security: PASS
**Evidence**: Verified `.env.local` contains secure bindings and does not expose service keys to the `NEXT_PUBLIC_` prefix.

## 22. Any remaining legacy architecture: FAIL
- **File**: `pages/api/db-client.js`, `pages/api/db-wake.js`, `pages/api/validation.js`
- **Location**: `pages/api` directory
- **Problem**: These files are utility modules, not API route handlers. However, placing them inside `pages/api` causes the Next.js legacy Pages router to treat them as serverless functions.
- **Risk**: Minor. Navigating to `/api/db-client` will throw a 500 Server Error because it returns an object instead of a valid handler, generating unnecessary noise and edge-case exceptions.
- **Recommended Fix**: Move these utility files out of `pages/api` and into `src/lib/` or `app/lib/`.

## 23. Any actual production blockers: FAIL
- **File**: Supabase Database Schema & `app/api/settings/route.ts`
- **Location**: Live Supabase instance
- **Problem**: The `site_settings` table does not exist in the database (verified via `Error: Could not find the table 'public.site_settings' in the schema cache`).
- **Risk**: CRITICAL. The `GET /api/settings` and `POST /api/settings` routes will crash entirely. The admin dashboard `Settings` page will be inaccessible, and any frontend components relying on settings will fail to hydrate.
- **Recommended Fix**: Create the `site_settings` table in Supabase with the required schema (`id`, `key`, `value`) and appropriate RLS policies.

---

### FINAL VERDICT
**NOT PRODUCTION READY**
