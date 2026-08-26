# Deployment Guide

## Infrastructure
- **Hosting**: Vercel
- **Database**: Supabase (PostgreSQL)
- **Storage**: Backblaze B2

## Vercel Deployment Setup
1. Connect Vercel to your GitHub repository.
2. In Vercel Project Settings, add all Environment Variables found in `.env.example`.
3. The build command is `npm run build` and output directory is `.next`.

## Environment Variables
Ensure the following variables are set in production:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=

B2_APPLICATION_KEY_ID=
B2_APPLICATION_KEY=
B2_BUCKET_ID=
B2_BUCKET_NAME=
B2_ENDPOINT=
NEXT_PUBLIC_B2_PUBLIC_URL=
```

## Continuous Integration
A GitHub Action is configured in `.github/workflows/ci.yml`. It runs:
- Linter (`npm run lint`)
- Type Checking (`npx tsc --noEmit`)
- Unit tests (`npm test`)

Code will not merge if CI fails. Vercel automatically deploys the `main` branch.
