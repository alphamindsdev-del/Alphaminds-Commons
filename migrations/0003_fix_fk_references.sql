PRAGMA foreign_keys = OFF;

-- member_stats
CREATE TABLE member_stats_new (
  id                    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id             TEXT NOT NULL UNIQUE REFERENCES members(id),
  becoming_score        INTEGER NOT NULL DEFAULT 0,
  connection_score      INTEGER NOT NULL DEFAULT 0,
  wellness_score        INTEGER NOT NULL DEFAULT 0,
  play_score            INTEGER NOT NULL DEFAULT 0,
  humanity_score        INTEGER NOT NULL DEFAULT 0,
  total_score           INTEGER NOT NULL DEFAULT 0,
  impact_score          INTEGER NOT NULL DEFAULT 0,
  current_streak_days   INTEGER NOT NULL DEFAULT 0,
  longest_streak_days   INTEGER NOT NULL DEFAULT 0,
  total_points          INTEGER NOT NULL DEFAULT 0,
  volunteer_hours       REAL NOT NULL DEFAULT 0.0,
  challenges_completed  INTEGER NOT NULL DEFAULT 0,
  events_attended       INTEGER NOT NULL DEFAULT 0,
  posts_authored        INTEGER NOT NULL DEFAULT 0,
  rooms_joined          INTEGER NOT NULL DEFAULT 0,
  detectors_completed   INTEGER NOT NULL DEFAULT 0,
  last_activity_at      TIMESTAMP,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO member_stats_new SELECT * FROM member_stats;
DROP TABLE member_stats;
ALTER TABLE member_stats_new RENAME TO member_stats;

-- member_chapter_history
CREATE TABLE member_chapter_history_new (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id       TEXT NOT NULL REFERENCES members(id),
  from_chapter_id TEXT REFERENCES chapters(id),
  to_chapter_id   TEXT REFERENCES chapters(id),
  reason          TEXT,
  transferred_by  TEXT REFERENCES members(id),
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO member_chapter_history_new SELECT * FROM member_chapter_history;
DROP TABLE member_chapter_history;
ALTER TABLE member_chapter_history_new RENAME TO member_chapter_history;

-- member_context_snapshots
CREATE TABLE member_context_snapshots_new (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id       TEXT NOT NULL REFERENCES members(id),
  snapshot_date   TEXT NOT NULL,
  snapshot_json   TEXT NOT NULL,
  model_version   TEXT NOT NULL DEFAULT '1.0',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, snapshot_date)
);
INSERT INTO member_context_snapshots_new SELECT * FROM member_context_snapshots;
DROP TABLE member_context_snapshots;
ALTER TABLE member_context_snapshots_new RENAME TO member_context_snapshots;

-- room_memberships
CREATE TABLE room_memberships_new (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  room_id     TEXT NOT NULL REFERENCES rooms(id),
  member_id   TEXT NOT NULL REFERENCES members(id),
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator')),
  joined_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL,
  UNIQUE(room_id, member_id)
);
INSERT INTO room_memberships_new SELECT * FROM room_memberships;
DROP TABLE room_memberships;
ALTER TABLE room_memberships_new RENAME TO room_memberships;

-- comments
CREATE TABLE comments_new (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  post_id     TEXT NOT NULL REFERENCES posts(id),
  author_id   TEXT NOT NULL REFERENCES members(id),
  parent_id   TEXT REFERENCES comments(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL
);
INSERT INTO comments_new SELECT * FROM comments;
DROP TABLE comments;
ALTER TABLE comments_new RENAME TO comments;

-- reactions
CREATE TABLE reactions_new (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  target_type  TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id    TEXT NOT NULL,
  member_id    TEXT NOT NULL REFERENCES members(id),
  emoji        TEXT NOT NULL DEFAULT '❤️',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(target_type, target_id, member_id)
);
INSERT INTO reactions_new SELECT * FROM reactions;
DROP TABLE reactions;
ALTER TABLE reactions_new RENAME TO reactions;

-- poll_votes
CREATE TABLE poll_votes_new (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  poll_id     TEXT NOT NULL REFERENCES polls(id),
  member_id   TEXT NOT NULL REFERENCES members(id),
  option_id   TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poll_id, member_id)
);
INSERT INTO poll_votes_new SELECT * FROM poll_votes;
DROP TABLE poll_votes;
ALTER TABLE poll_votes_new RENAME TO poll_votes;

-- event_rsvps
CREATE TABLE event_rsvps_new (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_id    TEXT NOT NULL REFERENCES events(id),
  member_id   TEXT NOT NULL REFERENCES members(id),
  status      TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going', 'waitlist')),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, member_id)
);
INSERT INTO event_rsvps_new SELECT * FROM event_rsvps;
DROP TABLE event_rsvps;
ALTER TABLE event_rsvps_new RENAME TO event_rsvps;

-- challenge_participations
CREATE TABLE challenge_participations_new (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  challenge_id      TEXT NOT NULL REFERENCES challenges(id),
  member_id         TEXT NOT NULL REFERENCES members(id),
  chapter_id        TEXT REFERENCES chapters(id),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  current_value     REAL NOT NULL DEFAULT 0,
  target_value      REAL,
  completion_pct    REAL NOT NULL DEFAULT 0,
  completed_at      TIMESTAMP NULL,
  last_logged_at    TIMESTAMP,
  log_count         INTEGER NOT NULL DEFAULT 0,
  points_awarded    INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(challenge_id, member_id)
);
INSERT INTO challenge_participations_new SELECT * FROM challenge_participations;
DROP TABLE challenge_participations;
ALTER TABLE challenge_participations_new RENAME TO challenge_participations;

-- challenge_logs
CREATE TABLE challenge_logs_new (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  participation_id  TEXT NOT NULL REFERENCES challenge_participations(id),
  member_id         TEXT NOT NULL REFERENCES members(id),
  value             REAL NOT NULL,
  note              TEXT,
  logged_date       TEXT NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO challenge_logs_new SELECT * FROM challenge_logs;
DROP TABLE challenge_logs;
ALTER TABLE challenge_logs_new RENAME TO challenge_logs;

-- daily_content_deliveries
CREATE TABLE daily_content_deliveries_new (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id       TEXT NOT NULL REFERENCES members(id),
  content_id      TEXT NOT NULL REFERENCES daily_content(id),
  delivery_date   TEXT NOT NULL,
  delivered_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    TIMESTAMP NULL,
  UNIQUE(member_id, delivery_date)
);
INSERT INTO daily_content_deliveries_new SELECT * FROM daily_content_deliveries;
DROP TABLE daily_content_deliveries;
ALTER TABLE daily_content_deliveries_new RENAME TO daily_content_deliveries;

-- subscriptions
CREATE TABLE subscriptions_new (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id         TEXT NOT NULL REFERENCES members(id),
  tier              TEXT NOT NULL CHECK (tier IN ('free', 'basic', 'premium')),
  status            TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'grace_period', 'expired')),
  payment_provider  TEXT CHECK (payment_provider IN ('paystack', 'stripe') OR payment_provider IS NULL),
  provider_sub_id   TEXT,
  provider_cust_id  TEXT,
  amount_cents      INTEGER,
  currency_code     TEXT,
  billing_interval  TEXT CHECK (billing_interval IN ('monthly', 'annual') OR billing_interval IS NULL),
  current_period_start TIMESTAMP,
  current_period_end   TIMESTAMP,
  grace_period_days INTEGER NOT NULL DEFAULT 0,
  cancelled_at      TIMESTAMP NULL,
  cancellation_reason TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at        TIMESTAMP NULL
);
INSERT INTO subscriptions_new SELECT * FROM subscriptions;
DROP TABLE subscriptions;
ALTER TABLE subscriptions_new RENAME TO subscriptions;

