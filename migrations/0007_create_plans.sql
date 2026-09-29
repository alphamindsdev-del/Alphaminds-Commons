-- Plans: courses/programs users can follow with progress tracking
CREATE TABLE IF NOT EXISTS plans (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT NOT NULL DEFAULT '',
  cover_image_r2_key TEXT,
  difficulty      TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_duration TEXT,
  is_published    INTEGER NOT NULL DEFAULT 0,
  created_by      TEXT NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS plan_sections (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  plan_id         TEXT NOT NULL REFERENCES plans(id),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plan_items (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  plan_id         TEXT NOT NULL REFERENCES plans(id),
  section_id      TEXT REFERENCES plan_sections(id),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL DEFAULT '',
  content_type    TEXT NOT NULL CHECK (content_type IN ('video', 'audio', 'article', 'image')),
  media_r2_key    TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plan_progress (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  plan_id         TEXT NOT NULL REFERENCES plans(id),
  member_id       TEXT NOT NULL REFERENCES members(id),
  plan_item_id    TEXT NOT NULL REFERENCES plan_items(id),
  completed_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(plan_id, member_id, plan_item_id)
);
