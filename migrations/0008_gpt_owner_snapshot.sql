-- Single, owner-reviewed Work/Codex usage observation.
-- Additive to existing private D1. Never holds prompts, accounts, credentials,
-- conversation metadata, or a growing analytics history.
CREATE TABLE gpt_owner_snapshots (
  id INTEGER PRIMARY KEY CHECK(id=1),
  record TEXT NOT NULL CHECK(length(record)<=1024),
  received_at INTEGER NOT NULL CHECK(received_at>0)
);
