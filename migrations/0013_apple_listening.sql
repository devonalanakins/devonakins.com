-- Personal owner listening snapshots. One replaceable row; no event/history table.
-- Reuses the existing private LISTENING_DB binding, not any Nona database.
CREATE TABLE IF NOT EXISTS apple_listening_status (
  id INTEGER PRIMARY KEY CHECK (id=1),
  kind TEXT NOT NULL CHECK (kind IN ('song','ambient','off')),
  title TEXT,
  artist TEXT,
  album TEXT,
  apple_url TEXT,
  mood TEXT CHECK (mood IS NULL OR mood IN ('Sleep','Chill','Productivity','Wellbeing')),
  reported_at INTEGER NOT NULL
);
