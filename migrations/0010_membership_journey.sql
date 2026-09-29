-- Migration 0010: Membership Levels, Journey Engine, Chapter Coordinates, and The Code

-- Disable foreign keys during ALTER TABLE operations
PRAGMA foreign_keys = OFF;

-- 1. Add membership_level to members table
ALTER TABLE members ADD COLUMN membership_level TEXT NOT NULL DEFAULT 'SEEKER';

-- 2. Add latitude/longitude to chapters table
ALTER TABLE chapters ADD COLUMN latitude REAL;
ALTER TABLE chapters ADD COLUMN longitude REAL;

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;

-- 3. Journey Activities Table
CREATE TABLE IF NOT EXISTS journey_activities (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  level         TEXT NOT NULL CHECK (level IN ('SEEKER', 'EXAMINER', 'FACILITATOR', 'STEWARD', 'CHAPTER_LEADER', 'COORDINATOR')),
  title         TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL CHECK (type IN ('course', 'lesson', 'reading', 'assignment', 'quiz', 'assessment', 'rel_fi', 'claim_file', 'video', 'audio', 'article', 'resource', 'custom')),
  instructions  TEXT,
  position      INTEGER NOT NULL,
  is_required   INTEGER NOT NULL DEFAULT 1,
  is_published  INTEGER NOT NULL DEFAULT 0,
  content       TEXT,
  metadata_json TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_activities_level ON journey_activities(level, position);

-- 4. Member Journey Progress Table
CREATE TABLE IF NOT EXISTS member_journey_progress (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id     TEXT NOT NULL REFERENCES members(id),
  activity_id   TEXT NOT NULL REFERENCES journey_activities(id),
  status        TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed')),
  completed_at  TIMESTAMP NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_member ON member_journey_progress(member_id);

-- 5. The Code Table
CREATE TABLE IF NOT EXISTS the_code (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title           TEXT NOT NULL,
  passage         TEXT NOT NULL,
  scheduled_date  TEXT UNIQUE,
  is_published    INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_code_date ON the_code(scheduled_date);

-- 6. Saved Code Passages Table
CREATE TABLE IF NOT EXISTS saved_code_passages (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id   TEXT NOT NULL REFERENCES members(id),
  code_id     TEXT NOT NULL REFERENCES the_code(id),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, code_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_code_member ON saved_code_passages(member_id);

-- 7. Seed Journey Activities for Seeker level
INSERT OR IGNORE INTO journey_activities (level, title, type, position, is_required, is_published, content) VALUES
  ('SEEKER', 'Orientation', 'lesson', 1, 1, 1, 'Welcome to AlphaMinds! This orientation will guide you through the community, our Five Houses, and your learning path.'),
  ('SEEKER', 'Rel-Fi — Play Now', 'rel_fi', 2, 1, 1, 'Complete the Rel-Fi reasoning exercise to continue your journey. This activity will unlock for Examiner+ members.');
-- Note: claim_file, assignment, and assessment activities will be added via Admin