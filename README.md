# Akhil Gujarat - News Portal

This is the official Akhil Gujarat News Portal application, built with Next.js 16 (App Router), Supabase (PostgreSQL + Auth), and Backblaze B2.

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase SSR
- **Media Storage**: Backblaze B2 (with Next.js API proxy)
- **Rate Limiting**: Upstash Redis

## Prerequisites

- Node.js 20+
- A Supabase Project
- A Backblaze B2 Bucket
- An Upstash Redis Database

## Environment Variables

Copy `.env.example` to `.env.local` and configure the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR_PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR_SERVICE_ROLE_KEY]"

# Backblaze B2 Storage
B2_ENDPOINT="[e.g., s3.us-east-005.backblazeb2.com]"
B2_REGION="[e.g., us-east-005]"
B2_ACCESS_KEY_ID="[YOUR_B2_KEY_ID]"
B2_SECRET_ACCESS_KEY="[YOUR_B2_APPLICATION_KEY]"
B2_BUCKET_NAME="[YOUR_BUCKET_NAME]"

# Upstash Redis (For Rate Limiting)
UPSTASH_REDIS_REST_URL="[YOUR_UPSTASH_URL]"
UPSTASH_REDIS_REST_TOKEN="[YOUR_UPSTASH_TOKEN]"
```

## Database Setup

To initialize the database, please follow the detailed instructions in the [Database Setup & Migration Policy](docs/DATABASE.md) document.

*(Note: The `schema.sql` file includes all tables including `ads` and `admin_audit_log`, plus search optimization indexes).*

## Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## CMS Management

The admin dashboard is located at `/admin`.
- **Login**: Accessed via `/admin/login`. Only users with the `admin` role in their `app_metadata` can access the CMS.
- **Role Assignment**: To make a user an admin, run this SQL in Supabase:
  ```sql
  UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' WHERE email = 'admin@example.com';
  ```

## Backup & Recovery

- **Database**: Use the Supabase dashboard to configure automatic backups (Pro tier) or use `pg_dump` for manual backups.
- **Storage**: Backblaze B2 provides native replication and lifecycle rules. Configure these in the B2 dashboard to prevent accidental data loss.

## Deployment (Vercel)

1. Push your code to a GitHub repository.
2. Import the project in Vercel.
3. Configure all the Environment Variables listed above in the Vercel project settings.
4. Deploy!

*(Note: Vercel edge caching is leveraged heavily for `/api/media/[key]`. Ensure your B2 bucket is set to Private, as the Next.js API route securely proxies media and handles caching).*
