# Akhil Gujarat — Project Documentation

## 1. Technology Stack
* Next.js 16 (App Router, Turbopack)
* React
* TypeScript
* Tailwind CSS v4
* Supabase
* PostgreSQL
* Vercel
* Backblaze B2
* Upstash (Redis for edge rate limiting)

## 2. Project Architecture
Request / Data Flow:
Browser → Vercel / Edge → Middleware (Auth & Rate Limit) → Next.js App Router → Server Components/API Layer → Next.js Data Cache → Supabase (PostgreSQL)

Directory Structure:
* `app/`: Next.js App Router (Public routes in `(main)`, Admin routes in `(admin)`, APIs in `api/`)
* `src/`: Reusable React components and lib utilities (API clients, formatting, B2 helpers).
* `scripts/`: Operational diagnostic tools and development seeders.
* `supabase/`: Database schema migrations and RLS configuration.
* `public/`: Static public assets (images, fonts).
* `__tests__/`: Vitest test suites.

## 3. Application Structure
* **Public website**: Renders dynamic news articles, taxomony pages (categories/cities), search functionality, and historical e-papers.
* **Admin CMS**: Protected interface at `/admin` for editorial workflow.
* **API routes**: Backend serverless functions in `app/api/` providing strict Zod-validated mutations.
* **Authentication**: Powered by Supabase SSR with secure HttpOnly cookies.
* **Authorization/RBAC**: Handled via `raw_app_meta_data` (`role="admin"`).
* **Articles/Categories/Cities**: Core hierarchical taxonomy for news content.
* **Ads**: Injection slots for banner/skyscraper advertisements.
* **E-papers**: Digital PDF publishing system.
* **Pages**: Static informative pages (About, Contact).
* **Search**: Real-time Supabase text-search querying.
* **Media**: Proxied image delivery via `/api/media/[key]`.
* **Sharing & SEO/metadata**: Dynamic server-side Metadata generation for rich Open Graph/Twitter previews.

## 4. Database
* **Important tables**: `articles`, `categories`, `cities`, `ads`, `epapers`, `static_pages`, `site_settings`.
* **Relationships**: `articles` are bound to `categories` and `cities`.
* **RLS**: Row-Level Security restricts public access to published rows. Admin mutations bypass or satisfy RLS via authenticated sessions.
* **Important indexes**: B-Tree indexes on `slug`, `status`, and `published_at` for lightning-fast querying. Full-text search vectors on article titles.
* **Migrations**: Executed linearly from `supabase/migrations/`.
* **Rules for modifying the schema**: Never edit production schema manually; always create a new `.sql` migration file and test locally before deploying.

## 5. Caching & Performance
* **unstable_cache / Data Cache**: Articles, E-papers, and Ads are aggressively cached on the Next.js server.
* **Cache tags**: Tagging taxonomy allows granular invalidation (`articles`, `ads`, `epapers`).
* **revalidateTag**: Called by the Admin CMS during mutations to instantly invalidate outdated cache segments.
* **Cached vs uncached routes**: Search is dynamically rendered and uncached. Article reads are cached.
* **Media caching**: `/api/media/[key]` explicitly passes long-lived `Cache-Control` headers (Vercel Edge cache).
* **Performance rules**: Do NOT remove `revalidateTag` calls from API routes, or the live site will serve stale data.

## 6. Backblaze B2 / Media
* **Bucket purpose**: Stores all original image and PDF uploads privately (`akhil-gujarat-media`).
* **Upload flow**: Next.js API securely streams `FormData` to the B2 bucket.
* **Media proxy**: Next.js `/api/media/[key]` proxy acts as the secure interface between public users and the private bucket.
* **Security rules**: Do NOT make the bucket public. Access must flow through the Next.js API for rate limiting and cache control.

## 7. Authentication & Security
* **Supabase Auth**: JWT-based session management (`@supabase/ssr`).
* **Admin authentication**: Only users with an `admin` role can access the CMS.
* **RLS**: Strict PostgreSQL Row-Level Security prevents unauthorized modifications.
* **CSRF protection**: Edge middleware checks Origins/Referers for mutations.
* **Rate limiting**: Upstash Redis limits API abuse at the Edge.
* **Service-role key handling**: `SUPABASE_SERVICE_ROLE_KEY` is strictly confined to server-side Node.js environments.
* **SECURITY RULE**: Never commit secrets, tokens, passwords, service-role keys, or `.env.local`.

