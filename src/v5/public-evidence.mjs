import { validActivityHistory } from "../activity-history.mjs";

// Read-only normalization of the *already approved* V4 public projection.
// Never derive unpublished projects, graph edges or current activity from
// repository history. Every supported project identity is explicit.
const names = Object.freeze({
  DevonStation: "devonstation",
  Mizvo: "mizvo",
  Anevum: "anevum",
  Rhen: "rhen-language",
  Merit: "merit",
  Squelch: "squelch",
});
const historySlugs = Object.freeze({
  devonstation: "devonstation",
  mizvo: "mizvo",
  anevum: "anevum",
  rhen: "rhen-language",
  merit: "merit",
  squelch: "squelch",
});
const sources = Object.freeze({
  codex: "Codex task",
  "chatgpt-work": "Work task",
  "github-actions": "Workflow task",
});
const checkpoints = new Set([null, "testing", "tests-passed", "building", "reviewing"]);

function validTime(value, at, ttl) {
  if (typeof value !== "string" || value.length > 36) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value &&
    parsed <= at + 10_000 && at - parsed <= ttl ? value : null;
}
const freshTask = (task, at) => {
  if (!task || task.state !== "running" || !Object.hasOwn(sources, task.source) ||
      !checkpoints.has(task.checkpoint) || !Object.hasOwn(names, task.project)) return false;
  const when = validTime(task.asOf, at, 120_000);
  const expiry = typeof task.expiresAt === "string" && validTime(task.expiresAt, at + 120_000, 240_000);
  return Boolean(when && expiry &&
    Date.parse(task.expiresAt) > at &&
    Date.parse(task.expiresAt) <= Date.parse(when) + 120_000);
};
export function publicV5ProjectEvidence(value, at = Date.now()) {
  // Fail closed on a stale, malformed or non-V4 aggregate; absence and
  // revocation must clear previously painted "active" state.
  const empty = { available: false, nodes: Object.create(null), recent: [] };
  if (!Number.isFinite(at) || !value || value.version !== 4 ||
      !validTime(value.asOf, at, 65_000)) return empty;

  const nodes = Object.create(null);
  const events = validActivityHistory(value.recent, at)
    .filter(event => Object.hasOwn(historySlugs, event.projectSlug))
    .map(event => ({
      slug: historySlugs[event.projectSlug],
      kind: event.kind,
      at: event.at,
      url: event.url,
      source: "Public GitHub history",
    }));
  // A repository event is history, not evidence of work happening now.
  for (const event of events) {
    if (!nodes[event.slug]) nodes[event.slug] = { active: null, lastEvent: event };
  }
  const tasks = value.remote?.visibility === "public" &&
    Array.isArray(value.remote.tasks) && value.remote.tasks.length <= 16
      ? value.remote.tasks : [];
  for (const task of tasks) {
    if (!freshTask(task, at)) continue;
    const slug = names[task.project];
    const existing = nodes[slug] || { active: null, lastEvent: null };
    if (!existing.active || Date.parse(task.asOf) > Date.parse(existing.active.at)) {
      existing.active = {
        kind: "remote",
        source: sources[task.source],
        at: task.asOf,
      };
    }
    nodes[slug] = existing;
  }
  const work = value.work;
  if (work?.visibility === "public" && work.source === "editor-heartbeat" &&
      ["developing", "in-the-zone"].includes(work.state) &&
      Object.hasOwn(names, work.project) &&
      validTime(work.asOf, at, 120_000)) {
    const slug = names[work.project];
    const existing = nodes[slug] || { active: null, lastEvent: null };
    existing.active = { kind: "editor", source: "Editor observed", at: work.asOf };
    nodes[slug] = existing;
  }
  return { available: true, nodes, recent: events };
}
