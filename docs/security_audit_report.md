# SECURITY AUDIT RESULT

Overall: **NOT READY**

## Critical Findings

1. **Catastrophic RLS Privilege Escalation:** 
   The database RLS policies in `database/schema.sql` allow any user with the `authenticated` role to perform `INSERT`, `UPDATE`, and `DELETE` on all core tables (e.g., `articles`, `categories`, `epapers`). The policies fail to restrict mutations strictly to users where `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`. If public signups are ever enabled or if a JWT is otherwise obtained, an attacker can bypass the Next.js API completely and maliciously mutate the database.
   
2. **Public Exposure of Draft/Archived Content:**
   The `SELECT` policies for the `articles` table use `USING (true)`. While the Next.js API filters by `status = 'published'`, an attacker querying the Supabase API directly using the public `NEXT_PUBLIC_SUPABASE_ANON_KEY` can fetch all `draft` and `archived` articles.

3. **Complete Absence of Rate Limiting:**
   A file named `proxy.ts` exists in the repository root containing Upstash rate limiting logic. However, it is **never imported or executed** in `src/middleware.ts` or any API routes. The application has zero functional rate-limiting protection.

## High Findings

1. **Serverless Denial of Service / Crash Risk:**
   `app/api/upload/route.ts` attempts to log errors using `fs.appendFileSync('upload_error.log', ...)`. In a serverless or edge environment (like Vercel) where the filesystem is read-only, this will cause the API route to fatally crash whenever an upload error occurs.
   
2. **Internal API Error Leakage:**
   `app/api/utils.ts` contains a `handleApiError` function that falls back to `err.message` or raw stringification. This causes 500 API responses to leak raw internal stack traces and application structure details to the client instead of providing a sanitized error wrapper.

3. **Broken Upload API Pipeline:**
   The upload API utilizes a Backblaze B2 S3 Client (not Cloudflare R2). Automated unit tests expect a 201 success or a 413 "Too Large" but consistently fail with 500 internal errors and mismatched error strings (`File exceeds limit: 3MB`), indicating the integration is failing in the test/build environment.

## Medium Findings

1. **Leftover/Unsecured Scripts:**
   The repository root contains multiple untracked or leftover files: `test_upload.js`, `dump.txt`, `lint_output.txt`, and an empty `pages/api` directory from a previous routing structure.
   
2. **No Automated E-Paper Cleanup:**
   The business requirement of retaining E-papers for only 30 days relies solely on manual administrative deletion. No automated CRON tasks or database triggers exist to enforce this security/storage constraint.

## Low Findings

1. **Client-Side Navigation in Admin Auth:**
   `src/components/admin/Login.tsx` uses `window.location.href = '/admin'` upon successful login, bypassing the internal Next.js router.
2. **Synchronous setState inside useEffect:**
   Multiple admin components (e.g., `Categories.tsx`, `EPapers.tsx`) trigger cascading re-renders by calling `setState` inside `useEffect`, raising lint errors.

## Verified Security Controls

- **Authentication via Supabase SSR:** PASS. (Session properly maintained).
- **Admin RBAC Verification:** PASS. (`requireAdmin` correctly validates `user.app_metadata?.role !== 'admin'`).
- **Input Validation (Zod):** PARTIAL. (Most CRUD routes use Zod, but upload route manually validates and misses edge cases).
- **RLS Configuration:** FAIL. (Enabled, but improperly overly broad).
- **Rate Limiting:** FAIL. (Orphaned file, zero protection).

## Secret Exposure

**PASS**
Checked files: `.env.local`, `src/utils/supabase/server.ts`, and `next.config.ts`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is properly public.
- `SUPABASE_SERVICE_ROLE_KEY` is completely isolated to `.env.local` and `__tests__/setup.ts` and is never leaked to client bundles via `NEXT_PUBLIC_` prefixes.

## API Security Matrix

