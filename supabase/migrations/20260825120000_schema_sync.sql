-- Add missing view_count column to articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add missing view_count column to epapers table
ALTER TABLE epapers ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
