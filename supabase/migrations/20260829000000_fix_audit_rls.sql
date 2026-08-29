-- Fix RLS policy on admin_audit_log to prevent arbitrary inserts from any authenticated user

-- 1. Drop the permissive policy
DROP POLICY IF EXISTS "System insert audit log" ON public.admin_audit_log;

-- 2. Create the secure policy enforcing the admin role
CREATE POLICY "System insert audit log" ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
