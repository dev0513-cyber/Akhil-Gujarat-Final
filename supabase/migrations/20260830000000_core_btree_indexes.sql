-- Core B-Tree indexes for high-frequency queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_category_id ON articles(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_city_id ON articles(city_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ads_slot_active ON ads(slot, is_active);