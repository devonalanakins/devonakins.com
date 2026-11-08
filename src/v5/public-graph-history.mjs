/**
 * Living Mind V5 — reviewed, versioned PUBLIC structure history.
 *
 * Source records belong to a code-reviewed, first-party manifest. No dynamic
 * provider payload, repository discovery, localStorage, D1 or private Knowledge
 * record may be promoted into structure through this projector. V4 source
 * events are ephemeral and intentionally NEVER imported here.
 */
import { terrainPublicSlugs } from "./field-terrain-state.mjs";

export const PUBLIC_GRAPH_HISTORY_VERSION = 1;
export const MAX_PUBLIC_GRAPH_RECORDS = 128;

const LABELS = Object.freeze({
  devonstation: "DevonStation", mizvo: "Mizvo", "knowledge-overview": "Knowledge",
  anevum: "Anevum", "rhen-language": "Rhen", merit: "Merit",
  vesper: "Vesper", squelch: "Squelch",
});
const ROOT_IDS = Object.freeze(terrainPublicSlugs.map(slug =>
  slug === "knowledge-overview" ? "section:knowledge-overview" : "project:" + slug));
const ROOT_SET = new Set(ROOT_IDS);
const PROJECT_SLUGS = new Set(terrainPublicSlugs.filter(s => s !== "knowledge-overview"));
const NODE_TYPES = new Set(["feature", "component", "integration", "publication"]);
const RELATION_TYPES = new Set(["contains", "implements", "documents", "depends-on", "integrates-with"]);
const REPOS = "(?:devonakins\\.com|devon-station|mizvo|rhen|merit|vesper|squelch|anevum)";
const REVIEW_URL = /^https:\/\/github\.com\/devonalanakins\/devonakins\.com\/pull\/[1-9][0-9]*$/;
const PROOF_URL = new RegExp("^https://github\\.com/devonalanakins/" + REPOS + "/(?:pull/[1-9][0-9]*|commit/[0-9a-f]{40})$");
const CHILD_ID = /^(feature|component|integration|publication):([a-z][a-z0-9-]{1,35})\/([a-z][a-z0-9-]{1,47})$/;
const RELATION_ID = /^relation:[a-z][a-z0-9-]{2,63}$/;
const TITLE = /^[A-Za-z0-9][A-Za-z0-9 _.,:()\/&+\-]{0,69}$/;
const DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ACTIONS = new Set(["publish-node", "retire-node", "publish-relation", "retire-relation", "reinstate-node", "reinstate-relation"]);

