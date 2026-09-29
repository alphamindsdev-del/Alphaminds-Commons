PRAGMA foreign_keys = OFF;

-- Step 1: Create all new tables with correct constraints (fun instead of play)

-- members (referenced by many)
CREATE TABLE members_new (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email            TEXT NOT NULL UNIQUE,
  username         TEXT NOT NULL UNIQUE,
  display_name     TEXT NOT NULL,
  password_hash    TEXT,
  google_id        TEXT UNIQUE,
  avatar_r2_key    TEXT,
  bio              TEXT,
  country_code     TEXT,
  city             TEXT,
  age              INTEGER,
  gender           TEXT CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say') OR gender IS NULL),
  chapter_id       TEXT REFERENCES chapters(id),
  primary_house    TEXT NOT NULL CHECK (primary_house IN ('becoming', 'connection', 'wellness', 'fun', 'humanity')),
  role             TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'house_lead', 'admin', 'founder')),
  is_active        INTEGER NOT NULL DEFAULT 1,
  email_verified   INTEGER NOT NULL DEFAULT 0,
  push_token       TEXT,
  last_active_at   TIMESTAMP,
  session_revoked_at TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at       TIMESTAMP NULL,
  membership_level TEXT NOT NULL DEFAULT 'SEEKER'
);
INSERT INTO members_new SELECT * FROM members;
DROP TABLE members;
ALTER TABLE members_new RENAME TO members;

-- member_house_selections
CREATE TABLE member_house_selections_new (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id   TEXT NOT NULL REFERENCES members(id),
  house       TEXT NOT NULL CHECK (house IN ('becoming', 'connection', 'wellness', 'fun', 'humanity')),
  is_primary  INTEGER NOT NULL DEFAULT 0,
  joined_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL,
  UNIQUE(member_id, house)
);
INSERT INTO member_house_selections_new SELECT * FROM member_house_selections;
DROP TABLE member_house_selections;
ALTER TABLE member_house_selections_new RENAME TO member_house_selections;

-- rooms
CREATE TABLE rooms_new (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  chapter_id       TEXT REFERENCES chapters(id),
  house            TEXT NOT NULL CHECK (house IN ('becoming', 'connection', 'wellness', 'fun', 'humanity')),
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL,
  description      TEXT,
  cover_r2_key     TEXT,
  is_private       INTEGER NOT NULL DEFAULT 0,
  min_tier         TEXT NOT NULL DEFAULT 'free' CHECK (min_tier IN ('free', 'basic', 'premium')),
  member_count     INTEGER NOT NULL DEFAULT 0,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_by       TEXT REFERENCES members(id),
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at       TIMESTAMP NULL,
  UNIQUE(chapter_id, slug)
);
INSERT INTO rooms_new SELECT * FROM rooms;
DROP TABLE rooms;
ALTER TABLE rooms_new RENAME TO rooms;

-- posts
CREATE TABLE posts_new (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  room_id      TEXT NOT NULL REFERENCES rooms(id),
  author_id    TEXT NOT NULL REFERENCES members(id),
  chapter_id   TEXT REFERENCES chapters(id),
  house        TEXT NOT NULL CHECK (house IN ('becoming', 'connection', 'wellness', 'fun', 'humanity')),
  content      TEXT NOT NULL,
  media_r2_keys TEXT,
  post_type    TEXT NOT NULL DEFAULT 'text' CHECK (post_type IN ('text', 'media', 'poll', 'event_share', 'challenge_share')),
  is_pinned    INTEGER NOT NULL DEFAULT 0,
  reaction_count INTEGER NOT NULL DEFAULT 0,
  comment_count  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMP NULL
);
INSERT INTO posts_new SELECT * FROM posts;
DROP TABLE posts;
ALTER TABLE posts_new RENAME TO posts;

