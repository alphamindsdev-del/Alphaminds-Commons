CREATE TABLE IF NOT EXISTS library_articles (
  id            TEXT PRIMARY KEY,
  house         TEXT NOT NULL CHECK (house IN ('becoming', 'connection', 'wellness', 'fun', 'humanity')),
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL,
  excerpt       TEXT,
  body          TEXT NOT NULL,
  cover_r2_key  TEXT,
  author_name   TEXT NOT NULL DEFAULT 'AlphaMinds Guides',
  read_time_min INTEGER NOT NULL DEFAULT 5,
  is_published  INTEGER NOT NULL DEFAULT 1,
  authored_by   TEXT REFERENCES members(id),
  published_at  TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_library_articles_house ON library_articles(house);
CREATE INDEX IF NOT EXISTS idx_library_articles_published ON library_articles(is_published);
