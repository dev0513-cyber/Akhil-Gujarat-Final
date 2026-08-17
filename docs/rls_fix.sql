-- ==========================================
-- AKHIL GUJARAT: ROW LEVEL SECURITY (RLS) FIX
-- ==========================================

-- 1. Fix articles public read access to ONLY allow published articles (or admins)
DROP POLICY IF EXISTS "Allow public read access on articles" ON articles;
CREATE POLICY "Allow public read access on articles" ON articles FOR SELECT 
USING (status = 'published' OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'));

-- 2. Fix articles mutation policies
DROP POLICY IF EXISTS "Allow admin insert on articles" ON articles;
DROP POLICY IF EXISTS "Allow admin update on articles" ON articles;
DROP POLICY IF EXISTS "Allow admin delete on articles" ON articles;

CREATE POLICY "Allow admin insert on articles" ON articles FOR INSERT TO authenticated WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "Allow admin update on articles" ON articles FOR UPDATE TO authenticated USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "Allow admin delete on articles" ON articles FOR DELETE TO authenticated USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- 3. Fix categories mutation policies
DROP POLICY IF EXISTS "Allow admin insert on categories" ON categories;
DROP POLICY IF EXISTS "Allow admin update on categories" ON categories;
DROP POLICY IF EXISTS "Allow admin delete on categories" ON categories;

CREATE POLICY "Allow admin insert on categories" ON categories FOR INSERT TO authenticated WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "Allow admin update on categories" ON categories FOR UPDATE TO authenticated USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "Allow admin delete on categories" ON categories FOR DELETE TO authenticated USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- 4. Fix cities mutation policies
DROP POLICY IF EXISTS "Allow admin insert on cities" ON cities;
DROP POLICY IF EXISTS "Allow admin update on cities" ON cities;
DROP POLICY IF EXISTS "Allow admin delete on cities" ON cities;

CREATE POLICY "Allow admin insert on cities" ON cities FOR INSERT TO authenticated WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "Allow admin update on cities" ON cities FOR UPDATE TO authenticated USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "Allow admin delete on cities" ON cities FOR DELETE TO authenticated USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- 5. Fix epapers mutation policies
DROP POLICY IF EXISTS "Allow admin insert on epapers" ON epapers;
DROP POLICY IF EXISTS "Allow admin update on epapers" ON epapers;
DROP POLICY IF EXISTS "Allow admin delete on epapers" ON epapers;

CREATE POLICY "Allow admin insert on epapers" ON epapers FOR INSERT TO authenticated WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "Allow admin update on epapers" ON epapers FOR UPDATE TO authenticated USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "Allow admin delete on epapers" ON epapers FOR DELETE TO authenticated USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- 6. Fix static_pages mutation policies
DROP POLICY IF EXISTS "Allow admin insert on static_pages" ON static_pages;
DROP POLICY IF EXISTS "Allow admin update on static_pages" ON static_pages;
DROP POLICY IF EXISTS "Allow admin delete on static_pages" ON static_pages;

CREATE POLICY "Allow admin insert on static_pages" ON static_pages FOR INSERT TO authenticated WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "Allow admin update on static_pages" ON static_pages FOR UPDATE TO authenticated USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "Allow admin delete on static_pages" ON static_pages FOR DELETE TO authenticated USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- 7. Fix site_settings mutation policies
DROP POLICY IF EXISTS "Allow admin insert on site_settings" ON site_settings;
DROP POLICY IF EXISTS "Allow admin update on site_settings" ON site_settings;
DROP POLICY IF EXISTS "Allow admin delete on site_settings" ON site_settings;

CREATE POLICY "Allow admin insert on site_settings" ON site_settings FOR INSERT TO authenticated WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "Allow admin update on site_settings" ON site_settings FOR UPDATE TO authenticated USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "Allow admin delete on site_settings" ON site_settings FOR DELETE TO authenticated USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
