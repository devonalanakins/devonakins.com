-- Central App metadata stays private. Discovery never enables a reporter.
CREATE TABLE github_integration_state (
  id INTEGER PRIMARY KEY CHECK(id=1),
  revision INTEGER NOT NULL DEFAULT 0,
  sync_nonce TEXT,
  discovered_at INTEGER NOT NULL DEFAULT 0
);
INSERT INTO github_integration_state(id) VALUES(1);
CREATE TABLE github_repositories (
  repo_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  default_branch TEXT NOT NULL,
  private INTEGER NOT NULL CHECK(private IN (0,1)),
  authorized INTEGER NOT NULL DEFAULT 1 CHECK(authorized IN (0,1)),
  project_slug TEXT,
  approved INTEGER NOT NULL DEFAULT 0 CHECK(approved IN (0,1)),
  -- Existing V4 cleanup may remove ephemeral sources independently.
  source_id TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  discovered_at INTEGER NOT NULL,
  observed_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE github_deliveries (
  delivery_id TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
CREATE TABLE github_workflow_runs (
  repo_id INTEGER NOT NULL REFERENCES github_repositories(repo_id),
  run_id INTEGER NOT NULL,
  attempt INTEGER NOT NULL,
  -- Existing V4 cleanup may remove ephemeral tasks independently.
  task_id TEXT NOT NULL,
  observed_at INTEGER NOT NULL,
  rank INTEGER NOT NULL DEFAULT 0 CHECK(rank IN (0,1,2)),
  terminal INTEGER NOT NULL DEFAULT 0 CHECK(terminal IN (0,1)),
  PRIMARY KEY(repo_id,run_id,attempt)
);
CREATE INDEX github_deliveries_received ON github_deliveries(received_at);
