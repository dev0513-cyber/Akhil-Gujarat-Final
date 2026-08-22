# Supabase Dashboard Security Settings

Apply these settings in **Supabase Dashboard → Authentication → Settings**

## JWT & Session Settings

| Setting | Recommended Value | Why |
|---------|------------------|-----|
| **JWT Expiry (access token)** | `15m` (900 seconds) | Shorter tokens = less exposure if stolen. Refresh token handles seamless renewal. |
| **Refresh Token Reuse Interval** | `30s` | Prevents token replay attacks. |
| **Enable Refresh Token Rotation** | ✅ ON | Each refresh generates a new token; old one invalidated. |
| **OTP Expiry** | `5m` | Shorter OTP window for login flows. |

## MFA Settings

| Setting | Recommended Value | Why |
|---------|------------------|-----|
| **MFA Enabled** | ✅ ON | Required for admin (your code enforces this via `requireAdmin`). |
| **Enrollment Required** | Optional | You can enforce at app level; keep optional for flexibility. |

## Rate Limiting (Auth)

| Setting | Recommended Value |
|---------|------------------|
| **Rate Limit - Auth** | `10 req/min` per IP |
| **Rate Limit - OTP** | `5 req/min` per IP |

## Password Policy

| Setting | Recommended Value |
|---------|------------------|
| **Min Password Length** | `12` |
| **Require Uppercase** | ✅ |
| **Require Lowercase** | ✅ |
| **Require Numbers** | ✅ |
| **Require Special Chars** | ✅ |

## Email Settings

| Setting | Recommended Value |
|---------|------------------|
| **Confirm Email** | ✅ ON |
| **Secure Email Change** | ✅ ON |
| **Enable Email Notifications** | ✅ ON (for security alerts) |

## Security Headers (via your middleware - already configured)

Your `src/middleware.ts` already sets:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: ...`

## Environment Variables Required

```env
# Already in your project
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Session revocation: use Management API (preferred) OR service role (fallback)
# ---- Management API (recommended - no service role key needed) ----
SUPABASE_PROJECT_REF=                 # Your Supabase project ref (from dashboard URL)
SUPABASE_ACCESS_TOKEN=                # Personal Access Token from Supabase Dashboard → Settings → Access Tokens

# ---- Fallback only if Management API not configured ----
SUPABASE_SERVICE_ROLE_KEY=            # Only used as fallback; prefer Management API above

UPSTASH_REDIS_REST_URL=               # Rate limiting (optional but recommended)
UPSTASH_REDIS_REST_TOKEN=
B2_ENDPOINT=
B2_REGION=
B2_ACCESS_KEY_ID=
B2_SECRET_ACCESS_KEY=
B2_BUCKET_NAME=
```

## How Session Revocation Works (No Long-Lived Service Role Key)

**Preferred: Management API with Short-Lived Admin Token**
1. Admin calls `/api/admin/revoke-sessions` (protected by admin + MFA + CSRF)
2. Server calls Supabase Management API `/admin/token` with `SUPABASE_ACCESS_TOKEN` (your PAT)
3. Returns a **short-lived JWT (1 hour)** scoped to admin operations
4. Server calls `/auth/admin/users/{userId}/signout` with that JWT
5. Target user's sessions revoked immediately

**Fallback: Service Role Key** (only if Management API env vars missing)
- Same as before, but uses `SUPABASE_SERVICE_ROLE_KEY`
- Logged warning when fallback used

## Setup Management API Access

1. **Get Project Ref**: Supabase Dashboard → Project Settings → General → Reference ID
2. **Create Personal Access Token**: Supabase Dashboard → Settings → Access Tokens → "Generate new token"
   - Name: "Admin Session Revocation"
   - Expiry: 1 year (rotate annually)
   - Scopes: `admin` (minimum needed)
3. **Add to env**: `SUPABASE_PROJECT_REF` + `SUPABASE_ACCESS_TOKEN`
4. **Remove/rotate** `SUPABASE_SERVICE_ROLE_KEY` from this project (keep only for other services that need it)

## SQL Scripts to Run (in order)

1. `supabase/admin_audit_log.sql` - Creates audit log table
2. `supabase/fix_rls_policies.sql` - Hardens RLS on all tables
3. `supabase/ads_frame_migration.sql` - Adds `frame` column to ads (from ads v2 feature)

## Verification Checklist

After applying all settings and running SQL:

- [ ] Login as admin → verify MFA prompt if enrolled but not verified
- [ ] Login as non-admin → verify `/admin/*` redirects to `/admin/login`
- [ ] Test CSRF: try POST to `/api/articles` without `x-csrf-token` header → should return 403
- [ ] Test idle timeout: wait 15 min in admin → should auto-logout
- [ ] Test session revocation: call `/api/admin/revoke-sessions` with userId → user should be logged out
- [ ] Check audit log: perform admin actions → verify rows in `admin_audit_log`
- [ ] Test RLS: non-admin user tries to insert into `articles` → should fail
- [ ] Verify security headers on all responses (use browser dev tools Network tab)

## Notes

- **Refresh token rotation** + **short JWT** = user must re-auth after ~15 min of inactivity (if idle timeout doesn't catch them first)
- **Service role key** is sensitive — only use in server-side code (your revocation endpoint)
- **Rate limiting** in middleware requires Upstash Redis env vars; fails open if unavailable
- **CSRF token** is stored in HttpOnly cookie; client fetches via `/api/csrf` and sends in `x-csrf-token` header