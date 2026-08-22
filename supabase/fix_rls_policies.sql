-- Fix Permissive RLS Policies
-- Run this in Supabase SQL Editor
-- This replaces the legacy "Admin full access on X" policies with proper admin-only write policies

-- ARTICLES
DROP POLICY IF EXISTS "Admin full access on articles" ON public.articles;
DROP POLICY IF EXISTS "Admin Write articles" ON public.articles;
DROP POLICY IF EXISTS "Public read articles" ON public.articles;

CREATE POLICY "Admin write articles" ON public.articles
  FOR ALL TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Public read articles" ON public.articles
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- CATEGORIES
DROP POLICY IF EXISTS "Admin full access on categories" ON public.categories;
DROP POLICY IF EXISTS "Admin Write categories" ON public.categories;
DROP POLICY IF EXISTS "Public read categories" ON public.categories;

CREATE POLICY "Admin write categories" ON public.categories
  FOR ALL TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Public read categories" ON public.categories
  FOR SELECT TO anon, authenticated
  USING (true);

-- CITIES
DROP POLICY IF EXISTS "Admin full access on cities" ON public.cities;
DROP POLICY IF EXISTS "Admin Write cities" ON public.cities;
DROP POLICY IF EXISTS "Public read cities" ON public.cities;

CREATE POLICY "Admin write cities" ON public.cities
  FOR ALL TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Public read cities" ON public.cities
  FOR SELECT TO anon, authenticated
  USING (true);

-- EPAPERS
DROP POLICY IF EXISTS "Admin full access on epapers" ON public.epapers;
DROP POLICY IF EXISTS "Admin Write epapers" ON public.epapers;
DROP POLICY IF EXISTS "Public read epapers" ON public.epapers;

CREATE POLICY "Admin write epapers" ON public.epapers
  FOR ALL TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Public read epapers" ON public.epapers
  FOR SELECT TO anon, authenticated
  USING (true);

-- STATIC PAGES
DROP POLICY IF EXISTS "Admin full access on static_pages" ON public.static_pages;
DROP POLICY IF EXISTS "Admin Write static_pages" ON public.static_pages;
DROP POLICY IF EXISTS "Public read static_pages" ON public.static_pages;

CREATE POLICY "Admin write static_pages" ON public.static_pages
  FOR ALL TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Public read static_pages" ON public.static_pages
  FOR SELECT TO anon, authenticated
  USING (true);

-- SITE SETTINGS
DROP POLICY IF EXISTS "Admin full access on site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admin Write site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;

CREATE POLICY "Admin write site_settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "Public read site_settings" ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- ADS (already fixed, but ensure consistency)
DROP POLICY IF EXISTS "Admin full access on ads" ON public.ads;
DROP POLICY IF EXISTS "Admin Write ads" ON public.ads;

CREATE POLICY "Admin write ads" ON public.ads
  FOR ALL TO authenticated
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- ADMIN AUDIT LOG (already created with proper policy)
-- No changes needed