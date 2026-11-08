/**
 * Public, deterministic, versioned spatial projection.
 * Labels and nodes come ONLY from the reviewed graph projector; no discovery
 * or live activity can add structure. Coordinates encode authored placement,
 * not health, usage, age, correctness or inferred dependency.
 */
export const V5_ATLAS_LAYOUT_VERSION = 1;

const POSITIONS = Object.freeze({
  "project:devonstation": [-3.55, 1.10, -0.90],
  "project:mizvo": [-1.45, 1.55, 0.25],
  "section:knowledge-overview": [0.95, 2.10, -1.10],
  "project:anevum": [3.35, 0.85, 0.35],
  "project:rhen-language": [-3.10, -1.45, -0.20],
  "project:merit": [-0.85, -1.55, 0.90],
  "project:vesper": [1.60, -1.30, -0.60],
  "project:squelch": [3.45, -0.90, -1.25],
});
const ROOT_IDS = Object.freeze(Object.keys(POSITIONS));
const ROOT_SET = new Set(ROOT_IDS);
const ROOT_LABELS = Object.freeze({
  "project:devonstation": "DevonStation",
  "project:mizvo": "Mizvo",
  "section:knowledge-overview": "Knowledge",
  "project:anevum": "Anevum",
  "project:rhen-language": "Rhen",
  "project:merit": "Merit",
  "project:vesper": "Vesper",
  "project:squelch": "Squelch",
});
const CHILD_ID = /^(feature|component|integration|publication):([a-z][a-z0-9-]{1,35})\/([a-z][a-z0-9-]{1,47})$/;
const RELATION_ID = /^relation:[a-z][a-z0-9-]{2,63}$/;
const TITLE = /^[A-Za-z0-9][A-Za-z0-9 _.,:()\/&+\-]{0,69}$/;
const REVIEW_URL = /^https:\/\/github\.com\/devonalanakins\/devonakins\.com\/pull\/[1-9][0-9]*$/;
const EVIDENCE_URL = /^https:\/\/github\.com\/devonalanakins\/(?:devonakins\.com|devon-station|mizvo|rhen|merit|vesper|squelch|anevum)\/(?:pull\/[1-9][0-9]*|commit\/[0-9a-f]{40})$/;
const NODE_TYPES = new Set(["feature", "component", "integration", "publication"]);
const RELATION_TYPES = new Set(["contains", "implements", "documents", "depends-on", "integrates-with"]);
const hash = str => {
  let h = 2166136261;
  for (const char of str) {
    h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  }
  return h >>> 0;
};
const vector = values => Object.freeze(values.map(n => Number(n.toFixed(3))));

