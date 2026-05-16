ALTER TABLE image_analytics ADD COLUMN hearts INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_image_analytics_hearts ON image_analytics(hearts);

CREATE TABLE IF NOT EXISTS image_analytics_daily (
  image_id  TEXT    NOT NULL,
  date      TEXT    NOT NULL,
  views     INTEGER NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0,
  hearts    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (image_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_image_id ON image_analytics_daily(image_id);
CREATE INDEX IF NOT EXISTS idx_daily_date     ON image_analytics_daily(date);
