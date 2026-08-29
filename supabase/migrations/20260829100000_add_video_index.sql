-- Migration: Add partial index for video availability

CREATE INDEX IF NOT EXISTS idx_articles_has_video
ON articles(id)
WHERE video_url IS NOT NULL
AND video_url != '';
