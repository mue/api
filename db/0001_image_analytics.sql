CREATE TABLE IF NOT EXISTS image_analytics (
  image_id   TEXT NOT NULL PRIMARY KEY,
  views      INTEGER NOT NULL DEFAULT 0,
  downloads  INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_image_analytics_views     ON image_analytics(views);
CREATE INDEX IF NOT EXISTS idx_image_analytics_downloads ON image_analytics(downloads);
