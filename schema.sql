-- Schema for Cloudflare D1: DramaPuchi user saves
CREATE TABLE IF NOT EXISTS user_saves (
  sub TEXT PRIMARY KEY,
  email TEXT,
  state TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_saves_updated ON user_saves(updated_at);
