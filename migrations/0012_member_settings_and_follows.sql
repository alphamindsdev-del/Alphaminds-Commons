-- Member preferences (account-level settings toggles) + follow relationships
ALTER TABLE members ADD COLUMN settings_json TEXT;

CREATE TABLE IF NOT EXISTS member_follows (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  follower_id TEXT NOT NULL REFERENCES members(id),
  followee_id TEXT NOT NULL REFERENCES members(id),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, followee_id)
);
CREATE INDEX IF NOT EXISTS idx_member_follows_followee ON member_follows(followee_id);
CREATE INDEX IF NOT EXISTS idx_member_follows_follower ON member_follows(follower_id);
