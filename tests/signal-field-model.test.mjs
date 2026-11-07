import test from "node:test";
import assert from "node:assert/strict";
import {
  FIELD_CATALOG,
  FIELD_FRAME_VERSION,
  projectSignalField,
} from "../src/signal-field-model.mjs";
import { PUBLIC_PRESENCE_PROJECTS } from "../src/presence-model.mjs";

const NOW = Date.parse("2026-11-07T20:00:00.000Z");
const iso = (offset) => new Date(NOW + offset).toISOString();
const work = (source = "editor-heartbeat", project = "Merit", observed = iso(-12_000)) =>
  ({ version: 1, visibility: "public", source, state: "developing",
     asOf: observed, project });
const base = () => ({
  version: 4,
  asOf: iso(-1_000),
  work: work(),
  remote: { version: 1, visibility: "public", tasks: [] },
  recent: [],
  legacy: null,
  spotify: { version: 1, mode: "hidden", detailsVisible: false },
  gpt: { state: "disconnected" },
});
const task = (project = "Merit", source = "github-actions", state = "running",
  observed = iso(-10_000), expiresAt = iso(110_000)) =>
  ({ id: "untrusted-task-id", source, project, state, checkpoint: null,
     asOf: observed, expiresAt, payload: "SECRET_DO_NOT_EXPOSE" });

test("stable, public-only authored catalog has ten fixed identities and positions", () => {
  assert.equal(FIELD_FRAME_VERSION, 1);
  assert.equal(FIELD_CATALOG.length, Object.keys(PUBLIC_PRESENCE_PROJECTS).length);
  assert.equal(new Set(FIELD_CATALOG.map((n) => n.id)).size, FIELD_CATALOG.length);
  assert.ok(FIELD_CATALOG.every((n) =>
    n.type === "project" && n.id === "project:" + n.slug &&
    n.label === PUBLIC_PRESENCE_PROJECTS[n.slug] &&
    n.position.length === 3 && n.position.every(Number.isFinite)));
  assert.deepEqual(projectSignalField(base(), NOW).nodes, FIELD_CATALOG);
});

test("unsupported, late and malformed snapshots fail closed", () => {
  for (const snapshot of [null, {}, [], { ...base(), version: 5 },
    { ...base(), asOf: "not a time" },
    { ...base(), asOf: iso(-65_000) },
    { ...base(), asOf: iso(25_000) }]) {
    const frame = projectSignalField(snapshot, NOW);
    assert.equal(frame.state, "unavailable");
    assert.deepEqual(frame.signals, []);
    assert.deepEqual(frame.events, []);
    assert.deepEqual(frame.edges, []);
    assert.equal(frame.listening.state, "unavailable");
  }
});

test("private and stopped visibility fences all public evidence, history and listening", () => {
  const snapshot = base();
  snapshot.work.visibility = "hidden";
  snapshot.remote.visibility = "hidden";
  snapshot.remote.tasks = [task()];
  snapshot.spotify = { mode: "playing", detailsVisible: true, updatedAt: iso(-1_000),
    track: { title: "SHOULD_NOT_LEAK" } };
  snapshot.recent = [{ project: "Merit", url: "https://example.com/SECRET" }];
  const frame = projectSignalField(snapshot, NOW);
  assert.equal(frame.state, "private");
  assert.equal(frame.listening.state, "hidden");
  assert.deepEqual(frame.edges, []);
  assert.deepEqual(frame.signals, []);
  assert.deepEqual(frame.events, []);
  assert.doesNotMatch(JSON.stringify(frame), /SHOULD_NOT_LEAK|SECRET/);
});

test("fresh editor signal is distinct from owner-declared and expires at 120 seconds", () => {
  const snapshot = base();
  let frame = projectSignalField(snapshot, NOW);
  assert.equal(frame.state, "developing");
  assert.equal(frame.signals.length, 1);
  assert.deepEqual(frame.signals[0], {
    id: "signal:0", kind: "editor", state: "observed-recent",
    project: "merit", observedAt: iso(-12_000),
    expiresAt: iso(108_000), provenance: "editor-heartbeat",
  });
  assert.deepEqual(frame.edges[0].to, "project:merit");
  snapshot.work.asOf = iso(-120_000);
  frame = projectSignalField(snapshot, NOW);
  assert.equal(frame.state, "quiet");
  assert.deepEqual(frame.signals, []);
  snapshot.work = work("owner-declared");
  frame = projectSignalField(snapshot, NOW);
  assert.equal(frame.state, "declared");
  assert.equal(frame.signals[0].kind, "owner-declared");
  assert.equal(frame.edges[0].kind, "owner-declared");
});