| Route | Auth | Admin RBAC | Validation | Rate Limit | Result |
|------|------|------------|------------|------------|--------|
| `/api/articles` (GET) | None | None | None | **FAIL** | PASS |
| `/api/articles` (Mutations) | Yes | Yes | Zod | **FAIL** | PASS |
| `/api/categories` | Yes | Yes | Zod | **FAIL** | PASS |
| `/api/cities` | Yes | Yes | Zod | **FAIL** | PASS |
| `/api/epapers` | Yes | Yes | Zod | **FAIL** | PASS |
| `/api/pages` | Yes | Yes | Zod | **FAIL** | PASS |
| `/api/settings` | Yes | Yes | Custom | **FAIL** | PASS |
| `/api/upload` | Yes | Yes | Custom | **FAIL** | **FAIL** (`fs` crash) |

## Database Security

| Table | RLS Enabled | Read Policy | Mutation Policy | Conclusion |
|-------|-------------|-------------|-----------------|------------|
| `articles` | Yes | `USING (true)` | `TO authenticated` | **FAIL:** Exposes drafts; allows any authenticated user to mutate. |
| `categories` | Yes | `USING (true)` | `TO authenticated` | **FAIL:** Allows any authenticated user to mutate. |
| `cities` | Yes | `USING (true)` | `TO authenticated` | **FAIL:** Allows any authenticated user to mutate. |
| `epapers` | Yes | `USING (true)` | `TO authenticated` | **FAIL:** Allows any authenticated user to mutate. |
| `static_pages` | Yes | `USING (true)` | `TO authenticated` | **FAIL:** Allows any authenticated user to mutate. |
| `site_settings`| Yes | `USING (true)` | `TO authenticated` | **FAIL:** Allows any authenticated user to mutate. |

## Upload Security

**FAIL**
- **Evidence:** `app/api/upload/route.ts` line 78 calls `fs.appendFileSync('upload_error.log', ...)`. Vercel serverless environments are read-only. Upload errors will crash the entire function.
- **Evidence:** The media proxies via `/api/media/[key]` returning an AWS SDK stream. This routes all binary blobs through the Next.js server, significantly driving up serverless execution time/bandwidth costs instead of using direct signed URLs or a CDN.

## Dependency Security

**PASS**
- Ran `npm audit`.
- **Result:** `found 0 vulnerabilities`.
- (Note: `pdfjs-dist` is present in `package.json` but unused in the source codebase).

## Tests Actually Executed

1. `npm run test`
   - **Result:** **FAIL**. 
   - 17 tests executed. 11 failed. (Primarily failing due to `Error: cookies was called outside a request scope` in the mock setup, and upload test assertion mismatches).
2. `npm run build`
   - **Result:** **FAIL**. (`Error: failed to canonicalize path`).
3. `npx tsc --noEmit`
   - **Result:** **FAIL**. (TS2307 Cannot find module `dotenv`; multiple `Unexpected any` lint warnings treated as errors).
4. `npm run lint`
   - **Result:** **FAIL**. (4 errors, 23 warnings).
5. `npm audit`
   - **Result:** **PASS**. (0 vulnerabilities).

## False Claims / Previous Audit Errors

1. **FALSE CLAIM:** *RLS is enabled and verified.*
   - **TRUTH:** It is *enabled*, but not *verified* as secure. The policies are fundamentally broken, granting mutation access to all authenticated accounts instead of specifically validating the `admin` role.
2. **FALSE CLAIM:** *Rate limiting exists.*
   - **TRUTH:** A script (`proxy.ts`) exists, but it is never utilized or wired into the active `middleware.ts`.
3. **FALSE CLAIM:** *Media upload security exists.*
   - **TRUTH:** Fails tests entirely, relies on broken synchronous `fs` methods, and limits are misaligned.

## Remaining Risks

- **Direct Supabase Access:** An attacker familiar with Supabase architecture can extract the `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the client and perform REST queries against `articles` to extract all draft, archived, and unpublished articles due to the `USING (true)` RLS policy.
- **Account Creation Vectors:** If an attacker can successfully forge or create an authenticated session, the database currently allows them to drop, modify, or insert articles via the Supabase API directly because RLS lacks a strict `role = admin` condition.
