-- Apply only to the existing private listening D1 after independent backup.
-- Never execute from an ordinary site build or deploy.
ALTER TABLE threads_connection ADD COLUMN threads_user_id TEXT;
CREATE TABLE IF NOT EXISTS threads_lifecycle_receipt (
  request_hash TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('deauthorize','delete')),
  confirmation_code TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS threads_lifecycle_receipt_age ON threads_lifecycle_receipt(received_at);