export function projectV5Atlas(frame) {
  const entries = new Map();
  const roots = frame?.nodes;
  if (!Array.isArray(roots) || frame?.schema !== 1 ||
      !Number.isSafeInteger(frame.revision) || frame.revision < 0 ||
      frame.revision > 128 ||
      roots.length < ROOT_IDS.length || roots.length > 96)
    return { version: V5_ATLAS_LAYOUT_VERSION, valid: false, revision: 0,
      nodes: [], links: [] };
  // A forged duplicate root is not an additional approved public identity.
  if (roots.filter(node => ROOT_SET.has(node?.id)).length !== ROOT_IDS.length)
    return { version: V5_ATLAS_LAYOUT_VERSION, valid: false, revision: 0,
      nodes: [], links: [] };
  for (const [id, position] of Object.entries(POSITIONS)) {
    const node = roots.find(n => n?.id === id && n?.state === "catalogued" &&
      n.parent === null &&
      n.type === (id.startsWith("section:") ? "section" : "project") &&
      n.label === ROOT_LABELS[id]);
    if (!node) return { version: V5_ATLAS_LAYOUT_VERSION, valid: false, revision: 0,
      nodes: [], links: [] };
    entries.set(id, Object.freeze({
      id, label: node.label, type: node.type, parent: null,
      state: node.state, position: Object.freeze([...position]),
    }));
  }
  // A malformed reviewed-history frame cannot add any child or relationship.
  if (frame.valid !== true) {
    return { version: V5_ATLAS_LAYOUT_VERSION, valid: false, revision: 0,
      nodes: [...entries.values()], links: [] };
  }
  const approved = [];
  const nodes = [...entries.values()];
  for (const node of roots) {
    if (ROOT_SET.has(node.id)) continue;
    const identity = typeof node?.id === "string" ? CHILD_ID.exec(node.id) : null;
    const parent = typeof node?.parent === "string" ? entries.get(node.parent) : null;
    const parentSlug = parent?.id.startsWith("project:")
      ? parent.id.slice("project:".length)
      : typeof parent?.id === "string" ? CHILD_ID.exec(parent.id)?.[2] : null;
    if (!identity || !NODE_TYPES.has(node.type) || node.type !== identity[1] ||
        typeof node.label !== "string" || !TITLE.test(node.label) ||
        entries.has(node.id) ||
        !["published", "retired"].includes(node.state) ||
        !parent || parentSlug !== identity[2] ||
        (node.state === "published" && parent.state === "retired") ||
        typeof node.reviewUrl !== "string" ||
        typeof node.evidenceUrl !== "string" ||
        !REVIEW_URL.test(node.reviewUrl) || !EVIDENCE_URL.test(node.evidenceUrl)) {
      // Never display an unexplained or unapproved relationship.
      return { version: V5_ATLAS_LAYOUT_VERSION, valid: false, revision: 0,
        nodes: [...entries.values()].filter(n => ROOT_SET.has(n.id)), links: [] };
    }
    const p = entries.get(node.parent).position;
    const seed = hash(node.id), angle = (seed % 360) * Math.PI / 180;
    const step = 0.95 + ((seed >>> 10) % 5) * 0.15;
    const position = vector([
      p[0] + Math.cos(angle) * step,
      p[1] + (((seed >>> 18) % 7) - 3) * 0.23,
      p[2] + Math.sin(angle) * step,
    ]);
    const child = Object.freeze({
      id: node.id, label: node.label, type: node.type, parent: node.parent,
      state: node.state, position,
    });
    entries.set(node.id, child);
    nodes.push(child);
    if (node.state === "published") approved.push({
      from: node.parent, to: node.id, type: "published-membership",
      evidence: "reviewed-public-structure",
    });
  }
  const links = [...approved];
  if (!Array.isArray(frame.relations) || frame.relations.length > 128)
    return { version: V5_ATLAS_LAYOUT_VERSION, valid: false, revision: 0,
      nodes: nodes.filter(n => ROOT_SET.has(n.id)), links: [] };
  for (const relation of frame.relations) {
    if (!relation || !RELATION_ID.test(relation.id) ||
        !RELATION_TYPES.has(relation.type) ||
        relation.state !== "published" || relation.from === relation.to ||
        !entries.has(relation.from) || !entries.has(relation.to) ||
        entries.get(relation.from).state === "retired" ||
        entries.get(relation.to).state === "retired" ||
        typeof relation.reviewUrl !== "string" ||
        typeof relation.evidenceUrl !== "string" ||
        !REVIEW_URL.test(relation.reviewUrl) ||
        !EVIDENCE_URL.test(relation.evidenceUrl)) {
      return { version: V5_ATLAS_LAYOUT_VERSION, valid: false, revision: 0,
        nodes: nodes.filter(n => ROOT_SET.has(n.id)), links: [] };
    }
    links.push({
      from: relation.from, to: relation.to,
      type: relation.type, evidence: "reviewed-public-relation",
    });
  }
  return Object.freeze({
    version: V5_ATLAS_LAYOUT_VERSION,
    valid: true,
    revision: Number.isSafeInteger(frame.revision) ? frame.revision : 0,
    nodes, links,
  });
}