-- events
CREATE TABLE events_new (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  chapter_id      TEXT REFERENCES chapters(id),
  house           TEXT CHECK (house IN ('becoming', 'connection', 'wellness', 'fun', 'humanity') OR house IS NULL),
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  cover_r2_key    TEXT,
  event_type      TEXT NOT NULL CHECK (event_type IN ('alpha_circle', 'beatlift', 'humanity_day', 'book_club', 'workshop', 'swimming', 'games', 'summit', 'festival', 'other')),
  format          TEXT NOT NULL DEFAULT 'physical' CHECK (format IN ('physical', 'online', 'hybrid')),
  location_name   TEXT,
  location_address TEXT,
  location_coords TEXT,
  online_url      TEXT,
  starts_at       TIMESTAMP NOT NULL,
  ends_at         TIMESTAMP NOT NULL,
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  rsvp_limit      INTEGER,
  rsvp_count      INTEGER NOT NULL DEFAULT 0,
  min_tier        TEXT NOT NULL DEFAULT 'free' CHECK (min_tier IN ('free', 'basic', 'premium')),
  is_published    INTEGER NOT NULL DEFAULT 0,
  created_by      TEXT REFERENCES members(id),
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL
);
INSERT INTO events_new SELECT * FROM events;
DROP TABLE events;
ALTER TABLE events_new RENAME TO events;

-- challenges
CREATE TABLE challenges_new (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  house           TEXT NOT NULL CHECK (house IN ('becoming', 'connection', 'wellness', 'fun', 'humanity', 'global')),
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  instructions    TEXT,
  challenge_type  TEXT NOT NULL CHECK (challenge_type IN ('daily', 'weekly', 'monthly', 'event_based')),
  metric_type     TEXT CHECK (metric_type IN ('steps', 'pages', 'minutes', 'entries', 'custom') OR metric_type IS NULL),
  target_value    REAL,
  duration_days   INTEGER,
  points_reward   INTEGER NOT NULL DEFAULT 10,
  min_tier        TEXT NOT NULL DEFAULT 'free' CHECK (min_tier IN ('free', 'basic', 'premium')),
  is_active       INTEGER NOT NULL DEFAULT 1,
  starts_at       TIMESTAMP,
  ends_at         TIMESTAMP,
  created_by      TEXT REFERENCES members(id),
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL
);
INSERT INTO challenges_new SELECT * FROM challenges;
DROP TABLE challenges;
ALTER TABLE challenges_new RENAME TO challenges;

-- daily_content
CREATE TABLE daily_content_new (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  house           TEXT NOT NULL CHECK (house IN ('becoming', 'connection', 'wellness', 'fun', 'humanity', 'global')),
  content_type    TEXT NOT NULL CHECK (content_type IN ('insight', 'challenge', 'question', 'wellness_tip', 'humanity_action')),
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
INSERT INTO daily_content_new (id, house, content_type, title, body, media_r2_key, scheduled_date, day_of_week, week_number, is_published, authored_by, created_at, updated_at, deleted_at)
  SELECT id, CASE WHEN house = 'play' THEN 'fun' ELSE house END, content_type, title, body, media_r2_key, scheduled_date, day_of_week, week_number, is_published, authored_by, created_at, updated_at, deleted_at FROM daily_content;
DROP TABLE daily_content;
ALTER TABLE daily_content_new RENAME TO daily_content;

-- badges
CREATE TABLE badges_new (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  description  TEXT,
  icon_r2_key  TEXT,
  house        TEXT CHECK (house IN ('becoming', 'connection', 'wellness', 'fun', 'humanity') OR house IS NULL),
  trigger_type TEXT NOT NULL,
  trigger_value INTEGER,
  points_value  INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO badges_new SELECT * FROM badges;
DROP TABLE badges;
ALTER TABLE badges_new RENAME TO badges;

-- leaderboard_snapshots
CREATE TABLE leaderboard_snapshots_new (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  snapshot_at  TIMESTAMP NOT NULL,
  period_type  TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),
  scope_type   TEXT NOT NULL CHECK (scope_type IN ('global', 'chapter', 'house')),
  scope_id     TEXT,
  house        TEXT CHECK (house IN ('becoming', 'connection', 'wellness', 'fun', 'humanity') OR house IS NULL),
  rank         INTEGER NOT NULL,
  member_id    TEXT NOT NULL REFERENCES members(id),
  score        INTEGER NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO leaderboard_snapshots_new SELECT * FROM leaderboard_snapshots;
DROP TABLE leaderboard_snapshots;
ALTER TABLE leaderboard_snapshots_new RENAME TO leaderboard_snapshots;

-- podcasts
CREATE TABLE podcasts_new (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title       TEXT NOT NULL,
  description TEXT,
  house       TEXT CHECK (house IN ('becoming', 'connection', 'wellness', 'fun', 'humanity', 'global') OR house IS NULL),
  cover_r2_key TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO podcasts_new SELECT * FROM podcasts;
DROP TABLE podcasts;
ALTER TABLE podcasts_new RENAME TO podcasts;

PRAGMA foreign_keys = ON;
