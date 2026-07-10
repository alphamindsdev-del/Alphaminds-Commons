-- AlphaMinds Commons — Initial Schema
-- Version 1.0 | 37 tables
-- This migration is additive and idempotent.

-- 1. chapters
CREATE TABLE IF NOT EXISTS chapters (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('university', 'city', 'country', 'global')),
  country_code  TEXT,
  city          TEXT,
  university    TEXT,
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  is_active     INTEGER NOT NULL DEFAULT 1,
  founded_at    TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_chapters_slug ON chapters(slug);
CREATE INDEX IF NOT EXISTS idx_chapters_country ON chapters(country_code);
CREATE INDEX IF NOT EXISTS idx_chapters_type ON chapters(type);

-- 2. members
CREATE TABLE IF NOT EXISTS members (
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
  primary_house    TEXT NOT NULL CHECK (primary_house IN ('becoming', 'connection', 'wellness', 'play', 'humanity')),
  role             TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'house_lead', 'admin', 'founder')),
  is_active        INTEGER NOT NULL DEFAULT 1,
  email_verified   INTEGER NOT NULL DEFAULT 0,
  push_token       TEXT,
  last_active_at   TIMESTAMP,
  session_revoked_at TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at       TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_username ON members(username);
CREATE INDEX IF NOT EXISTS idx_members_chapter ON members(chapter_id);
CREATE INDEX IF NOT EXISTS idx_members_primary_house ON members(primary_house);
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);

-- 3. member_house_selections
CREATE TABLE IF NOT EXISTS member_house_selections (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id   TEXT NOT NULL REFERENCES members(id),
  house       TEXT NOT NULL CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity')),
  is_primary  INTEGER NOT NULL DEFAULT 0,
  joined_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL,
  UNIQUE(member_id, house)
);
CREATE INDEX IF NOT EXISTS idx_member_houses_member ON member_house_selections(member_id);
CREATE INDEX IF NOT EXISTS idx_member_houses_house ON member_house_selections(house);

