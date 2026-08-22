-- Ads v2: Add frame column (idempotent)
-- Run this in Supabase SQL Editor

ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS frame text NOT NULL DEFAULT 'banner';

-- Backfill existing rows (optional - defaults handle it, but explicit is clearer)
UPDATE public.ads SET frame = 'banner' WHERE frame IS NULL;