-- Migration: 20260827160000_search_indexes.sql
-- Description: Adds pg_trgm extension and creates GIN indexes for ILIKE substring matching to support scalable Gujarati text search.

-- Enable the pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN trigram indexes on the heavily searched text columns.
-- Since PostgREST translates query.or('headline.ilike.*,description.ilike.*') into 
-- individual OR conditions, we need individual indexes for the planner to utilize bitmap ORs.
CREATE INDEX IF NOT EXISTS idx_articles_headline_trgm ON articles USING GIN (headline gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articles_description_trgm ON articles USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articles_content_trgm ON articles USING GIN (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articles_tags_trgm ON articles USING GIN (tags gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articles_seo_title_trgm ON articles USING GIN (seo_title gin_trgm_ops);
