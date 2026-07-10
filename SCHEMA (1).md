# SCHEMA.md
# AlphaMinds Commons — Complete D1 Database Schema
# Version 1.0 | Senior Staff Engineer Specification

---

## 0. Schema Design Principles

**Additive migrations only.** Never drop a column or rename a column in a migration.
Add new columns with defaults. Rename by adding a new column, backfilling, and
deprecating the old one over multiple releases.

**Soft deletes everywhere.** Every table has `deleted_at TIMESTAMP NULL`. Application
queries always include `WHERE deleted_at IS NULL`. Hard deletes are performed only by
the GDPR data deletion job, and only after a 30-day grace period.

**Timestamps on every row.** `created_at` and `updated_at` on every table, no exceptions.
`updated_at` is updated by the application layer on every write (D1 does not have
auto-update triggers in the same way as MySQL).

**Cursor-based pagination.** No OFFSET queries in production. All list queries paginate
using `WHERE id > :cursor ORDER BY id ASC LIMIT :limit`. The cursor is the last seen
`id` (or a compound cursor for multi-column ordering).

**House enum is a string, not a foreign key.** The Five Houses are fixed by product
design and will not change. Using an enum string column (`'becoming' | 'connection' |
'wellness' | 'play' | 'humanity' | 'global'`) instead of a foreign key avoids a join
on every query that filters by house. This is a deliberate denormalization.

**chapter_id is nullable = global.** A NULL `chapter_id` means the record belongs to
the global platform, not to any specific chapter. A non-null `chapter_id` means it
belongs to that chapter only. This is enforced by application logic and documented here
so no agent or engineer accidentally makes `chapter_id NOT NULL`.

**JSON columns for structured blobs.** Detector results, notification payloads, and
event metadata are stored as JSON in TEXT columns. SQLite's JSON functions allow
querying into these columns when needed, but they are primarily opaque to the DB.

---

## 1. Migration File Naming Convention

```
migrations/
  0001_initial_schema.sql           → All Phase 1 tables
  0002_add_room_messages.sql        → Phase 2: Group Chat tables
  0003_add_detector_tables.sql      → Phase 2: Detector tables
  0004_add_subscription_history.sql → Phase 3: Subscription tables
  0005_add_wellness_tracking.sql    → Phase 4: Wellness tables
  0006_add_chapter_tables.sql       → Phase 5: Chapter expansion
```

Format: `{NNNN}_{description}.sql` — zero-padded 4-digit sequence.
Each migration file is idempotent (uses `CREATE TABLE IF NOT EXISTS`).
Migration state is tracked in `_migrations` meta-table (Wrangler manages this).

---

## 2. Core Schema

### 2.1 chapters

```sql
CREATE TABLE IF NOT EXISTS chapters (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug          TEXT NOT NULL UNIQUE,          -- 'nairobi-city', 'uct-cape-town'
  name          TEXT NOT NULL,                 -- 'Nairobi City Chapter'
  type          TEXT NOT NULL                  -- 'university' | 'city' | 'country' | 'global'
                CHECK (type IN ('university', 'city', 'country', 'global')),
  country_code  TEXT,                          -- ISO 3166-1 alpha-2, e.g. 'KE'
  city          TEXT,
  university    TEXT,                          -- populated only for university chapters
  timezone      TEXT NOT NULL DEFAULT 'UTC',  -- IANA timezone, e.g. 'Africa/Nairobi'
  is_active     INTEGER NOT NULL DEFAULT 1,   -- 0 = suspended
  founded_at    TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_chapters_slug ON chapters(slug);
CREATE INDEX IF NOT EXISTS idx_chapters_country ON chapters(country_code);
CREATE INDEX IF NOT EXISTS idx_chapters_type ON chapters(type);
```

**Note:** A global pseudo-chapter record exists with `id = 'global'` and
`type = 'global'`. This simplifies application logic that needs to reference
"the global context" without NULL handling.

---

### 2.2 members

