-- Add watchlist table for options trading UI
CREATE TABLE IF NOT EXISTS watchlist (
  id text PRIMARY KEY,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker varchar(10) NOT NULL,
  created_at timestamp DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, ticker)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