## 8. Admin CMS
* **Workflow**: Editors login at `/admin/login`, manage content across dedicated tabs (Articles, E-Papers, Ads, etc.), and publish.
* **Cache invalidation**: Every publish, update, or delete action makes a backend request to revalidate the exact cache tags associated with that content, ensuring zero delay in live-site updates.

## 9. Deployment
* **Build steps**:
  ```bash
  npm install
  npm run lint
  npx tsc --noEmit
  npm test
  npm run build
  ```
* **Deployment flow**: The `main` branch deploys automatically to Vercel upon git push.
* **Required Environment Variables** (Names ONLY): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `B2_ENDPOINT`, `B2_REGION`, `B2_ACCESS_KEY_ID`, `B2_SECRET_ACCESS_KEY`, `B2_BUCKET_NAME`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

## 10. Database Deployment
* **Migrations**: Applied via Supabase CLI (`supabase db push`) or the dashboard.
* **Indexes**: Declared within migration files.
* **Verification**: Verify that RLS policies cover any new tables.

## 11. Testing & Validation
* **lint**: `eslint` enforces Next.js strict Core Web Vitals rules.
* **TypeScript**: Strict compilation.
* **tests**: Vitest runs extensive API and security validations.
* **Production verification**: Vercel handles staging previews before merging.

## 12. Operational Scripts
* `scripts/detect-orphans.mjs`: Safe. Identifies unlinked B2 media.
* `scripts/inspect-db.mjs`: Safe. Read-only schema inspector.
* `scripts/verify_rls.mjs`: Safe. Tests RLS logic.
* `scripts/seed.mjs`: **DESTRUCTIVE**. NEVER run against production.

## 13. Environment Variables
| Variable | Purpose | Required | Secret |
| -------- | ------- | -------- | ------ |
| `NEXT_PUBLIC_SUPABASE_URL` | Connects to Supabase | Yes | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public DB access | Yes | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin DB override | Yes | **Yes** |
| `B2_ENDPOINT` | Media storage URL | Yes | No |
| `B2_REGION` | Media storage region | Yes | No |
| `B2_ACCESS_KEY_ID` | Storage access ID | Yes | **Yes** |
| `B2_SECRET_ACCESS_KEY` | Storage secret key | Yes | **Yes** |
| `B2_BUCKET_NAME` | Storage bucket name | Yes | No |
| `UPSTASH_REDIS_REST_URL` | Edge rate limiting URL | Yes | No |
| `UPSTASH_REDIS_REST_TOKEN` | Edge rate limiting key | Yes | **Yes** |

## 14. Production Safety Rules
* Never run seed scripts against production.
* Never commit `.env.local`.
* Never expose Supabase service-role credentials.
* Never bypass RLS casually.
* Never remove cache invalidation without measuring the impact.
* Never remove database indexes without checking query plans.
* Never modify authentication/security infrastructure without regression testing.
* Never delete production media/data without explicit verification.

## 15. Troubleshooting
* **Ads not appearing**: Verify the Ad is marked "Active" in CMS and `revalidateTag` was called. Check Next.js Cache.
* **Media not loading**: Verify B2 Environment Variables are correctly supplied to the Vercel production environment.
* **Sharing/OG preview issues**: Ensure `generateMetadata` in `page.tsx` is correctly parsing the article data.
* **Authentication issues**: Confirm Supabase cookies are not blocked and the user has the `{"role":"admin"}` metadata in Supabase.
* **Deployment failures**: Verify Turbopack/Node memory limits aren't exceeded (Vercel builds rarely hit this, but local builds might).

## 16. Change-Safety Checklist
Before modifying production code:
* [ ] inspect dependencies
* [ ] understand cache impact
* [ ] understand DB query impact
* [ ] check authentication/RLS impact
* [ ] run tests
* [ ] run TypeScript
* [ ] run lint
* [ ] build
* [ ] review git diff
* [ ] verify production behavior
