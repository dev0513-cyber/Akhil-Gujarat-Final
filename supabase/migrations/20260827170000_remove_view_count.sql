-- Migration: 20260827170000_remove_view_count.sql
-- Description: Removes the unused view_count columns from articles and epapers tables.

-- Drop view_count from articles
ALTER TABLE articles DROP COLUMN IF EXISTS view_count;

-- Drop view_count from epapers
ALTER TABLE epapers DROP COLUMN IF EXISTS view_count;
