# Backup & Disaster Recovery Plan (BDRP)
**Akhil Gujarat Digital News Platform**

## 1. Database (Supabase)
### Backups
- Supabase automatically takes daily backups (PITR for 7 days on Pro plan).
- **Manual Backups**: Go to Database -> Backups -> Download Backup in the Supabase Dashboard.

### Recovery
- To restore from a backup:
  1. Go to Database -> Backups.
  2. Select the PITR point or specific daily backup.
  3. Click "Restore".

## 2. Media Storage (Backblaze B2)
### Backups
- Currently, B2 buckets are primary storage.
- To enable automatic backups, enable "Object Versioning" or "Lifecycle Rules" in the B2 bucket settings to retain deleted/overwritten objects for 30 days.

### Recovery
- If a file is accidentally deleted, download the previous version using the B2 Web Interface or `b2` CLI.

## 3. Application (Vercel)
### Backups
- Vercel deployments are immutable. The source code on GitHub acts as the primary backup.
- Environment variables should be backed up securely in a password manager (e.g., 1Password, Bitwarden).

### Recovery
- Rollback: Go to Vercel Dashboard -> Deployments -> Find previous deployment -> "Promote to Production".

## 4. Runbooks
- **Total System Outage**: Re-deploy latest working commit on Vercel. Ensure Supabase connection pooler is active.
- **Data Corruption**: Restore Supabase via PITR (Point-in-Time Recovery) to the last known good state.
