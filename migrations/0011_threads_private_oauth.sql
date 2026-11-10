-- Private owner-only Threads OAuth. No posts, engagement or public data stored.
-- Apply to the EXISTING dedicated devonakins-listening-private D1 only
-- after reviewing migration and backup; never run from an ordinary site deploy.
CREATE TABLE IF NOT EXISTS threads_connection (
  id INTEGER PRIMARY KEY CHECK(id=1),
  revision INTEGER NOT NULL DEFAULT 0,
  token_cipher TEXT,
  username TEXT,
  connected_at INTEGER NOT NULL DEFAULT 0,
  token_expires_at INTEGER NOT NULL DEFAULT 0,
  verified_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO threads_connection(id) VALUES(1);

-- Pending auth holds only hashed state/nonce. No authorization code or token.
CREATE TABLE IF NOT EXISTS threads_oauth_attempt (
  state_hash TEXT PRIMARY KEY,
  nonce_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS threads_oauth_attempt_expiry ON threads_oauth_attempt(expires_at);
