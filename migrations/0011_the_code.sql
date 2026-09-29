-- Ensure The Code tables exist (idempotent).
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

CREATE TABLE IF NOT EXISTS saved_code_passages (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id   TEXT NOT NULL REFERENCES members(id),
  code_id     TEXT NOT NULL REFERENCES the_code(id),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, code_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_code_member ON saved_code_passages(member_id);
