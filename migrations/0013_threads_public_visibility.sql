-- Owner-only, reversible Threads feed sharing preference.
-- Run ONLY after a verified private D1 backup and explicit production
-- migration approval. Never apply automatically from site deployment.
ALTER TABLE threads_connection ADD COLUMN public_feed_enabled INTEGER NOT NULL
  DEFAULT 0 CHECK(public_feed_enabled IN (0,1));

-- Preserve the single already-authorized/verified feed after the approved
-- public Threads release. Future OAuth grants and disconnects explicitly
-- reset sharing to off in application code. Provider account IDs/tokens are
-- never exported by this migration.
UPDATE threads_connection SET public_feed_enabled=1
  WHERE id=1 AND token_cipher IS NOT NULL
    AND threads_user_id IS NOT NULL AND username IS NOT NULL
    AND verified_at>0 AND token_expires_at>verified_at;
