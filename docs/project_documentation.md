# Akhil Gujarat — Master Technical Architecture & Project Analysis

This document serves as the comprehensive master blueprint for the Akhil Gujarat Next.js application. It covers the technical stack, routing flow, database schemas, API mechanics, SEO, and—most importantly—a critical analysis of current architectural flaws and areas for improvement.

---

## 1. Project Architecture & Stack

The application uses a **hybrid Next.js architecture** spanning across multiple routing paradigms. 

### Technology Stack
- **Framework**: Next.js 16.3.1
- **UI / Frontend**: React 19, Tailwind CSS v4, Lucide React (Icons), Framer Motion (Animations)
- **Backend / Database**: Supabase (PostgreSQL) using `@supabase/supabase-js`
- **Language**: TypeScript (`.tsx`) for the frontend, but vanilla JavaScript (`.js`) for the backend APIs.

### Directory Flow & Routing Complexity
The project uses a non-standard, transitional Next.js structure combining three different paradigms:
1. **`app/` (Next.js App Router)**: Handles the actual route mapping (`app/(main)` for public pages, `app/(admin)` for dashboard). However, these routes are essentially just "wrappers".
2. **`src/pages/` (Client Components)**: The actual UI logic lives here (e.g., `src/pages/Article.tsx`). The `app/` routes simply import these and render them as `"use client"` components. This means the app acts primarily as a Single Page Application (SPA).
3. **`pages/api/` (Legacy API Routes)**: The backend API endpoints are written in traditional Next.js API Routes rather than the newer App Router Route Handlers (`app/api`).

---

## 2. Database Schemas & Data Layer

The backend uses Supabase. The database client (`pages/api/db-client.js`) uses the `SUPABASE_SERVICE_ROLE_KEY`. This is a master key that bypasses all Row Level Security (RLS) policies in PostgreSQL.

### Core Entities (`src/lib/types.ts`)

| Entity | Fields & Purpose |
|---|---|
| **Article** | `id`, `headline`, `description`, `content`, `image_url`, `extra_images` (array), `category_id`, `city_id`, `published_at`, `tags`, `source`, `video_url`, `status` (draft/published/archived), `view_count`, `author`, `seo_title`, `seo_description`. The main news object. |
| **Category** | `id`, `name_en`, `name_gu`, `slug`, `sort_order`, `description`. Used for top-level taxonomy (e.g., Gujarat, National, Sports). |
| **City** | `id`, `name_en`, `name_gu`, `slug`, `sort_order`. Used for geographical taxonomy (e.g., Ahmedabad, Surat). |
| **StaticPage** | `id`, `slug`, `title_gu`, `title_en`, `content`, `seo_title`, `seo_description`. For static content like "About Us", "Contact". |
| **EPaper** | `id`, `published_date`, `title`, `pdf_url`, `thumbnail_url`, `view_count`. For managing daily digital newspaper PDF uploads. |
| **SiteSetting** | `key`, `value`. Key-value store for global settings (Social links, contact email, logo overrides). |

---

## 3. API & Backend Flow

All backend interactions flow through `pages/api/*.js`. 
- **Read Operations**: Endpoints like `pages/api/articles.js` handle `GET` requests openly (or filtered by category/slug).
- **Write Operations**: `POST`, `PUT`, `DELETE` requests are protected by `pages/api/auth-helper.js`.
- **Authentication Flow**: When a frontend admin action occurs (e.g., deleting an article), `src/lib/api.ts` fetches the active Supabase JWT session and attaches it as a `Bearer` token. The `auth-helper.js` validates this token via `supabase.auth.getUser(token)` before allowing the database mutation.
- **File Uploads**: `pages/api/upload.js` receives Base64 encoded files, decodes them, and pushes them to a Supabase Storage bucket, returning the public URL.

---

## 4. Full SEO Mechanics

