/**
 * The Living Mind V5 — public-only, side-effect-free Signal Field read model.
 *
 * Structural identity (nodes) is durable and explicitly catalogued. Signals and
 * relationships are ephemeral evidence, never inferred system dependencies.
 * Input is the already-consent-fenced public V4 read model. No network, storage,
 * owner data, backend changes, new endpoints or activity simulation live here.
 */
import { PUBLIC_PRESENCE_PROJECTS } from "./presence-model.mjs";
import { validActivityHistory } from "./activity-history.mjs";

export const FIELD_FRAME_VERSION = 1;
const REMOTE_SOURCES = new Set(["codex", "chatgpt-work", "github-actions"]);
const TASK_STATES = new Set(["running", "waiting", "completed", "failed", "cancelled"]);
const PUBLIC_PROJECT_NAMES = new Map(
  Object.entries(PUBLIC_PRESENCE_PROJECTS).map(([id, name]) => [name, id]),
);
const EXPIRE_MS = 120_000;
const MAX_SNAPSHOT_AGE_MS = 65_000;
const MAX_FUTURE_MS = 10_000;

// Coordinates encode only stable, authored catalog placement; never activity,
// project age, repository size, inferred relationships or provider metrics.
export const FIELD_CATALOG = Object.freeze(
  Object.entries(PUBLIC_PRESENCE_PROJECTS).map(([slug, label], index, all) => {
    const angle = (index / all.length) * Math.PI * 2 - Math.PI / 2;
    const radius = 2.3 + (index % 3) * 0.36;
    const round = (n) => Number(n.toFixed(3));
    return Object.freeze({
      id: "project:" + slug,
      type: "project",
      slug,
      label,
      status: "approved-public-identity",
      position: Object.freeze([
        round(Math.cos(angle) * radius),
        round(((index % 4) - 1.5) * 0.46),
        round(Math.sin(angle) * radius),
      ]),
    });
  }),
);
function timestamp(iso, now, ttl) {
  if (typeof iso !== "string" || iso.length > 36) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) &&
    new Date(t).toISOString() === iso &&
    t <= now + MAX_FUTURE_MS &&
    now - t >= 0 && now - t < ttl ? t : null;
}
function taskExpiry(task, observed, now) {
  const expire = timestamp(task.expiresAt, now, EXPIRE_MS + MAX_FUTURE_MS);
  return expire !== null && expire > now && expire > observed &&
    expire <= observed + EXPIRE_MS ? task.expiresAt : null;
}
function knownProject(name) {
  return typeof name === "string" ? PUBLIC_PROJECT_NAMES.get(name) || null : null;
}
function freshTask(task, now) {
  if (!task || typeof task !== "object" || Array.isArray(task) ||
      !REMOTE_SOURCES.has(task.source) || !TASK_STATES.has(task.state)) return null;
  const project = task.project === null ? null : knownProject(task.project);
  if (task.project !== null && !project) return null;
  const observed = timestamp(task.asOf, now, EXPIRE_MS);
  if (observed === null || !taskExpiry(task, observed, now)) return null;
  return {
    source: task.source,
    project,
    state: task.state,
    observedAt: task.asOf,
    expiresAt: task.expiresAt,
  };
}
/** Project a V4 response into a bounded display frame. Never serialize raw input. */
export function projectSignalField(snapshot, at = Date.now()) {
  const now = Number.isFinite(at) && at >= 0 ? at : 0;
  const frame = {
    version: FIELD_FRAME_VERSION,
    asOf: new Date(now).toISOString(),
    state: "unavailable",
    nodes: FIELD_CATALOG,
    signals: [],
    edges: [],
    events: [],
    listening: { state: "unavailable" },
  };
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) ||
      snapshot.version !== 4 ||
      timestamp(snapshot.asOf, now, MAX_SNAPSHOT_AGE_MS) === null)
    return frame;

  const work = snapshot.work;
  const remote = snapshot.remote;
  // At least one server-approved public source must be present. A cached
  // historical event by itself cannot override Stop All or private mode.
  const shared = work?.visibility === "public" || remote?.visibility === "public";
  if (!shared) {
    frame.state = "private";
    frame.listening = { state: "hidden" };
    return frame;
  }
  frame.state = "quiet";
  frame.listening = { state: "hidden" };
  const add = (signal) => {
    const id = "signal:" + frame.signals.length;
    const entry = { id, ...signal };
    frame.signals.push(entry);
    if (signal.project && ["editor", "runner", "owner-declared"].includes(signal.kind)) {
      frame.edges.push({
        from: id,
        to: "project:" + signal.project,
        kind: signal.kind,
        state: signal.state,
        observedAt: signal.observedAt,
        expiresAt: signal.expiresAt,
      });
    }
    return entry;
  };
  if (work?.visibility === "public" &&
      ["editor-heartbeat", "owner-declared"].includes(work.source) &&
      ["developing", "in-the-zone"].includes(work.state)) {
    const ttl = work.source === "editor-heartbeat" ? EXPIRE_MS : 30 * 60_000;
    const observed = timestamp(work.asOf, now, ttl);
    const project = work.project === null ? null : knownProject(work.project);
    if (observed !== null && (work.project === null || project)) {
      const editor = work.source === "editor-heartbeat";
      add({
        kind: editor ? "editor" : "owner-declared",
        state: editor ? "observed-recent" : "declared",
        project,
        observedAt: work.asOf,
        expiresAt: new Date(observed + ttl).toISOString(),
        provenance: editor ? "editor-heartbeat" : "owner-declared",
      });
      if (editor) frame.state = "developing";
    }
  }

  const tasks = remote?.visibility === "public" && Array.isArray(remote.tasks) &&
    remote.tasks.length <= 16 ? remote.tasks : [];
  const raw = [...tasks];
  if (snapshot.legacy?.visibility === "public") raw.push(snapshot.legacy);
  for (const task of raw.slice(0, 17)) {
    const signal = freshTask(task, now);
    if (!signal) continue;
    add({
      kind: "runner",
      state: signal.state,
      project: signal.project,
      observedAt: signal.observedAt,
      expiresAt: signal.expiresAt,
      provenance: signal.source,
    });
  }
  if (frame.signals.some((s) => s.kind === "runner" && s.state === "running") &&
      frame.state !== "developing") frame.state = "remote-work";
  else if (frame.state === "quiet" &&
      frame.signals.some((s) => s.kind === "owner-declared"))
    frame.state = "declared";

  // These are dated historical GitHub events, not current work or deployments.
  const history = validActivityHistory(snapshot.recent, now);
  frame.events = history.map((event) => ({
    kind: event.kind,
    project: event.projectSlug,
    at: event.at,
    provenance: "github-public-history",
    url: event.url,
  }));

  // Separate independently consented listening; never infer editor activity.
  if (snapshot.spotify?.mode === "playing" &&
      snapshot.spotify.detailsVisible === true &&
      timestamp(snapshot.spotify.updatedAt, now, EXPIRE_MS) !== null)
    frame.listening = { state: "playing", provenance: "spotify", observedAt: snapshot.spotify.updatedAt };
  else if (snapshot.spotify?.mode === "off_air")
    frame.listening = { state: "off-air", provenance: "spotify" };
  return frame;
}
