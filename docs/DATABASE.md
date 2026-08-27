# Database Setup & Migration Policy

## Database Source of Truth

**`database/schema.sql` is the canonical complete schema for this project.**

This file defines the entire state of the database, including all tables, constraints, foreign keys, row-level security (RLS) policies, triggers, and PostgreSQL extensions (`pg_trgm`) needed for the application to function correctly.

## Fresh Database Setup

To initialize a new database for development or production:

1. **Create Supabase project**: Start a new project in your Supabase dashboard.
2. **Open SQL Editor**: Navigate to the SQL Editor in the Supabase dashboard.
3. **Run `database/schema.sql`**: Copy the entire contents of this file and execute it. It will build the schema from an empty state.
4. **Run `database/seed_pages.sql`**: (Optional) Execute this script to insert initial static content and site settings.
5. **Configure environment variables**: Copy the generated Supabase URL and Anon Key into your `.env.local` or production environment settings.
6. **Verify application connection**: Start the application and verify that the database connects successfully.

*Note: Do not run `supabase db push` as the primary setup method.*

## Migration Policy

The repository historically contains migration artifacts under:

`supabase/migrations/`

These files represent historical changes and are **NOT** currently a complete standalone migration chain. They rely on tables that are defined in `database/schema.sql` and will fail if executed on a completely empty project.

### Future Architecture Decision

Currently, `database/schema.sql` is the baseline. 
Future schema changes should follow ONE consistent strategy. It is recommended to either:

**Option A**: Convert the project to a proper Supabase migration-first workflow (making the `migrations/` folder the sole source of truth from an empty state).
**Option B**: Continue using `schema.sql` as the baseline but establish a clearly documented, controlled manual migration process for production updates.