### The Admin Panel Side
1. When writing an Article or Page, the user inputs `seo_title` and `seo_description`.
2. These are optional. If left blank, they default to `NULL` in the database.

### The Frontend Side
1. **Dynamic Tag Injection (`SEO.tsx`)**: When a user navigates to an article, the React component mounts and executes `SEO.tsx`.
2. **Fallback Logic**: The component checks: *Did the admin provide an SEO title? If not, use the article headline.*
3. **DOM Manipulation**: It uses native JavaScript (`document.createElement`) to inject `<meta>` tags into the `<head>`.
   - Injects standard Meta Description.
   - Injects **Open Graph** (`og:title`, `og:image`) for Facebook/LinkedIn.
   - Injects **Twitter Cards** (`twitter:image`).
4. **Structured Data (JSON-LD)**: Injects `NewsArticle` JSON-LD schema into the `<head>` for Google Rich Snippets, detailing the publisher, author, and dates.
5. **XML Sitemap / Robots**: The API routes `pages/api/sitemap.js` and `pages/api/robots.js` dynamically generate valid XML and txt files for Google Search Console to index all dynamic news routes.

---

## 5. Critical Flaws & Required Improvements

Based on a thorough architectural review, the following areas require improvement to bring the project up to enterprise standards.

### 🔴 High Priority: SEO Social Preview Flaw (Client-Side Rendering)
**The Problem**: Because `SEO.tsx` injects Open Graph and Twitter meta tags via Client-Side JavaScript, search engines like Google will see them (Googlebot executes JS), but **social media crawlers (Facebook, WhatsApp, Twitter/X, Telegram) DO NOT execute JavaScript**. 
**The Impact**: If a user shares a news article link on WhatsApp or Facebook, the rich link preview (Thumbnail, Headline) will likely fail or show the generic site fallback, because the crawler reads the raw HTML before the JS injects the specific article's meta tags.
**The Fix**: Migrate the dynamic routes in `app/(main)/news/[slug]/page.tsx` to use Next.js Server-Side Metadata (`export async function generateMetadata`). This renders the meta tags on the server *before* sending it to the client, guaranteeing flawless social sharing.

### 🟡 Medium Priority: Architectural Fragmentation
**The Problem**: The app is split between `app/` (wrappers), `src/pages/` (React SPA components), and `pages/api/` (Backend JS).
**The Impact**: 
- It defeats the purpose of Next.js 14+ Server Components, resulting in larger JavaScript bundles sent to the user.
- It breaks TypeScript type safety across the network boundary since the API is written in vanilla JS.
**The Fix**: 
1. Convert `pages/api/*.js` to Next.js App Router Route Handlers (`app/api/*/route.ts`) and convert them to TypeScript.
2. Refactor `src/pages/*.tsx` to execute as Server Components natively within the `app/` directory, fetching data on the server rather than loading a blank page and spinning a loading wheel while the client fetches the data.

### 🟡 Medium Priority: Base64 File Uploads
**The Problem**: `uploadImage` in `src/lib/api.ts` converts large images and PDFs to Base64 strings to send them to `pages/api/upload.js`. 
**The Impact**: Base64 encoding increases file size by ~33%. Uploading a 5MB E-Paper PDF as a 6.6MB Base64 string blocks the main thread, uses massive memory, and slows down the admin upload process.
**The Fix**: Modify the frontend to send raw `FormData` (Multipart) or utilize Supabase's direct client-side upload functionality (`supabase.storage.from().upload()`) to bypass the intermediate API route entirely, drastically speeding up uploads.

### 🟢 Low Priority: Global State Management
**The Problem**: The app passes language state around via context (`AdminLangContext`), but fetches data locally in every component (`useEffect` -> `fetch`).
**The Impact**: Navigating back and forth between admin tabs re-fetches the same data repeatedly.
**The Fix**: Introduce a lightweight caching layer (like `SWR` or `React Query`) to cache API responses and instantly load admin tables when switching tabs.