```sql
CREATE TABLE IF NOT EXISTS members (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email            TEXT NOT NULL UNIQUE,
  username         TEXT NOT NULL UNIQUE,
  display_name     TEXT NOT NULL,
  password_hash    TEXT,                       -- NULL if OAuth-only
  google_id        TEXT UNIQUE,               -- NULL if email/password only (Phase 2)
  avatar_r2_key    TEXT,                       -- R2 object key for profile image
  bio              TEXT,
  country_code     TEXT,                       -- ISO 3166-1 alpha-2
  city             TEXT,
  age              INTEGER,
  gender           TEXT                        -- 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | NULL
                   CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say') OR gender IS NULL),
  chapter_id       TEXT REFERENCES chapters(id),  -- NULL = global member
  primary_house    TEXT NOT NULL               -- house enum
                   CHECK (primary_house IN ('becoming', 'connection', 'wellness', 'play', 'humanity')),
  role             TEXT NOT NULL DEFAULT 'member'
                   CHECK (role IN ('member', 'moderator', 'house_lead', 'admin', 'founder')),
  is_active        INTEGER NOT NULL DEFAULT 1,
  email_verified   INTEGER NOT NULL DEFAULT 0,
  push_token       TEXT,                       -- Web Push subscription JSON
  last_active_at   TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at       TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_username ON members(username);
CREATE INDEX IF NOT EXISTS idx_members_chapter ON members(chapter_id);
CREATE INDEX IF NOT EXISTS idx_members_primary_house ON members(primary_house);
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);
```

---

### 2.3 member_house_selections

```sql
-- Tracks which houses a member has selected (primary + secondary).
-- The primary_house is also stored denormalized on the members table for fast access.
-- This table is the authoritative record of all house selections.
CREATE TABLE IF NOT EXISTS member_house_selections (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id   TEXT NOT NULL REFERENCES members(id),
  house       TEXT NOT NULL
              CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity')),
  is_primary  INTEGER NOT NULL DEFAULT 0,      -- 1 = primary house
  joined_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL,
  UNIQUE(member_id, house)
);

CREATE INDEX IF NOT EXISTS idx_member_houses_member ON member_house_selections(member_id);
CREATE INDEX IF NOT EXISTS idx_member_houses_house ON member_house_selections(house);
```

---

### 2.4 member_stats

```sql
-- Denormalized score/stats table per member.
-- Updated incrementally on participation events.
-- Source of truth for Profile page and Leaderboard.
-- These values are eventually consistent with the activity tables.
-- The Cron recalculation job reconciles any drift nightly.
CREATE TABLE IF NOT EXISTS member_stats (
  id                    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id             TEXT NOT NULL UNIQUE REFERENCES members(id),

  -- Per-House scores (incremented on participation events)
  becoming_score        INTEGER NOT NULL DEFAULT 0,
  connection_score      INTEGER NOT NULL DEFAULT 0,
  wellness_score        INTEGER NOT NULL DEFAULT 0,
  play_score            INTEGER NOT NULL DEFAULT 0,
  humanity_score        INTEGER NOT NULL DEFAULT 0,

  -- Aggregate stats
  total_score           INTEGER NOT NULL DEFAULT 0,  -- sum of all house scores
  impact_score          INTEGER NOT NULL DEFAULT 0,  -- weighted: volunteer hours, challenges, detectors
  current_streak_days   INTEGER NOT NULL DEFAULT 0,  -- consecutive days with activity
  longest_streak_days   INTEGER NOT NULL DEFAULT 0,
  total_points          INTEGER NOT NULL DEFAULT 0,  -- gamification points (badges, challenges)
  volunteer_hours       REAL NOT NULL DEFAULT 0.0,

  -- Counts
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
```

---

### 2.5 member_chapter_history

```sql
-- Audit trail of chapter transfers.
CREATE TABLE IF NOT EXISTS member_chapter_history (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id       TEXT NOT NULL REFERENCES members(id),
  from_chapter_id TEXT REFERENCES chapters(id),  -- NULL = was global
  to_chapter_id   TEXT REFERENCES chapters(id),  -- NULL = moving to global
  reason          TEXT,                           -- 'signup' | 'transfer' | 'chapter_closed'
  transferred_by  TEXT REFERENCES members(id),   -- admin who executed transfer, NULL if self
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chapter_history_member ON member_chapter_history(member_id);
```

---

### 2.6 member_context_snapshots

```sql
-- Alpha Coach AI (Phase 4) context. Schema exists from Phase 1.
-- Written by Phase 4 pipeline. Read by AI context assembly.
-- Stores a structured JSON snapshot of a member's current state for LLM consumption.
CREATE TABLE IF NOT EXISTS member_context_snapshots (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id       TEXT NOT NULL REFERENCES members(id),
  snapshot_date   TEXT NOT NULL,        -- YYYY-MM-DD
  snapshot_json   TEXT NOT NULL,        -- full JSON context blob
  model_version   TEXT NOT NULL DEFAULT '1.0',  -- schema version of the JSON
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_member ON member_context_snapshots(member_id);
```

