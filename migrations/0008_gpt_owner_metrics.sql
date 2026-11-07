-- Additive, private owner-recorded ChatGPT usage measurements.
-- Does not modify Spotify credentials, presence, cloud reporters or client data.
-- No rows or public sharing are created by this migration.
CREATE TABLE gpt_owner_metrics (
  metric TEXT PRIMARY KEY CHECK(metric IN (
    'profile_lifetime_tokens_approx',
    'profile_7d_tokens',
    'profile_7d_messages',
    'profile_streak_days',
    'work_codex_credits_remaining',
    'work_codex_credits_used',
    'business_7d_messages',
    'business_7d_credits_used'
  )),
  value REAL NOT NULL CHECK(value >= 0 AND value <= 1000000000000),
  source TEXT NOT NULL CHECK(source IN (
    'owner-profile-capture',
    'owner-work-codex-usage',
    'owner-business-analytics'
  )),
  recorded_at INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  shared INTEGER NOT NULL DEFAULT 0 CHECK(shared IN (0,1))
);
