-- Migration: 20260905000000_composite_indexes.sql
-- Description: Adds composite B-tree indexes to optimize multi-filter list queries (status, published_at, category, city).

CREATE INDEX IF NOT EXISTS idx_articles_status_published_at ON articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_status_category_published ON articles(status, category_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_status_city_published ON articles(status, city_id, published_at DESC);
