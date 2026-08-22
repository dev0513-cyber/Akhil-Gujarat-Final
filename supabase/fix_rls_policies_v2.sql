-- Fix Permissive RLS Policies (v2 - handles existing policies)
-- Run this in Supabase SQL Editor

-- Helper: Drop ALL policies on a table
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'articles' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.articles', pol.policyname);
  END LOOP;
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'categories' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.categories', pol.policyname);
  END LOOP;
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'cities' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.cities', pol.policyname);
  END LOOP;
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'epapers' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.epapers', pol.policyname);
  END LOOP;
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'static_pages' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.static_pages', pol.policyname);
  END LOOP;
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'site_settings' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.site_settings', pol.policyname);
  END LOOP;
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'ads' AND schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.ads', pol.policyname);
  END LOOP;
END $$;

-- ARTICLES
CREATE POLICY "Admin write articles" ON public.articles
  FOR ALL TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Public read articles" ON public.articles
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- CATEGORIES
CREATE POLICY "Admin write categories" ON public.categories
  FOR ALL TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Public read categories" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (true);

-- CITIES
CREATE POLICY "Admin write cities" ON public.cities
  FOR ALL TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Public read cities" ON public.cities
  FOR SELECT TO anon, authenticated
  USING (true);

-- EPAPERS
CREATE POLICY "Admin write epapers" ON public.epapers
  FOR ALL TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Public read epapers" ON public.epapers
  FOR SELECT TO anon, authenticated
  USING (true);

-- STATIC PAGES
CREATE POLICY "Admin write static_pages" ON public.static_pages
  FOR ALL TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Public read static_pages" ON public.static_pages
  FOR SELECT TO anon, authenticated
  USING (true);

-- SITE SETTINGS
CREATE POLICY "Admin write site_settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Public read site_settings" ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- ADS
CREATE POLICY "Admin write ads" ON public.ads
  FOR ALL TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- ADMIN AUDIT LOG (created by admin_audit_log.sql - already has correct policy)
-- No changes needed