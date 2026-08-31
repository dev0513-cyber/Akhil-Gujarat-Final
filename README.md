# Akhil Gujarat

Akhil Gujarat is a modern, high-performance Gujarati news portal. It includes a public-facing website optimized for SEO and Core Web Vitals, and a secure Admin CMS for managing articles, categories, cities, advertisements, e-papers, and media.

## 1. Project Overview

The project is divided into two primary parts:
* **Public Website:** Displays news articles, photo galleries, embedded videos, dynamic categories (like Trending, City-specific news), and a daily E-Paper reader.
* **Admin CMS:** A secure dashboard to manage content, taxonomies, upload e-papers, and manage slot-based advertisements.

## 2. Technology Stack

* **Framework:** Next.js 16.3.1 (App Router)
* **Frontend:** React 19.2, Tailwind CSS 4, Lucide React (icons)
* **Backend/Database:** Supabase (PostgreSQL) with Row Level Security (RLS)
* **Media Storage:** Backblaze B2 (S3-compatible API)
* **Image Processing:** `sharp` for server-side optimization
* **Rate Limiting:** Upstash Redis
* **Deployment:** Vercel

## 3. Architecture

* **Request Flow:** Browser → Vercel Edge/CDN → Next.js Server → Supabase (Data) & Backblaze B2 (Media).
* **Caching:** Heavy use of Next.js `unstable_cache` and Incremental Static Regeneration (ISR). Database queries are cached for 60 seconds (articles) or 1 hour (categories/cities). 
* **Media:** Uploaded to B2. Accessed via Next.js Proxy (`/api/media/[key]`) which generates secure 1-hour presigned URLs and caches the redirect at the edge.
* **Authentication:** Handled natively by Supabase Auth (JWT). Admin routes (`/admin` and `/api/admin`) strictly verify the user's `admin` role and 24-hour session freshness.

## 4. Prerequisites

To run this project locally, you need:
* **Node.js:** v20.x or higher
* **npm:** v10.x or higher
* **Supabase Project:** A Supabase account and initialized project
* **Backblaze B2:** A B2 storage bucket and application keys
* **Upstash Redis:** A Redis database for rate limiting

## 5. Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd next-app
   ```

2. **Install dependencies:**
   ```bash
   npm ci
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env.local` and fill in the values (see section 6).

4. **Run Local Development Server:**
   ```bash
   npm run dev
   ```

5. **Production Build & Verification:**
   ```bash
   npm run build
   npm run lint
   npm exec --no-install -- tsc --noEmit
   npm test
   ```

## 6. Environment Variables

Create a `.env.local` file. **Never expose the `SUPABASE_SERVICE_ROLE_KEY` to the browser.**

| Variable | Required | Purpose | Where to obtain |
| -------- | -------- | ------- | --------------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Connect to Supabase | Supabase Project > API Settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public Supabase access | Supabase Project > API Settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin API overrides (Server ONLY) | Supabase Project > API Settings |
| `UPSTASH_REDIS_REST_URL` | Yes | API Rate Limiting | Upstash Console |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | API Rate Limiting | Upstash Console |
| `B2_ENDPOINT` | Yes | S3-compatible API endpoint | Backblaze B2 Bucket Details |
| `B2_REGION` | Yes | B2 Region (e.g., `us-east-005`) | Backblaze B2 Console |
| `B2_ACCESS_KEY_ID` | Yes | B2 Application Key ID | Backblaze B2 App Keys |
| `B2_SECRET_ACCESS_KEY`| Yes | B2 Application Key | Backblaze B2 App Keys |
| `B2_BUCKET_NAME` | Yes | B2 Bucket Name | Backblaze B2 Console |

## 7. Supabase Setup

1. Create a new Supabase project.
2. In the SQL Editor, execute the schema provided in `database/schema.sql`. This sets up:
   * Tables: `articles`, `categories`, `cities`, `ads`, `epapers`, `admin_audit_log`
   * Triggers for `updated_at`
   * Row Level Security (RLS) policies allowing public read (for published items) and restricting mutations to `admin` roles.
   * GIN indexes for fast Gujarati text searching.
3. **Authentication:** Ensure Email/Password auth is enabled. To make a user an admin, you must update their `app_metadata` to include `{"role": "admin"}`.

## 8. Backblaze B2 Setup

1. Create a B2 bucket. Set the bucket privacy to **Private** (the Next.js server proxies and securely signs URLs).
2. Go to **Application Keys** and add a new App Key restricted to this bucket.
3. Use the S3 Endpoint, Key ID, and Application Key in your `.env.local` file.
4. All images and PDFs uploaded via the CMS are automatically validated and sent to this bucket.

## 9. Redis / Upstash Setup

Upstash Redis is used strictly for **API Rate Limiting** to prevent abuse (e.g., brute force on auth, spamming search endpoints, or flooding uploads).
* Configure the Upstash URL and Token.
* The Next.js middleware automatically intercepts and limits requests based on IP.

## 10. Vercel Deployment

1. Import the Git repository in Vercel.
2. Ensure the Framework Preset is set to **Next.js**.
3. In **Environment Variables**, add all the variables listed in Section 6.
4. The Build command will default to `npm run build`.
5. Deploy.
6. Verify the deployment by accessing the live URL, navigating to `/admin/login`, and testing content retrieval.

## 11. Database Migration Procedure

When schema changes are needed:
1. Write the changes as a `.sql` file in `supabase/migrations/` (for reference) or apply them directly via the Supabase SQL editor using `database/schema.sql` as the master reference.
2. This project does not use a strictly automated migration tool in CI/CD; migrations are applied manually via the Supabase dashboard to prevent accidental production data loss.

## 12. Production Verification Checklist

Before announcing a launch, verify:
* [ ] **Homepage:** Loads fast, displays trending news, standard news, and advertisements.
* [ ] **Article Pages:** Correctly displays content, images, dates, and related articles.
* [ ] **Categories/Cities:** Navigating to a specific city/category correctly filters news.
* [ ] **Search:** Gujarati search correctly returns matches.
* [ ] **Admin Login:** Only authorized admins can access `/admin`.
* [ ] **Article CRUD:** Can create, edit, draft, publish, archive, and delete articles.
* [ ] **Advertisements:** Ads toggle active/inactive and display in the correct slots.
* [ ] **E-Paper:** Can upload a PDF, thumbnail is generated/uploaded, and can be read/downloaded publicly.
* [ ] **SEO:** `sitemap.xml` and `robots.txt` are accessible and valid.
* [ ] **Mobile:** Layout scales correctly on phones and tablets.

## 13. Backup / Operational Notes

* **Database Backups:** Managed automatically by Supabase Point-in-Time Recovery (PITR) depending on your Supabase plan.
* **Media Backups:** Backblaze B2 data is highly durable, but bucket replication is recommended if absolute redundancy is required.

## 14. Troubleshooting

* **Images/PDFs failing to upload (Status 413 or 415):** The system restricts files to 3MB maximum and enforces strict MIME/binary signature checks. Ensure the file is a valid image or PDF.
* **Admin Login Redirecting immediately:** Admin sessions enforce a strict 24-hour limit. If the session expires, you must log in again.
* **Changes not showing on the live site:** Next.js aggressively caches data for 60 seconds to 1 hour. It may take up to 60 seconds for article changes to reflect.
* **Search not finding results:** Ensure the `pg_trgm` extension is enabled in Supabase (handled in `schema.sql`).