**snapshot_json shape (documented, not enforced by DB):**
```json
{
  "member_id": "...",
  "snapshot_date": "2025-01-15",
  "primary_house": "becoming",
  "houses": ["becoming", "connection"],
  "scores": { "becoming": 120, "connection": 45, "wellness": 30, "play": 10, "humanity": 60 },
  "streak_days": 14,
  "challenges_completed": ["walking-jan-2025", "reading-jan-2025"],
  "detector_results": { "personality": { "result_summary": "..." }, "purpose": null },
  "recent_goals": [],
  "weekly_activity_summary": "...",
  "model_version": "1.0"
}
```

---

### 2.7 houses

```sql
-- House metadata (descriptions, icons, config).
-- Five rows only. Seeded at initialization. Never written by application code.
CREATE TABLE IF NOT EXISTS houses (
  id           TEXT PRIMARY KEY,               -- 'becoming' | 'connection' | 'wellness' | 'play' | 'humanity'
  name         TEXT NOT NULL,                  -- 'House of Becoming'
  tagline      TEXT NOT NULL,                  -- 'Grow Well.'
  description  TEXT NOT NULL,
  icon_emoji   TEXT NOT NULL,                  -- '🏔'
  color_hex    TEXT NOT NULL,                  -- '#...' primary brand color for this house
  weekly_theme TEXT NOT NULL,                  -- 'monday' | 'wednesday' | etc.
  sort_order   INTEGER NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2.8 rooms

```sql
CREATE TABLE IF NOT EXISTS rooms (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  chapter_id       TEXT REFERENCES chapters(id),  -- NULL = global room
  house            TEXT NOT NULL
                   CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity')),
  name             TEXT NOT NULL,                  -- 'BeatLift Room'
  slug             TEXT NOT NULL,                  -- 'beatlift-room'
  description      TEXT,
  cover_r2_key     TEXT,
  is_private       INTEGER NOT NULL DEFAULT 0,    -- 0 = public, 1 = private (Phase 2)
  min_tier         TEXT NOT NULL DEFAULT 'free'   -- 'free' | 'basic' | 'premium'
                   CHECK (min_tier IN ('free', 'basic', 'premium')),
  member_count     INTEGER NOT NULL DEFAULT 0,    -- denormalized, updated on join/leave
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
```

---

### 2.9 room_memberships

```sql
CREATE TABLE IF NOT EXISTS room_memberships (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  room_id     TEXT NOT NULL REFERENCES rooms(id),
  member_id   TEXT NOT NULL REFERENCES members(id),
  role        TEXT NOT NULL DEFAULT 'member'
              CHECK (role IN ('member', 'moderator')),
  joined_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL,
  UNIQUE(room_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_room_memberships_room ON room_memberships(room_id);
CREATE INDEX IF NOT EXISTS idx_room_memberships_member ON room_memberships(member_id);
```

---

### 2.10 posts

```sql
CREATE TABLE IF NOT EXISTS posts (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  room_id      TEXT NOT NULL REFERENCES rooms(id),
  author_id    TEXT NOT NULL REFERENCES members(id),
  chapter_id   TEXT REFERENCES chapters(id),   -- denormalized for fast chapter scoping
  house        TEXT NOT NULL                   -- denormalized from room
               CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity')),
  content      TEXT NOT NULL,
  media_r2_keys TEXT,                          -- JSON array of R2 keys, NULL if text-only
  post_type    TEXT NOT NULL DEFAULT 'text'
               CHECK (post_type IN ('text', 'media', 'poll', 'event_share', 'challenge_share')),
  is_pinned    INTEGER NOT NULL DEFAULT 0,
  reaction_count INTEGER NOT NULL DEFAULT 0,  -- denormalized
  comment_count  INTEGER NOT NULL DEFAULT 0,  -- denormalized
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_room ON posts(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_chapter ON posts(chapter_id);
CREATE INDEX IF NOT EXISTS idx_posts_house ON posts(house);
```

---

### 2.11 comments

```sql
CREATE TABLE IF NOT EXISTS comments (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  post_id     TEXT NOT NULL REFERENCES posts(id),
  author_id   TEXT NOT NULL REFERENCES members(id),
  parent_id   TEXT REFERENCES comments(id),  -- NULL = top-level, non-null = reply
  content     TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
```

---

### 2.12 reactions

```sql
-- Reactions on posts (and eventually comments).
-- One reaction type per member per post (upsert pattern).
CREATE TABLE IF NOT EXISTS reactions (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  target_type  TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id    TEXT NOT NULL,              -- post_id or comment_id
  member_id    TEXT NOT NULL REFERENCES members(id),
  emoji        TEXT NOT NULL DEFAULT '❤️',  -- reaction type
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(target_type, target_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reactions_member ON reactions(member_id);
```

---

### 2.13 polls

```sql
CREATE TABLE IF NOT EXISTS polls (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  post_id      TEXT NOT NULL UNIQUE REFERENCES posts(id),
  question     TEXT NOT NULL,
  options_json TEXT NOT NULL,   -- JSON: [{ "id": "a", "text": "Option A" }, ...]
  ends_at      TIMESTAMP,       -- NULL = never expires
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  poll_id     TEXT NOT NULL REFERENCES polls(id),
  member_id   TEXT NOT NULL REFERENCES members(id),
  option_id   TEXT NOT NULL,   -- matches id in options_json
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poll_id, member_id)   -- one vote per member per poll
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
```

---

### 2.14 events

```sql
CREATE TABLE IF NOT EXISTS events (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  chapter_id      TEXT REFERENCES chapters(id),  -- NULL = global event
  house           TEXT                            -- NULL = global/multi-house
                  CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity') OR house IS NULL),
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  cover_r2_key    TEXT,
  event_type      TEXT NOT NULL
                  CHECK (event_type IN (
                    'alpha_circle', 'beatlift', 'humanity_day', 'book_club',
                    'workshop', 'swimming', 'games', 'summit', 'festival', 'other'
                  )),
  format          TEXT NOT NULL DEFAULT 'physical'
                  CHECK (format IN ('physical', 'online', 'hybrid')),
  location_name   TEXT,
  location_address TEXT,
  location_coords TEXT,                          -- JSON: { "lat": ..., "lng": ... }
  online_url      TEXT,
  starts_at       TIMESTAMP NOT NULL,
  ends_at         TIMESTAMP NOT NULL,
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  rsvp_limit      INTEGER,                       -- NULL = unlimited
  rsvp_count      INTEGER NOT NULL DEFAULT 0,   -- denormalized
  min_tier        TEXT NOT NULL DEFAULT 'free'
                  CHECK (min_tier IN ('free', 'basic', 'premium')),
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
```

---

### 2.15 event_rsvps

```sql
CREATE TABLE IF NOT EXISTS event_rsvps (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_id    TEXT NOT NULL REFERENCES events(id),
  member_id   TEXT NOT NULL REFERENCES members(id),
  status      TEXT NOT NULL DEFAULT 'going'
              CHECK (status IN ('going', 'maybe', 'not_going', 'waitlist')),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_rsvps_event ON event_rsvps(event_id, status);
CREATE INDEX IF NOT EXISTS idx_rsvps_member ON event_rsvps(member_id);
```

---

### 2.16 challenges

```sql
-- Challenge templates (global definitions).
CREATE TABLE IF NOT EXISTS challenges (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  house           TEXT NOT NULL
                  CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity', 'global')),
  title           TEXT NOT NULL,                -- 'Walking Challenge'
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  instructions    TEXT,                         -- detailed how-to
  challenge_type  TEXT NOT NULL
                  CHECK (challenge_type IN ('daily', 'weekly', 'monthly', 'event_based')),
  metric_type     TEXT                          -- 'steps' | 'pages' | 'minutes' | 'entries' | 'custom'
                  CHECK (metric_type IN ('steps', 'pages', 'minutes', 'entries', 'custom') OR metric_type IS NULL),
  target_value    REAL,                         -- e.g. 5000 (steps per day)
  duration_days   INTEGER,                      -- NULL = open-ended
  points_reward   INTEGER NOT NULL DEFAULT 10,
  min_tier        TEXT NOT NULL DEFAULT 'free'
                  CHECK (min_tier IN ('free', 'basic', 'premium')),
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
```

---

### 2.17 challenge_participations

```sql
CREATE TABLE IF NOT EXISTS challenge_participations (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  challenge_id      TEXT NOT NULL REFERENCES challenges(id),
  member_id         TEXT NOT NULL REFERENCES members(id),
  chapter_id        TEXT REFERENCES chapters(id),  -- denormalized
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'abandoned')),
  current_value     REAL NOT NULL DEFAULT 0,      -- e.g. current step count
  target_value      REAL,                          -- copied from challenge at join time
  completion_pct    REAL NOT NULL DEFAULT 0,       -- 0.0 to 1.0
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
```

---

### 2.18 challenge_logs

```sql
-- Individual progress log entries for a challenge participation.
CREATE TABLE IF NOT EXISTS challenge_logs (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  participation_id  TEXT NOT NULL REFERENCES challenge_participations(id),
  member_id         TEXT NOT NULL REFERENCES members(id),  -- denormalized
  value             REAL NOT NULL,                          -- e.g. 3200 steps logged
  note              TEXT,
  logged_date       TEXT NOT NULL,                          -- YYYY-MM-DD
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_challenge_logs_participation ON challenge_logs(participation_id);
CREATE INDEX IF NOT EXISTS idx_challenge_logs_date ON challenge_logs(member_id, logged_date);
```

---

### 2.19 daily_content

```sql
-- Admin-authored daily content items. Scheduled for delivery.
CREATE TABLE IF NOT EXISTS daily_content (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  house           TEXT NOT NULL
                  CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity', 'global')),
  content_type    TEXT NOT NULL
                  CHECK (content_type IN ('insight', 'challenge', 'question', 'wellness_tip', 'humanity_action')),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  media_r2_key    TEXT,                          -- optional image
  scheduled_date  TEXT,                          -- YYYY-MM-DD, NULL = use day_of_week
  day_of_week     TEXT                           -- 'monday' | 'tuesday' | ... | NULL if date-specific
                  CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') OR day_of_week IS NULL),
  week_number     INTEGER,                       -- ISO week number, used with day_of_week for scheduling
  is_published    INTEGER NOT NULL DEFAULT 0,
  authored_by     TEXT REFERENCES members(id),  -- admin who created it
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL
);

-- Scheduling logic:
-- If scheduled_date IS NOT NULL → deliver on that specific date.
-- If scheduled_date IS NULL AND day_of_week IS NOT NULL → deliver on next matching weekday.
-- Cron selects: scheduled_date = today OR (scheduled_date IS NULL AND day_of_week = today's weekday)
-- If multiple items match, select the most recently created published item.

CREATE INDEX IF NOT EXISTS idx_daily_content_date ON daily_content(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_daily_content_dow ON daily_content(day_of_week);
CREATE INDEX IF NOT EXISTS idx_daily_content_house ON daily_content(house);
CREATE INDEX IF NOT EXISTS idx_daily_content_published ON daily_content(is_published, scheduled_date);
```

---

### 2.20 daily_content_deliveries

```sql
-- Per-member delivery log. Written by Cron. Prevents duplicate delivery.
-- This is the authoritative record of what each member received and when.
CREATE TABLE IF NOT EXISTS daily_content_deliveries (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id       TEXT NOT NULL REFERENCES members(id),
  content_id      TEXT NOT NULL REFERENCES daily_content(id),
  delivery_date   TEXT NOT NULL,                 -- YYYY-MM-DD
  delivered_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    TIMESTAMP NULL,                -- NULL = not yet engaged with
  UNIQUE(member_id, delivery_date)               -- one delivery per member per day
);

CREATE INDEX IF NOT EXISTS idx_deliveries_member ON daily_content_deliveries(member_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON daily_content_deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_content ON daily_content_deliveries(content_id);
```

---

### 2.21 subscriptions

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id         TEXT NOT NULL REFERENCES members(id),
  tier              TEXT NOT NULL
                    CHECK (tier IN ('free', 'basic', 'premium')),
  status            TEXT NOT NULL
                    CHECK (status IN ('active', 'cancelled', 'past_due', 'grace_period', 'expired')),
  payment_provider  TEXT                          -- 'paystack' | 'stripe' | NULL (free)
                    CHECK (payment_provider IN ('paystack', 'stripe') OR payment_provider IS NULL),
  provider_sub_id   TEXT,                         -- Paystack/Stripe subscription ID
  provider_cust_id  TEXT,                         -- Paystack/Stripe customer ID
  amount_cents      INTEGER,                      -- amount charged, in local currency minor unit
  currency_code     TEXT,                         -- 'NGN', 'GHS', 'USD', 'GBP', etc.
  billing_interval  TEXT                          -- 'monthly' | 'annual'
                    CHECK (billing_interval IN ('monthly', 'annual') OR billing_interval IS NULL),
  current_period_start TIMESTAMP,
  current_period_end   TIMESTAMP,
  -- Grace period: number of days after expiry before access is revoked.
  -- Business decision documented here, not hardcoded in middleware.
  -- Set to 0 for immediate revocation, 3-7 for typical grace period.
  grace_period_days INTEGER NOT NULL DEFAULT 0,
  cancelled_at      TIMESTAMP NULL,
  cancellation_reason TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at        TIMESTAMP NULL
);

-- Most queries need the current active subscription for a member.
CREATE INDEX IF NOT EXISTS idx_subscriptions_member ON subscriptions(member_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(payment_provider, provider_sub_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);
```

---

### 2.22 subscription_events

```sql
-- Immutable audit log of all subscription state changes.
-- Written on every webhook receipt. Never updated.
CREATE TABLE IF NOT EXISTS subscription_events (
  id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  subscription_id   TEXT NOT NULL REFERENCES subscriptions(id),
  member_id         TEXT NOT NULL REFERENCES members(id),
  event_type        TEXT NOT NULL,               -- 'created' | 'upgraded' | 'downgraded' | 'cancelled' | 'payment_failed' | 'renewed'
  from_tier         TEXT,
  to_tier           TEXT,
  provider_event_id TEXT,                        -- Paystack/Stripe event ID for deduplication
  payload_json      TEXT,                        -- raw webhook payload for debugging
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_events_member ON subscription_events(member_id);
CREATE INDEX IF NOT EXISTS idx_sub_events_subscription ON subscription_events(subscription_id);
```

---

### 2.23 badges

```sql
CREATE TABLE IF NOT EXISTS badges (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug         TEXT NOT NULL UNIQUE,             -- 'first-challenge', 'streak-7'
  name         TEXT NOT NULL,
  description  TEXT,
  icon_r2_key  TEXT,
  house        TEXT                              -- NULL = global badge
               CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity') OR house IS NULL),
  trigger_type TEXT NOT NULL,                   -- 'challenge_count' | 'streak' | 'event_count' | 'manual' | 'detector'
  trigger_value INTEGER,                         -- e.g. 7 for a 7-day streak badge
  points_value  INTEGER NOT NULL DEFAULT 0,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS member_badges (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id   TEXT NOT NULL REFERENCES members(id),
  badge_id    TEXT NOT NULL REFERENCES badges(id),
  awarded_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  awarded_by  TEXT REFERENCES members(id),      -- NULL if auto-awarded
  UNIQUE(member_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_member_badges_member ON member_badges(member_id);
```

---

### 2.24 leaderboard_snapshots

```sql
-- Pre-computed leaderboard snapshots. Written by Cron nightly.
-- Querying live leaderboards from member_stats at high traffic is fine for MVP.
-- This table becomes critical at scale when member_stats has 100k+ rows.
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  snapshot_at  TIMESTAMP NOT NULL,
  period_type  TEXT NOT NULL
               CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),
  scope_type   TEXT NOT NULL
               CHECK (scope_type IN ('global', 'chapter', 'house')),
  scope_id     TEXT,                            -- chapter_id or house name, NULL for global
  house        TEXT                             -- NULL = overall, or specific house leaderboard
               CHECK (house IN ('becoming', 'connection', 'wellness', 'play', 'humanity') OR house IS NULL),
  rank         INTEGER NOT NULL,
  member_id    TEXT NOT NULL REFERENCES members(id),
  score        INTEGER NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_scope ON leaderboard_snapshots(scope_type, scope_id, period_type, rank ASC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_member ON leaderboard_snapshots(member_id);
```

---

### 2.25 notifications

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id       TEXT NOT NULL REFERENCES members(id),
  type            TEXT NOT NULL,                 -- 'new_post' | 'new_comment' | 'new_event' | 'badge_awarded' | 'challenge_reminder' | 'daily_content'
  title           TEXT NOT NULL,
  body            TEXT,
  action_url      TEXT,                          -- deep link within the app
  is_read         INTEGER NOT NULL DEFAULT 0,
  push_sent       INTEGER NOT NULL DEFAULT 0,   -- 1 = push notification was sent
  push_sent_at    TIMESTAMP NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_member ON notifications(member_id, is_read, created_at DESC);
```

---

### 2.26 Detector Tables

```sql
-- Detector question set definitions (versioned).
CREATE TABLE IF NOT EXISTS detector_question_sets (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  detector_type   TEXT NOT NULL
                  CHECK (detector_type IN ('personality', 'purpose', 'health_index', 'love_life')),
  version         TEXT NOT NULL,                 -- '1.0', '1.1', '2.0'
  title           TEXT NOT NULL,
  description     TEXT,
  questions_json  TEXT NOT NULL,                 -- JSON array of question objects
  is_active       INTEGER NOT NULL DEFAULT 1,   -- only one active per detector_type
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(detector_type, version)
);

-- questions_json shape:
-- [
--   {
--     "id": "q1",
--     "text": "When you face a challenge, your first instinct is to...",
--     "type": "single_choice",           // "single_choice" | "multi_choice" | "scale" | "text"
--     "options": [                        // NULL for scale/text types
--       { "id": "a", "text": "Fight it head-on", "scores": { "trait_A": 2 } },
--       { "id": "b", "text": "Seek advice", "scores": { "trait_B": 2 } }
--     ],
--     "scale_min": null,
--     "scale_max": null,
--     "required": true
--   }
-- ]

CREATE INDEX IF NOT EXISTS idx_question_sets_type ON detector_question_sets(detector_type, is_active);

-- Per-member Detector responses.
CREATE TABLE IF NOT EXISTS detector_responses (
  id                    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id             TEXT NOT NULL REFERENCES members(id),
  question_set_id       TEXT NOT NULL REFERENCES detector_question_sets(id),
  detector_type         TEXT NOT NULL,           -- denormalized for fast querying
  status                TEXT NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  responses_json        TEXT NOT NULL DEFAULT '{}', -- JSON: { "q1": "a", "q2": ["a", "c"], "q3": 7 }
  started_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at          TIMESTAMP NULL,
  last_question_id      TEXT,                    -- last answered question, for resume support
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_detector_responses_member ON detector_responses(member_id, detector_type);

-- Computed results from a completed Detector response.
CREATE TABLE IF NOT EXISTS detector_results (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id           TEXT NOT NULL REFERENCES members(id),
  response_id         TEXT NOT NULL UNIQUE REFERENCES detector_responses(id),
  detector_type       TEXT NOT NULL,
  question_set_id     TEXT NOT NULL REFERENCES detector_question_sets(id),
  question_set_version TEXT NOT NULL,            -- denormalized for historical accuracy
  result_summary_json TEXT NOT NULL,             -- computed result (basic, shown to all tiers)
  result_full_json    TEXT,                      -- full result (Premium only)
  pdf_r2_key          TEXT,                      -- set when PDF report is generated
  pdf_generated_at    TIMESTAMP NULL,
  -- Members can retake after 90 days. The UNIQUE constraint on (member_id, question_set_version)
  -- is NOT enforced here — that logic is application-level to allow retakes.
  retake_available_at TIMESTAMP,                 -- computed on insert: completed_at + 90 days
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_detector_results_member ON detector_results(member_id, detector_type);
CREATE INDEX IF NOT EXISTS idx_detector_results_response ON detector_results(response_id);
```

---

### 2.27 books

```sql
-- Book of the Month entries.
CREATE TABLE IF NOT EXISTS books (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,
  cover_r2_key    TEXT,
  description     TEXT,
  month           TEXT NOT NULL,                 -- 'YYYY-MM', e.g. '2025-01'
  discussion_room_id TEXT REFERENCES rooms(id), -- room where book club discussion happens
  is_active       INTEGER NOT NULL DEFAULT 0,   -- 1 = current month's book
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_books_month ON books(month);

CREATE TABLE IF NOT EXISTS book_reading_progress (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  book_id       TEXT NOT NULL REFERENCES books(id),
  member_id     TEXT NOT NULL REFERENCES members(id),
  pages_read    INTEGER NOT NULL DEFAULT 0,
  total_pages   INTEGER,
  status        TEXT NOT NULL DEFAULT 'reading'
                CHECK (status IN ('not_started', 'reading', 'completed')),
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(book_id, member_id)
);
```

---

### 2.28 podcasts

```sql
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

CREATE TABLE IF NOT EXISTS podcast_episodes (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  podcast_id      TEXT NOT NULL REFERENCES podcasts(id),
  title           TEXT NOT NULL,
  description     TEXT,
  audio_r2_key    TEXT NOT NULL,
  duration_seconds INTEGER,
  episode_number  INTEGER,
  published_at    TIMESTAMP,
  min_tier        TEXT NOT NULL DEFAULT 'free'
                  CHECK (min_tier IN ('free', 'basic', 'premium')),
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_episodes_podcast ON podcast_episodes(podcast_id, episode_number);
```

---

### 2.29 cron_execution_logs

```sql
-- Admin visibility into Cron job health. Every Cron run is logged here.
CREATE TABLE IF NOT EXISTS cron_execution_logs (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  job_name        TEXT NOT NULL,                 -- 'daily_content_delivery' | 'streak_audit' | etc.
  scheduled_at    TIMESTAMP NOT NULL,
  started_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    TIMESTAMP NULL,
  status          TEXT NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running', 'success', 'failed', 'partial')),
  records_processed INTEGER,
  error_message   TEXT,
  metadata_json   TEXT                           -- job-specific debug data
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_job ON cron_execution_logs(job_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_logs_status ON cron_execution_logs(status, started_at DESC);
```

---

### 2.30 room_messages (Phase 2 — Schema defined now)

```sql
-- Group Chat messages. Written by Durable Objects in Phase 2.
-- Table exists in schema from Phase 1 to avoid future migration risk.
-- Phase 1: table exists but is never written to. Phase 2: Durable Objects write here.
CREATE TABLE IF NOT EXISTS room_messages (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  room_id     TEXT NOT NULL REFERENCES rooms(id),
  member_id   TEXT NOT NULL REFERENCES members(id),
  content     TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text'
               CHECK (message_type IN ('text', 'media', 'system')),
  media_r2_key TEXT,
  reply_to_id TEXT REFERENCES room_messages(id),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room ON room_messages(room_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_room_messages_member ON room_messages(member_id);
```

---

## 3. Seeding Data (Initial Rows)

The following data is inserted by `scripts/seed.ts` on every fresh environment initialization.

### Houses (5 rows)

```sql
INSERT OR IGNORE INTO houses (id, name, tagline, description, icon_emoji, color_hex, weekly_theme, sort_order) VALUES
  ('becoming',   'House of Becoming',   'Grow Well.',   'Career, leadership, purpose, transformation, personal growth.', '🏔', '#6366F1', 'monday',    1),
  ('connection', 'House of Connection', 'Love Well.',   'Friendships, relationships, family, community.',                '🤝', '#EC4899', 'wednesday', 2),
  ('wellness',   'House of Wellness',   'Live Well.',   'Physical health, mental health, recovery, fitness.',            '🌱', '#10B981', 'thursday',  3),
  ('play',       'House of Play',       'Enjoy Well.',  'Fun, games, adventures, social experiences.',                  '🎭', '#F59E0B', 'friday',    4),
  ('humanity',   'House of Humanity',   'Serve Well.',  'Volunteering, service, mentoring, humanitarian impact.',       '❤️', '#EF4444', 'sunday',    5);
```

### Global Chapter (1 row)

```sql
INSERT OR IGNORE INTO chapters (id, slug, name, type, timezone) VALUES
  ('global', 'global', 'AlphaMinds Global', 'global', 'UTC');
```

---

## 4. Index Strategy Summary

**Rule:** Index every foreign key. Index every column used in WHERE clauses on large tables.
Index every column used in ORDER BY on feed queries. Do NOT index columns that are
only used in INSERT or UPDATE (e.g., `content` TEXT columns).

**Composite indexes:** Used for the most common query patterns:
- `posts(room_id, created_at DESC)` — Room feed pagination
- `leaderboard_snapshots(scope_type, scope_id, period_type, rank ASC)` — Leaderboard query
- `notifications(member_id, is_read, created_at DESC)` — Notification list

**SQLite-specific:** D1 is SQLite. SQLite's query planner handles indexes well for
single-table queries but does not support covering indexes as aggressively as PostgreSQL.
Profile queries in the Wrangler local environment before assuming an index is used.