test("concurrent remote tasks remain separate; waiting is not running", () => {
  const snapshot = base();
  snapshot.work.visibility = "hidden";
  snapshot.remote.tasks = [
    task("Merit", "github-actions", "running"),
    task("Rhen", "codex", "waiting"),
    task("Anevum", "chatgpt-work", "failed"),
  ];
  const frame = projectSignalField(snapshot, NOW);
  assert.equal(frame.state, "remote-work");
  assert.deepEqual(frame.signals.map((s) => [s.kind, s.project, s.state]), [
    ["runner", "merit", "running"],
    ["runner", "rhen", "waiting"],
    ["runner", "anevum", "failed"],
  ]);
  assert.equal(frame.edges.length, 3);
  assert.deepEqual(frame.edges.map((e) => e.to), [
    "project:merit", "project:rhen", "project:anevum",
  ]);
});

test("unknown projects, unapproved sources, expired tasks and overlarge arrays are rejected", () => {
  const snapshot = base();
  snapshot.remote.tasks = [
    task("private-client-name"),
    task("Merit", "unknown-agent"),
    task("Merit", "codex", "running", iso(-120_000)),
    task("Merit", "codex", "running", iso(-10_000), iso(-1)),
    task("Merit", "codex", "running", iso(-10_000), iso(130_000)),
  ];
  snapshot.work.project = "private-client-name";
  const frame = projectSignalField(snapshot, NOW);
  assert.equal(frame.state, "quiet");
  assert.deepEqual(frame.edges, []);
  assert.doesNotMatch(JSON.stringify(frame), /private-client-name|SECRET_DO_NOT_EXPOSE/);
  snapshot.remote.tasks = Array(17).fill(task());
  assert.deepEqual(projectSignalField(snapshot, NOW).signals, []);
});

test("public GitHub events are historical only and never establish active coding", () => {
  const snapshot = base();
  snapshot.work.visibility = "hidden";
  snapshot.remote.visibility = "public";
  snapshot.recent = [
    { project: "Merit", projectSlug: "merit", kind: "Commit",
      at: iso(-10_000), url: "https://github.com/devonalanakins/merit" },
    { project: "DevonStation", projectSlug: "devonstation", kind: "Release",
      at: iso(-15_000), url: "https://example.com/secret" },
  ];
  const frame = projectSignalField(snapshot, NOW);
  assert.equal(frame.state, "quiet");
  assert.deepEqual(frame.signals, []);
  assert.deepEqual(frame.edges, []);
  assert.equal(frame.events.length, 1);
  assert.equal(frame.events[0].project, "merit");
  assert.equal(frame.events[0].provenance, "github-public-history");
});

test("consented Spotify is atmosphere only, with no track text or editor edges", () => {
  const snapshot = base();
  snapshot.work.visibility = "hidden";
  snapshot.remote.visibility = "public";
  snapshot.spotify = { mode: "playing", detailsVisible: true, updatedAt: iso(-30_000),
    track: { title: "UNTRUSTED_TRACK", artist: "PRIVATE_ARTIST" } };
  const frame = projectSignalField(snapshot, NOW);
  assert.equal(frame.state, "quiet");
  assert.equal(frame.listening.state, "playing");
  assert.equal(frame.listening.provenance, "spotify");
  assert.deepEqual(frame.signals, []);
  assert.doesNotMatch(JSON.stringify(frame), /UNTRUSTED_TRACK|PRIVATE_ARTIST/);
  snapshot.spotify.updatedAt = iso(-120_000);
  assert.equal(projectSignalField(snapshot, NOW).listening.state, "hidden");
  snapshot.spotify.updatedAt = iso(-30_000);
  snapshot.spotify.detailsVisible = false;
  assert.equal(projectSignalField(snapshot, NOW).listening.state, "hidden");
});

test("the field has no dependency on browser APIs, live fetches or data-store clients", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/signal-field-model.mjs", import.meta.url), "utf8"));
  assert.doesNotMatch(source, /\b(?:fetch|localStorage|sessionStorage|requestAnimationFrame|WebSocket)\s*\(/);
  assert.doesNotMatch(source, /\/api\/|owner\/|D1|Cloudflare/);
});