const obj = value => Boolean(value) && typeof value === "object" && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const exactKeys = (value, keys) => obj(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const iso = value => typeof value === "string" && DATE.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(Date.parse(value)).toISOString() === value;
const rootOf = id => {
  const match = typeof id === "string" ? CHILD_ID.exec(id) : null;
  return match && PROJECT_SLUGS.has(match[2]) ? "project:" + match[2] : null;
};
const roots = () => ROOT_IDS.map((id, i) => ({
  id, type: id.startsWith("section:") ? "section" : "project",
  label: LABELS[terrainPublicSlugs[i]], parent: null,
  state: "catalogued", // Identity approval is not live-source connectivity.
  evidenceUrl: null, reviewUrl: null,
}));

// Explicitly EMPTY until a source-specific public milestone is reviewed and
// added to this repository. No estimated or fictional graph growth is seeded.
export const PUBLIC_GRAPH_REVIEWED_RECORDS = Object.freeze([]);

function emptyFrame(at, valid = true) {
  const t = Number.isFinite(at) && at >= 0 && at <= 8.64e15 ? at : 0;
  return {
    schema: PUBLIC_GRAPH_HISTORY_VERSION, valid, asOf: new Date(t).toISOString(),
    revision: 0, nodes: roots(), relations: [], changes: [],
  };
}

/**
 * Returns a deterministic as-of structural frame. Every record is validated
 * (including future records); a malformed chain fails closed as a whole.
 * No runtime source grants public approval or writes to the graph.
 */
export function replayPublicGraphHistory(
  records = PUBLIC_GRAPH_REVIEWED_RECORDS, at = Date.now(),
) {
  const fallback = emptyFrame(at, false);
  if (!Number.isFinite(at) || at < 0 || at > 8.64e15 ||
      !Array.isArray(records) || records.length > MAX_PUBLIC_GRAPH_RECORDS)
    return fallback;
  const entries = new Map(roots().map(root => [root.id, root]));
  const relations = new Map();
  const changes = [];
  let revision = 0;
  let previousTime = -1;
  for (const [index, record] of records.entries()) {
    if (!exactKeys(record, ["schema", "sequence", "effectiveAt", "action", "evidenceUrl", "reviewUrl", "value"]) ||
        record.schema !== PUBLIC_GRAPH_HISTORY_VERSION || record.sequence !== index + 1 ||
        !iso(record.effectiveAt) || !ACTIONS.has(record.action) ||
        typeof record.evidenceUrl !== "string" || typeof record.reviewUrl !== "string" ||
        !PROOF_URL.test(record.evidenceUrl) || !REVIEW_URL.test(record.reviewUrl))
      return fallback;
    const when = Date.parse(record.effectiveAt);
    if (when < previousTime) return fallback;
    previousTime = when;
    const value = record.value;
    if (record.action === "publish-node") {
      if (!exactKeys(value, ["id", "type", "label", "parent"]) ||
          !NODE_TYPES.has(value.type) || typeof value.label !== "string" || !TITLE.test(value.label) ||
          !CHILD_ID.test(value.id) || !rootOf(value.id) ||
          value.type !== CHILD_ID.exec(value.id)[1] || entries.has(value.id))
        return fallback;
      const parent = entries.get(value.parent);
      if (!parent || parent.state === "retired" ||
          (ROOT_SET.has(value.parent) ? value.parent !== rootOf(value.id) : rootOf(value.parent) !== rootOf(value.id)) ||
          entries.size >= 96) return fallback;
      entries.set(value.id, {
        id: value.id, type: value.type, label: value.label, parent: value.parent,
        state: "published", evidenceUrl: record.evidenceUrl, reviewUrl: record.reviewUrl,
      });
    } else if (record.action === "retire-node") {
      if (!exactKeys(value, ["id"]) || ROOT_SET.has(value.id)) return fallback;
      const target = entries.get(value.id);
      if (!target || target.state !== "published" ||
          [...entries.values()].some(n => n.parent === value.id && n.state === "published")) return fallback;
      entries.set(value.id, { ...target, state: "retired", retiredAt: record.effectiveAt, retirementReviewUrl: record.reviewUrl });
    } else if (record.action === "reinstate-node") {
      if (!exactKeys(value,["id"]) || ROOT_SET.has(value.id)) return fallback;
      const target=entries.get(value.id);
      const parent=target && entries.get(target.parent);
      if(!target || target.state!=="retired" || !parent || parent.state==="retired") return fallback;
      entries.set(value.id,{...target,state:"published",reinstatedAt:record.effectiveAt,
        reinstatementReviewUrl:record.reviewUrl});
    } else if (record.action === "reinstate-relation") {
      if(!exactKeys(value,["id"])) return fallback;
      const target=relations.get(value.id);
      if(!target || target.state!=="retired" ||
        entries.get(target.from)?.state==="retired" || entries.get(target.to)?.state==="retired" ||
        [...relations.values()].some(r=>r.id!==target.id && r.state==="published" &&
          r.from===target.from && r.to===target.to && r.type===target.type)) return fallback;
      relations.set(value.id,{...target,state:"published",reinstatedAt:record.effectiveAt,
        reinstatementReviewUrl:record.reviewUrl});
    } else if (record.action === "publish-relation") {
      if (!exactKeys(value, ["id", "type", "from", "to"]) ||
          !RELATION_ID.test(value.id) || !RELATION_TYPES.has(value.type) ||
          value.from === value.to || relations.has(value.id) ||
          !entries.has(value.from) || !entries.has(value.to) ||
          entries.get(value.from).state === "retired" || entries.get(value.to).state === "retired" ||
          relations.size >= 128) return fallback;
      if ([...relations.values()].some(r => r.state === "published" &&
          r.from === value.from && r.to === value.to && r.type === value.type)) return fallback;
      relations.set(value.id, { ...value, state: "published",
        evidenceUrl: record.evidenceUrl, reviewUrl: record.reviewUrl });
    } else {
      if (!exactKeys(value, ["id"])) return fallback;
      const existing = relations.get(value.id);
      if (!existing || existing.state !== "published") return fallback;
      relations.set(value.id, { ...existing, state: "retired", reviewUrl: record.reviewUrl });
    }
    // Replay applies only events effective by the requested date, but it
    // validates the entire append-only manifest before returning a frame.
    if (when <= at) {
      revision = record.sequence;
      changes.push({ sequence: record.sequence, effectiveAt: record.effectiveAt,
        action: record.action, reviewUrl: record.reviewUrl });
    }
  }
  // Reconstruct at the requested date. A later event must not alter past
  // identity, status, or provenance. The second pass uses already validated
  // input, and retains immutable snapshots at the selected revision.
  if (revision !== records.length) {
    return revision === 0
      ? { ...emptyFrame(at), changes: [] }
      : replayPublicGraphHistory(records.slice(0, revision), at);
  }
  const nodes = [...entries.values()];
  const current = new Map(nodes.map(node => [node.id, node]));
  const liveRelations = [...relations.values()].filter(r =>
    r.state === "published" && current.get(r.from)?.state !== "retired" &&
    current.get(r.to)?.state !== "retired");
  return { schema: PUBLIC_GRAPH_HISTORY_VERSION, valid: true,
    asOf: new Date(at).toISOString(), revision, nodes, relations: liveRelations, changes };
}
