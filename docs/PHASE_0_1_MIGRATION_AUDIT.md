# Phase 0.1 Migration & Git Cleanup Audit

## Executive Verdict

**SAFE WITH CONDITIONS**

## Database File Inventory

| File | Purpose | Creates | Alters | Drops | Indexes | Policies | Functions | Status |
|---|---|---|---|---|---|---|---|---|
| `database/schema.sql` | Complete DB initialization | All Tables | - | Yes (IF EXISTS) | All | All | Triggers/Funcs | Baseline |
| `database/seed_pages.sql` | Initial Content | - | - | - | - | - | - | Active |
| `database/merged_schema.sql` | Temporary Agent Artifact | All | - | - | All | All | All | Temp |
| `supabase/05_add_indexes.sql` | Manual index creation | - | - | - | Yes | - | - | Redundant |
| `supabase/admin_audit_log.sql` | Audit feature setup | Table | - | - | Yes | Yes | - | Redundant |
| `supabase/ads_frame_migration.sql` | Ads v2 feature setup | - | Table | - | - | - | - | Redundant |
| `supabase/fix_rls_policies.sql` | Security hardening | - | - | Yes | - | Yes | - | Redundant |
| `supabase/fix_rls_policies_v2.sql` | Security hardening | - | - | Yes | - | Yes | - | Redundant |
| `supabase/migrations/20260825120000_schema_sync.sql` | Add views feature | - | Tables | - | - | - | - | Historical |
| `supabase/migrations/20260827160000_search_indexes.sql` | Gujarati Search feature | Ext | - | - | Yes | - | - | Redundant |
| `supabase/migrations/20260827170000_remove_view_count.sql`| Remove views feature | - | - | Tables| - | - | - | Historical |

## Migration Timeline

The repository has two distinct, conflicting timelines:
**Timeline A (The intended Supabase CLI history):**
`20260825120000_schema_sync.sql` (Adds `view_count`) -> `20260827160000_search_indexes.sql` -> `20260827170000_remove_view_count.sql` (Removes `view_count`).
*Note: This timeline is broken because it assumes `articles` and `epapers` already exist, meaning `database/schema.sql` is implicitly required to run before them.*

**Timeline B (The actual workflow used by developers):**
Developers modified `database/schema.sql` as the living "Source of Truth" and created loose SQL scripts (`supabase/*.sql`) to execute manually against production when features were deployed.

## Duplicate Definition Analysis

- **`admin_audit_log`**: Defined identically in `schema.sql` and `supabase/admin_audit_log.sql`. (Baseline vs One-time manual script)
- **Indexes**: `05_add_indexes.sql` and `20260827160000_search_indexes.sql` are identical to blocks now present inside `schema.sql`.
- **RLS Policies**: `fix_rls_policies.sql` creates policies that already exist in `schema.sql`.

## schema.sql Analysis

`database/schema.sql` is a **manually merged, complete fresh-install schema**. 
It includes all tables, constraints, indexes, extensions (`pg_trgm`), functions, triggers, and RLS policies. It contains the consolidated result of every manual script and migration in the repository. Running this file against a completely empty PostgreSQL database will successfully produce the exact target schema required by the application.

## Supabase Migration Analysis

The folder `supabase/migrations/` is **NOT** a valid, standalone Supabase migration history.
If one were to run `supabase db push` against an empty project, it would fail immediately because `20260825120000_schema_sync.sql` attempts to `ALTER TABLE articles` before the table is created. The migrations folder only contains historical deltas, not the baseline.

## Loose SQL File Analysis

Files like `05_add_indexes.sql`, `admin_audit_log.sql`, and `ads_frame_migration.sql` were intended as manual production migrations (instructions to run them remain in `SECURITY_SETTINGS.md`). 
1. **Are they required?** No.
2. **Are they in schema.sql?** Yes.
3. **Can they be deleted?** Yes, keeping them creates ambiguity about how to initialize the database.

## Git History Findings

- The features `remove views`, `ads banner system`, and `search indexes` were added over time (indicated by git log).
- Developers opted to update `database/schema.sql` to represent the final state of the application instead of relying strictly on `supabase db push` workflows.

## Database Comparison

**NOT VERIFIED.** Safe local/test database credentials were not provided to inspect live PostgreSQL metadata. 

## Source of Truth Decision

**OPTION B:** `database/schema.sql` is the canonical fresh-install source of truth and migrations are historical/manual artifacts. 

*Evidence:* The migrations folder lacks a baseline. Without `schema.sql` being run first, the migrations fail. Therefore, the architecture relies on `schema.sql` as a complete snapshot of the desired state. 

## Safe Cleanup Table

| File | Recommendation | Reason | Risk |
|---|---|---|---|
| `database/merged_schema.sql` | REMOVE | Temporary AI generated artifact | None |
| `supabase/05_add_indexes.sql` | REMOVE AFTER VERIFICATION | Merged into `schema.sql` | None |
| `supabase/admin_audit_log.sql` | REMOVE AFTER VERIFICATION | Merged into `schema.sql` | None |
| `supabase/ads_frame_migration.sql` | REMOVE AFTER VERIFICATION | Merged into `schema.sql` | None |
| `supabase/fix_rls_policies.sql` | REMOVE AFTER VERIFICATION | Merged into `schema.sql` | None |
| `supabase/fix_rls_policies_v2.sql` | REMOVE AFTER VERIFICATION | Merged into `schema.sql` | None |
| `supabase/migrations/*` | KEEP AS HISTORICAL | Required only as a historical log of what changed, but they should not be executed. | Low (May confuse developers using Supabase CLI) |
| `SECURITY_SETTINGS.md` | UPDATE | Remove references to manual SQL execution. | None |

## Risks

If a developer attempts to use `supabase db push` relying on `supabase/migrations/`, it will fail. The primary risk is developer confusion regarding how to initialize the database (CLI vs Manual SQL).

## Recommended Cleanup Steps

1. Delete the redundant loose `.sql` files in `supabase/`.
2. Delete the temporary `database/merged_schema.sql`.
3. Update `SECURITY_SETTINGS.md` to remove manual SQL execution steps.
4. Commit the verified remediation changes (from Phase 0) to git.

---

PHASE 0.1 COMPLETE

Source of Truth: database/schema.sql
Migration Safety: Safe to remove duplicate manual scripts
Files Safe to Remove: database/merged_schema.sql, supabase/*.sql
Files That Must Be Preserved: database/schema.sql, database/seed_pages.sql
Files Requiring Conversion: None
Remaining Risks: Supabase CLI incompatibility
Recommended Next Action: Git commit the verified Phase 0 remediations and remove redundant loose SQL scripts.
