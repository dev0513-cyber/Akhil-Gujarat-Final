-- Admin Audit Log Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_user_id ON public.admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_table_record ON public.admin_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON public.admin_audit_log(created_at DESC);

-- RLS: only admins can read
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- System can insert (service role)
CREATE POLICY "System insert audit log" ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);