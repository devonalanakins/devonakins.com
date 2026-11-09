// Public homepage summary from the reviewed, consent-gated V4 projection only.
// Rendering state is intentionally conservative: activity history is never
// promoted to a live work session and silence never implies a connection.
const approvedTitles = Object.freeze({
  devonstation: "DevonStation", mizvo: "Mizvo",
  "devonakins-com": "DevonAkins.com", brandicade: "Brandicade",
  anevum: "Anevum", "rhen-language": "Rhen", merit: "Merit",
squelch: "Squelch",
});
const labels = Object.freeze({
  editor: "Editor observed", remote: "Participating task",
});
const empty = () => ({
  available: false, github: "Source unavailable", tasks: "Source unavailable",
  coding: "Source unavailable", focus: null, events: [],
});
const age = (iso, at) => {
  const delta = at - Date.parse(iso);
  if (!Number.isFinite(delta) || delta < -10_000) return null;
  if (delta < 60_000) return "under a minute ago";
  if (delta < 3_600_000) return Math.floor(delta / 60_000) + "m ago";
  if (delta < 86_400_000) return Math.floor(delta / 3_600_000) + "h ago";
  return Math.floor(delta / 86_400_000) + "d ago";
};
export function publicHomepageSourceSummary(projection, at = Date.now()) {
  if (!Number.isFinite(at) || projection?.available !== true ||
      !projection.nodes || typeof projection.nodes !== "object" ||
      !Array.isArray(projection.recent)) return empty();
  const work = [];
  for (const [slug, value] of Object.entries(projection.nodes)) {
    if (!Object.hasOwn(approvedTitles, slug)) continue;
    const observation = value?.active;
    if (!observation ||
        !Object.hasOwn(labels, observation.kind) ||
        typeof observation.at !== "string" ||
        (observation.kind === "editor" && observation.source !== "Editor observed") ||
        (observation.kind === "remote" && !["Codex task", "Work task", "Workflow task"].includes(observation.source)))
      continue;
    const ageText = age(observation.at, at);
    if (ageText === null || at - Date.parse(observation.at) >= 120_000) continue;
    work.push({title: approvedTitles[slug],kind: observation.kind,
      source: observation.source, at: observation.at, age: ageText});
  }
  work.sort((a,b) => (a.kind === "editor" ? -1 : 0) -
    (b.kind === "editor" ? -1 : 0) || Date.parse(b.at) - Date.parse(a.at));
  const events = projection.recent.filter(e =>
    Object.hasOwn(approvedTitles, e.slug) &&
    ["Commit", "Pull request", "Release"].includes(e.kind) &&
    typeof e.at === "string" && age(e.at, at) !== null &&
    typeof e.url === "string" &&
    /^https:\/\/github\.com\/devonalanakins\/[a-z0-9.-]+$/.test(e.url)
  ).slice(0,4).map(e => ({
    title: approvedTitles[e.slug], kind: e.kind, at:e.at,
    age:age(e.at,at), href:e.url,
  }));
  const editor=work.find(e=>e.kind==="editor");
  const task=work.find(e=>e.kind==="remote");
  return {
    available: true,
    github: events.length ? events[0].kind+" · "+events[0].title+" · "+events[0].age :
      "No recent approved events",
    tasks: task ? task.source+" · "+task.title+" · "+task.age : "No current shared tasks",
    coding: editor ? "Editor observed · "+editor.title+" · "+editor.age :
      "No current coding observation",
    focus: work[0] || null,
    events,
  };
}
