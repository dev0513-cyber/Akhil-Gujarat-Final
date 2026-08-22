CREATE INDEX IF NOT EXISTS idx_articles_status_published ON articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_city ON articles(city_id);
CREATE INDEX IF NOT EXISTS idx_articles_trending ON articles(is_trending) WHERE is_trending = true;
CREATE INDEX IF NOT EXISTS idx_ads_slot_active ON ads(slot, is_active);