-- 4. member_stats
CREATE TABLE IF NOT EXISTS member_stats (
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
CREATE INDEX IF NOT EXISTS idx_member_stats_total ON member_stats(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_member_stats_impact ON member_stats(impact_score DESC);

-- 5. member_chapter_history
CREATE TABLE IF NOT EXISTS member_chapter_history (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id       TEXT NOT NULL REFERENCES members(id),
  from_chapter_id TEXT REFERENCES chapters(id),
  to_chapter_id   TEXT REFERENCES chapters(id),
  reason          TEXT,
  transferred_by  TEXT REFERENCES members(id),
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chapter_history_member ON member_chapter_history(member_id);

-- 6. member_context_snapshots
CREATE TABLE IF NOT EXISTS member_context_snapshots (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id       TEXT NOT NULL REFERENCES members(id),
  snapshot_date   TEXT NOT NULL,
  snapshot_json   TEXT NOT NULL,
  model_version   TEXT NOT NULL DEFAULT '1.0',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_snapshots_member ON member_context_snapshots(member_id);

-- 7. houses
CREATE TABLE IF NOT EXISTS houses (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  tagline      TEXT NOT NULL,
  description  TEXT NOT NULL,
  icon_emoji   TEXT NOT NULL,
  color_hex    TEXT NOT NULL,
  weekly_theme TEXT NOT NULL,
  sort_order   INTEGER NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. rooms
CREATE TABLE IF NOT EXISTS rooms (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  chapter_id       TEXT REFERENCES chapters(id),
  house            TEXT NOT NULL CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity')),
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
CREATE INDEX IF NOT EXISTS idx_rooms_chapter ON rooms(chapter_id);
CREATE INDEX IF NOT EXISTS idx_rooms_house ON rooms(house);
CREATE INDEX IF NOT EXISTS idx_rooms_min_tier ON rooms(min_tier);

-- 9. room_memberships
CREATE TABLE IF NOT EXISTS room_memberships (
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
CREATE INDEX IF NOT EXISTS idx_room_memberships_room ON room_memberships(room_id);
CREATE INDEX IF NOT EXISTS idx_room_memberships_member ON room_memberships(member_id);

-- 10. posts
CREATE TABLE IF NOT EXISTS posts (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  room_id      TEXT NOT NULL REFERENCES rooms(id),
  author_id    TEXT NOT NULL REFERENCES members(id),
  chapter_id   TEXT REFERENCES chapters(id),
  house        TEXT NOT NULL CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity')),
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
CREATE INDEX IF NOT EXISTS idx_posts_room ON posts(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_chapter ON posts(chapter_id);
CREATE INDEX IF NOT EXISTS idx_posts_house ON posts(house);

-- 11. comments
CREATE TABLE IF NOT EXISTS comments (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  post_id     TEXT NOT NULL REFERENCES posts(id),
  author_id   TEXT NOT NULL REFERENCES members(id),
  parent_id   TEXT REFERENCES comments(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- 12. reactions
CREATE TABLE IF NOT EXISTS reactions (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  target_type  TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id    TEXT NOT NULL,
  member_id    TEXT NOT NULL REFERENCES members(id),
  emoji        TEXT NOT NULL DEFAULT '❤️',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(target_type, target_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reactions_member ON reactions(member_id);

-- 13. polls
CREATE TABLE IF NOT EXISTS polls (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  post_id      TEXT NOT NULL UNIQUE REFERENCES posts(id),
  question     TEXT NOT NULL,
  options_json TEXT NOT NULL,
  ends_at      TIMESTAMP,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMP NULL
);

-- 14. poll_votes
CREATE TABLE IF NOT EXISTS poll_votes (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  poll_id     TEXT NOT NULL REFERENCES polls(id),
  member_id   TEXT NOT NULL REFERENCES members(id),
  option_id   TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poll_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);

-- 15. events
CREATE TABLE IF NOT EXISTS events (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  chapter_id      TEXT REFERENCES chapters(id),
  house           TEXT CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity') OR house IS NULL),
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
CREATE INDEX IF NOT EXISTS idx_events_chapter ON events(chapter_id);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_house ON events(house);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(is_published, starts_at);

-- 16. event_rsvps
CREATE TABLE IF NOT EXISTS event_rsvps (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_id    TEXT NOT NULL REFERENCES events(id),
  member_id   TEXT NOT NULL REFERENCES members(id),
  status      TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going', 'waitlist')),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_rsvps_event ON event_rsvps(event_id, status);
CREATE INDEX IF NOT EXISTS idx_rsvps_member ON event_rsvps(member_id);

-- 17. challenges
CREATE TABLE IF NOT EXISTS challenges (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  house           TEXT NOT NULL CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity', 'global')),
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
CREATE INDEX IF NOT EXISTS idx_challenges_house ON challenges(house);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active, starts_at);

-- 18. challenge_participations
CREATE TABLE IF NOT EXISTS challenge_participations (
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
CREATE INDEX IF NOT EXISTS idx_participations_challenge ON challenge_participations(challenge_id);
CREATE INDEX IF NOT EXISTS idx_participations_member ON challenge_participations(member_id);
CREATE INDEX IF NOT EXISTS idx_participations_status ON challenge_participations(status);

-- 19. challenge_logs
CREATE TABLE IF NOT EXISTS challenge_logs (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  participation_id  TEXT NOT NULL REFERENCES challenge_participations(id),
  member_id         TEXT NOT NULL REFERENCES members(id),
  value             REAL NOT NULL,
  note              TEXT,
  logged_date       TEXT NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_challenge_logs_participation ON challenge_logs(participation_id);
CREATE INDEX IF NOT EXISTS idx_challenge_logs_date ON challenge_logs(member_id, logged_date);

-- 20. daily_content
CREATE TABLE IF NOT EXISTS daily_content (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  house           TEXT NOT NULL CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity', 'global')),
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
CREATE INDEX IF NOT EXISTS idx_daily_content_date ON daily_content(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_daily_content_dow ON daily_content(day_of_week);
CREATE INDEX IF NOT EXISTS idx_daily_content_house ON daily_content(house);
CREATE INDEX IF NOT EXISTS idx_daily_content_published ON daily_content(is_published, scheduled_date);

-- 21. daily_content_deliveries
CREATE TABLE IF NOT EXISTS daily_content_deliveries (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id       TEXT NOT NULL REFERENCES members(id),
  content_id      TEXT NOT NULL REFERENCES daily_content(id),
  delivery_date   TEXT NOT NULL,
  delivered_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    TIMESTAMP NULL,
  UNIQUE(member_id, delivery_date)
);
CREATE INDEX IF NOT EXISTS idx_deliveries_member ON daily_content_deliveries(member_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON daily_content_deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_content ON daily_content_deliveries(content_id);

-- 22. subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
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
CREATE INDEX IF NOT EXISTS idx_subscriptions_member ON subscriptions(member_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(payment_provider, provider_sub_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- 23. subscription_events
CREATE TABLE IF NOT EXISTS subscription_events (
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
CREATE INDEX IF NOT EXISTS idx_sub_events_member ON subscription_events(member_id);
CREATE INDEX IF NOT EXISTS idx_sub_events_subscription ON subscription_events(subscription_id);

-- 24. badges
CREATE TABLE IF NOT EXISTS badges (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  description  TEXT,
  icon_r2_key  TEXT,
  house        TEXT CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity') OR house IS NULL),
  trigger_type TEXT NOT NULL,
  trigger_value INTEGER,
  points_value  INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 25. member_badges
CREATE TABLE IF NOT EXISTS member_badges (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id   TEXT NOT NULL REFERENCES members(id),
  badge_id    TEXT NOT NULL REFERENCES badges(id),
  awarded_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  awarded_by  TEXT REFERENCES members(id),
  UNIQUE(member_id, badge_id)
);
CREATE INDEX IF NOT EXISTS idx_member_badges_member ON member_badges(member_id);

-- 26. leaderboard_snapshots
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  snapshot_at  TIMESTAMP NOT NULL,
  period_type  TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),
  scope_type   TEXT NOT NULL CHECK (scope_type IN ('global', 'chapter', 'house')),
  scope_id     TEXT,
  house        TEXT CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity') OR house IS NULL),
  rank         INTEGER NOT NULL,
  member_id    TEXT NOT NULL REFERENCES members(id),
  score        INTEGER NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_scope ON leaderboard_snapshots(scope_type, scope_id, period_type, rank ASC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_member ON leaderboard_snapshots(member_id);

-- 27. notifications
CREATE TABLE IF NOT EXISTS notifications (
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
CREATE INDEX IF NOT EXISTS idx_notifications_member ON notifications(member_id, is_read, created_at DESC);

-- 28. detector_question_sets
CREATE TABLE IF NOT EXISTS detector_question_sets (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  detector_type   TEXT NOT NULL CHECK (detector_type IN ('personality', 'purpose', 'health_index', 'love_life')),
  version         TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  questions_json  TEXT NOT NULL,
  is_active       INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(detector_type, version)
);
CREATE INDEX IF NOT EXISTS idx_question_sets_type ON detector_question_sets(detector_type, is_active);

-- 29. detector_responses
CREATE TABLE IF NOT EXISTS detector_responses (
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
CREATE INDEX IF NOT EXISTS idx_detector_responses_member ON detector_responses(member_id, detector_type);

-- 30. detector_results
CREATE TABLE IF NOT EXISTS detector_results (
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
CREATE INDEX IF NOT EXISTS idx_detector_results_member ON detector_results(member_id, detector_type);
CREATE INDEX IF NOT EXISTS idx_detector_results_response ON detector_results(response_id);

-- 31. books
CREATE TABLE IF NOT EXISTS books (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,
  cover_r2_key    TEXT,
  description     TEXT,
  month           TEXT NOT NULL,
  discussion_room_id TEXT REFERENCES rooms(id),
  is_active       INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_books_month ON books(month);

-- 32. book_reading_progress
CREATE TABLE IF NOT EXISTS book_reading_progress (
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

-- 33. podcasts
CREATE TABLE IF NOT EXISTS podcasts (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title       TEXT NOT NULL,
  description TEXT,
  house       TEXT CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity', 'global') OR house IS NULL),
  cover_r2_key TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 34. podcast_episodes
CREATE TABLE IF NOT EXISTS podcast_episodes (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  podcast_id      TEXT NOT NULL REFERENCES podcasts(id),
  title           TEXT NOT NULL,
  description     TEXT,
  audio_r2_key    TEXT NOT NULL,
  duration_seconds INTEGER,
  episode_number  INTEGER,
  published_at    TIMESTAMP,
  min_tier        TEXT NOT NULL DEFAULT 'free' CHECK (min_tier IN ('free', 'basic', 'premium')),
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL
);
CREATE INDEX IF NOT EXISTS idx_episodes_podcast ON podcast_episodes(podcast_id, episode_number);

-- 35. cron_execution_logs
CREATE TABLE IF NOT EXISTS cron_execution_logs (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  job_name        TEXT NOT NULL,
  scheduled_at    TIMESTAMP NOT NULL,
  started_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    TIMESTAMP NULL,
  status          TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed', 'partial')),
  records_processed INTEGER,
  error_message   TEXT,
  metadata_json   TEXT
);
CREATE INDEX IF NOT EXISTS idx_cron_logs_job ON cron_execution_logs(job_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_logs_status ON cron_execution_logs(status, started_at DESC);

-- 36. room_messages (Phase 2 — Schema defined now)
CREATE TABLE IF NOT EXISTS room_messages (
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
CREATE INDEX IF NOT EXISTS idx_room_messages_room ON room_messages(room_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_room_messages_member ON room_messages(member_id);

-- 37. admin_audit_log
CREATE TABLE IF NOT EXISTS admin_audit_log (
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
CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON admin_audit_log(target_type, target_id);