-- subscription_events
CREATE TABLE subscription_events_new (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  subscription_id   TEXT NOT NULL REFERENCES subscriptions(id),
  member_id         TEXT NOT NULL REFERENCES members(id),
  event_type        TEXT NOT NULL,
  from_tier         TEXT,
  to_tier           TEXT,
  provider_event_id TEXT,
  payload_json      TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO subscription_events_new SELECT * FROM subscription_events;
DROP TABLE subscription_events;
ALTER TABLE subscription_events_new RENAME TO subscription_events;

-- member_badges
CREATE TABLE member_badges_new (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id   TEXT NOT NULL REFERENCES members(id),
  badge_id    TEXT NOT NULL REFERENCES badges(id),
  awarded_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  awarded_by  TEXT REFERENCES members(id),
  UNIQUE(member_id, badge_id)
);
INSERT INTO member_badges_new SELECT * FROM member_badges;
DROP TABLE member_badges;
ALTER TABLE member_badges_new RENAME TO member_badges;

-- notifications
CREATE TABLE notifications_new (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id       TEXT NOT NULL REFERENCES members(id),
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  action_url      TEXT,
  is_read         INTEGER NOT NULL DEFAULT 0,
  push_sent       INTEGER NOT NULL DEFAULT 0,
  push_sent_at    TIMESTAMP NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL
);
INSERT INTO notifications_new SELECT * FROM notifications;
DROP TABLE notifications;
ALTER TABLE notifications_new RENAME TO notifications;

-- detector_responses
CREATE TABLE detector_responses_new (
  id                    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id             TEXT NOT NULL REFERENCES members(id),
  question_set_id       TEXT NOT NULL REFERENCES detector_question_sets(id),
  detector_type         TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  responses_json        TEXT NOT NULL DEFAULT '{}',
  started_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at          TIMESTAMP NULL,
  last_question_id      TEXT,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO detector_responses_new SELECT * FROM detector_responses;
DROP TABLE detector_responses;
ALTER TABLE detector_responses_new RENAME TO detector_responses;

-- detector_results
CREATE TABLE detector_results_new (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id           TEXT NOT NULL REFERENCES members(id),
  response_id         TEXT NOT NULL UNIQUE REFERENCES detector_responses(id),
  detector_type       TEXT NOT NULL,
  question_set_id     TEXT NOT NULL REFERENCES detector_question_sets(id),
  question_set_version TEXT NOT NULL,
  result_summary_json TEXT NOT NULL,
  result_full_json    TEXT,
  pdf_r2_key          TEXT,
  pdf_generated_at    TIMESTAMP NULL,
  retake_available_at TIMESTAMP,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO detector_results_new SELECT * FROM detector_results;
DROP TABLE detector_results;
ALTER TABLE detector_results_new RENAME TO detector_results;

-- book_reading_progress
CREATE TABLE book_reading_progress_new (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  book_id       TEXT NOT NULL REFERENCES books(id),
  member_id     TEXT NOT NULL REFERENCES members(id),
  pages_read    INTEGER NOT NULL DEFAULT 0,
  total_pages   INTEGER,
  status        TEXT NOT NULL DEFAULT 'reading' CHECK (status IN ('not_started', 'reading', 'completed')),
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(book_id, member_id)
);
INSERT INTO book_reading_progress_new SELECT * FROM book_reading_progress;
DROP TABLE book_reading_progress;
ALTER TABLE book_reading_progress_new RENAME TO book_reading_progress;

-- room_messages
CREATE TABLE room_messages_new (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  room_id     TEXT NOT NULL REFERENCES rooms(id),
  member_id   TEXT NOT NULL REFERENCES members(id),
  content     TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'media', 'system')),
  media_r2_key TEXT,
  reply_to_id TEXT REFERENCES room_messages(id),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL
);
INSERT INTO room_messages_new SELECT * FROM room_messages;
DROP TABLE room_messages;
ALTER TABLE room_messages_new RENAME TO room_messages;

-- admin_audit_log
CREATE TABLE admin_audit_log_new (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  admin_id        TEXT NOT NULL REFERENCES members(id),
  action          TEXT NOT NULL,
  target_type     TEXT,
  target_id       TEXT,
  before_json     TEXT,
  after_json      TEXT,
  ip_address      TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO admin_audit_log_new SELECT * FROM admin_audit_log;
DROP TABLE admin_audit_log;
ALTER TABLE admin_audit_log_new RENAME TO admin_audit_log;

PRAGMA foreign_keys = ON;
