# 🗄️ Supabase Database Schema

Here is the complete blueprint of your current database structure, showing all tables, fields, data types, and how they connect to one another.

---

## 1. `articles`
This is your main news table.
- **`id`** (`integer`, PRIMARY KEY) - Unique ID for the article.
- **`headline`** (`string`) - The main title of the news.
- **`description`** (`string`) - Short summary/excerpt.
- **`content`** (`text`) - Full HTML/Rich text body of the news.
- **`image_url`** (`string`, *nullable*) - Main cover image URL.
- **`extra_images`** (`array of strings`, *nullable*) - Gallery images.
- **`category_id`** (`integer`) - **FOREIGN KEY** linking to the `categories` table.
- **`city_id`** (`integer`, *nullable*) - **FOREIGN KEY** linking to the `cities` table (if city-specific).
- **`published_at`** (`timestamp`, *nullable*) - Scheduled or actual publication date.
- **`tags`** (`string`, *nullable*) - Comma-separated keywords.
- **`source`** (`string`, *nullable*) - News source/agency.
- **`seo_title`** (`string`, *nullable*) - Title optimized for Google Search.
- **`seo_description`** (`string`, *nullable*) - Meta description for Google Search.
- **`slug`** (`string`) - URL-friendly path (e.g., `breaking-news-today`).
- **`video_type`** (`string`, *nullable*) - *Legacy video platform (e.g. YouTube).*
- **`video_url`** (`string`, *nullable*) - *Legacy video embed link.*
- **`status`** (`enum`) - `'draft'`, `'published'`, or `'archived'`.
- **`is_trending`** (`boolean`) - If true, it appears in the Breaking/Trending ticker and Top News.
- **`view_count`** (`integer`) - Automatically increments when readers open the article.
- **`author`** (`string`, *nullable*) - Author name (Defaults to "અખિલ ગુજરાત ડેસ્ક").
- **`created_at`** (`timestamp`) - Record creation time.
- **`updated_at`** (`timestamp`) - Last modified time.

---

## 2. `categories`
Used to categorize articles (e.g., Gujarat, India, World).
- **`id`** (`integer`, PRIMARY KEY)
- **`name_en`** (`string`) - English name (e.g., "Gujarat").
- **`name_gu`** (`string`) - Gujarati name (e.g., "ગુજરાત").
- **`slug`** (`string`) - URL path (e.g., `/category/gujarat`).
- **`sort_order`** (`integer`) - Display order in navigation menus.
- **`description`** (`string`, *nullable*) - Optional context.

---

## 3. `cities`
Used for local/city-specific news classification.
- **`id`** (`integer`, PRIMARY KEY)
- **`name_en`** (`string`) - English name (e.g., "Ahmedabad").
- **`name_gu`** (`string`) - Gujarati name (e.g., "અમદાવાદ").
- **`slug`** (`string`) - URL path (e.g., `/city/ahmedabad`).
- **`sort_order`** (`integer`) - Display order in the Sidebar/Filters.

---

## 4. `epapers`
Stores your daily PDF e-paper editions.
- **`id`** (`integer`, PRIMARY KEY)
- **`published_date`** (`date`) - The specific date of the edition.
- **`title`** (`string`) - Display title.
- **`pdf_url`** (`string`) - Link to the uploaded PDF file.
- **`thumbnail_url`** (`string`, *nullable*) - Link to the cover image of the PDF.
- **`view_count`** (`integer`) - Total downloads/reads.
- **`created_at`** (`timestamp`)
- **`updated_at`** (`timestamp`)

---

## 5. `static_pages`
Stores informational pages managed in the CMS.
- **`id`** (`integer`, PRIMARY KEY)
- **`slug`** (`string`) - URL path (e.g., `/p/about`).
- **`title_gu`** (`string`) - Gujarati title.
- **`title_en`** (`string`) - English title.
- **`content`** (`text`) - HTML content of the page.
- **`seo_title`** (`string`, *nullable*)
- **`seo_description`** (`string`, *nullable*)
- **`updated_at`** (`timestamp`)

---

## 6. `site_settings`
Key-value store for dynamic global configuration.
- **`key`** (`string`, PRIMARY KEY) - Setting identifier (e.g., `facebook_url`).
- **`value`** (`string`) - Setting data (e.g., `https://facebook.com/akhilgujarat`).
- **`updated_at`** (`timestamp`)

---

## 🔗 Relationships
- An **Article** `belongs_to` one **Category** (`category_id`).
- An **Article** optionally `belongs_to` one **City** (`city_id`).
- When fetching articles, the frontend automatically joins Category and City data to display the Gujarati names and badges.
