-- Add 'alpha_daily' to the content_type CHECK constraint in daily_content table
-- SQLite requires table recreation to alter constraints

CREATE TABLE daily_content_new (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  house           TEXT NOT NULL CHECK (house IN ('becoming', 'connection', 'wellness', 'fun', 'humanity', 'global')),
  content_type    TEXT NOT NULL CHECK (content_type IN ('insight', 'challenge', 'question', 'wellness_tip', 'humanity_action', 'alpha_daily')),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  media_r2_key    TEXT,
  scheduled_date  TEXT,
  day_of_week     TEXT CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') OR day_of_week IS NULL),
  week_number     INTEGER,
  is_published    INTEGER NOT NULL DEFAULT 0,
  authored_by     TEXT REFERENCES members(id),
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL
);

INSERT INTO daily_content_new
  SELECT * FROM daily_content;

DROP TABLE daily_content;

ALTER TABLE daily_content_new RENAME TO daily_content;
