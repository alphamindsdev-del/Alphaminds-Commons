-- Migration 0015: verifiable, repeatable member journey progress.
--
-- Progress rows remain one-per-member-per-activity (the durable "best" state),
-- while member_journey_attempts keeps an append-only history of every attempt,
-- including retakes of completed/repeatable activities.

ALTER TABLE member_journey_progress ADD COLUMN started_at TIMESTAMP NULL;
ALTER TABLE member_journey_progress ADD COLUMN last_started_at TIMESTAMP NULL;
ALTER TABLE member_journey_progress ADD COLUMN completion_type TEXT NULL;
ALTER TABLE member_journey_progress ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'self_reported';
ALTER TABLE member_journey_progress ADD COLUMN evidence_json TEXT NULL;
ALTER TABLE member_journey_progress ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS member_journey_attempts (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id           TEXT NOT NULL REFERENCES members(id),
  activity_id         TEXT NOT NULL REFERENCES journey_activities(id),
  status              TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed')),
  completion_type     TEXT NULL,
  verification_status TEXT NOT NULL DEFAULT 'self_reported',
  evidence_json       TEXT NULL,
  started_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at        TIMESTAMP NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_journey_attempts_member ON member_journey_attempts(member_id, activity_id);
CREATE INDEX IF NOT EXISTS idx_journey_attempts_activity ON member_journey_attempts(activity_id, status);

-- Existing completed rows are genuine historical completions, but they were
-- recorded before verification metadata existed. Mark them as self-reported so
-- administrators can distinguish them from system/admin verified completions.
UPDATE member_journey_progress
SET verification_status = 'self_reported'
WHERE status = 'completed' AND (verification_status IS NULL OR verification_status = '');
