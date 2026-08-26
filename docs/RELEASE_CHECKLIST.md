# AKHIL GUJARAT — PRODUCTION RELEASE CHECKLIST

## PRE-DEPLOYMENT
- [x] Git repository clean (Post-merge of final hardening commits)
- [x] CI passing
- [x] Production build passing
- [x] Environment variable schema verified
- [ ] Documentation placeholders completed
- [x] Secrets not committed

## VERCEL
- [ ] Production project created
- [ ] Environment variables configured
- [ ] Production deployment successful
- [ ] Domain configured
- [ ] HTTPS verified

## SUPABASE
- [ ] Production database connected
- [ ] Migrations applied
- [ ] RLS enabled
- [ ] Admin account created
- [ ] Backup/PITR verified

## BACKBLAZE
- [ ] Production bucket verified
- [ ] Upload works
- [ ] Image delivery works
- [ ] E-paper delivery works
- [ ] Versioning verified
- [ ] Lifecycle rules verified

## UPSTASH
- [ ] Production Redis configured
- [ ] Rate limiting verified

## LIVE APPLICATION
- [ ] Homepage
- [ ] Category
- [ ] City
- [ ] Article
- [ ] Search
- [ ] E-paper
- [ ] Ads
- [ ] RSS
- [ ] Sitemap
- [ ] 404
- [ ] Images

## ADMIN
- [ ] Login
- [ ] MFA
- [ ] Dashboard
- [ ] Create
- [ ] Draft
- [ ] Edit
- [ ] Publish
- [ ] Delete
- [ ] Upload
- [ ] Ads
- [ ] Categories
- [ ] Cities
- [ ] Settings
- [ ] Logout

## SECURITY
- [ ] Unauthorized API rejected
- [ ] Non-admin API rejected
- [ ] Invalid upload rejected
- [ ] Oversized upload rejected
- [ ] Session expiration verified
- [ ] Rate limiting verified

## PERFORMANCE
- [ ] Image cache behavior checked
- [ ] Vercel function usage checked
- [ ] Supabase usage checked
- [ ] B2 bandwidth checked
- [ ] Upstash usage checked

## CLIENT HANDOVER
- [ ] Client GitHub access
- [ ] Client Vercel access
- [ ] Client Supabase access
- [ ] Client Backblaze access
- [ ] Client Upstash access
- [ ] Domain access
- [ ] Admin account
- [ ] CMS guide
- [ ] Deployment guide
- [ ] Backup/recovery guide
