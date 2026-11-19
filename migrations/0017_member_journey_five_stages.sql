-- Migration 0017: separate the member development journey from administrative roles.
--
-- The member journey is five personal-development stages:
--   SEEKER -> EXAMINER -> ARCHITECT -> BUILDER -> CATALYST
--
-- Facilitator, Steward, Chapter Leader and Coordinator are administrative /
-- community positions, not growth stages. Members who held those positions keep
-- them in the new members.community_role column so they can be managed
-- independently of the personal journey.

PRAGMA defer_foreign_keys = true;
PRAGMA foreign_keys = OFF;

-- 1. Preserve existing administrative positions in their own column.
ALTER TABLE members ADD COLUMN community_role TEXT NULL;

UPDATE members SET community_role = 'FACILITATOR'
  WHERE membership_level = 'FACILITATOR' AND community_role IS NULL;
UPDATE members SET community_role = 'STEWARD'
  WHERE membership_level = 'STEWARD' AND community_role IS NULL;
UPDATE members SET community_role = 'CHAPTER_LEADER'
  WHERE membership_level = 'CHAPTER_LEADER' AND community_role IS NULL;
UPDATE members SET community_role = 'COORDINATOR'
  WHERE membership_level = 'COORDINATOR' AND community_role IS NULL;

-- 2. Map existing members onto the five personal-development stages. Progress
--    rows are keyed by activity id, so no member progress is lost.
UPDATE members SET membership_level = 'ARCHITECT' WHERE membership_level = 'FACILITATOR';
UPDATE members SET membership_level = 'BUILDER' WHERE membership_level = 'STEWARD';
UPDATE members SET membership_level = 'CATALYST'
  WHERE membership_level IN ('CHAPTER_LEADER', 'COORDINATOR');

-- 3. Rebuild journey_activities with the five-stage CHECK constraint,
--    remapping any activities that were authored against the old codes.
CREATE TABLE journey_activities_v2 (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  level         TEXT NOT NULL CHECK (level IN ('SEEKER', 'EXAMINER', 'ARCHITECT', 'BUILDER', 'CATALYST')),
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
  deleted_at    TIMESTAMP NULL,
  link_url      TEXT
);

INSERT INTO journey_activities_v2
  (id, level, title, description, type, instructions, position, is_required,
   is_published, content, metadata_json, created_at, updated_at, deleted_at, link_url)
SELECT
  id,
  CASE level
    WHEN 'FACILITATOR' THEN 'ARCHITECT'
    WHEN 'STEWARD' THEN 'BUILDER'
    WHEN 'CHAPTER_LEADER' THEN 'CATALYST'
    WHEN 'COORDINATOR' THEN 'CATALYST'
    ELSE level
  END,
  title, description, type, instructions, position, is_required, is_published,
  content, metadata_json, created_at, updated_at, deleted_at, link_url
FROM journey_activities;

DROP TABLE journey_activities;
ALTER TABLE journey_activities_v2 RENAME TO journey_activities;

CREATE INDEX IF NOT EXISTS idx_activities_level ON journey_activities(level, position);

PRAGMA foreign_keys = ON;
