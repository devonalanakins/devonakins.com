/**
 * Deterministic VISUAL-ONLY sculptures for the eight approved V5 catalog roots.
 *
 * Each cluster has the same number of decorative facets; their sizes and
 * placement encode no measured features, commits, services, deployments,
 * dependencies, uptime or current activity. Never turn these into graph nodes.
 * The existing reviewed structural graph is the ONLY source of semantic edges.
 */
export const PUBLIC_ATLAS_ARCHITECTURE_VERSION = 1;
export const PUBLIC_ATLAS_ROOT_COLORS = Object.freeze({
  "project:devonstation": 0x70baff,
  "project:mizvo": 0x46e4fb,
  "section:knowledge-overview": 0xa9a4fa,
  "project:anevum": 0xffb979,
  "project:rhen-language": 0xb995ff,
  "project:merit": 0x78e8d3,
  "project:vesper": 0xe8bc85,
  "project:squelch": 0xfa83ed,
});

const ROOT_IDS = Object.freeze(Object.keys(PUBLIC_ATLAS_ROOT_COLORS));
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
const count = ROOT_IDS.length;
const facetsPerRoot = 9;
const round = n => Number(n.toFixed(4));
const vector = values => Object.freeze(values.map(round));
const invalid = () => ({
  version: PUBLIC_ATLAS_ARCHITECTURE_VERSION, valid: false, clusters: [],
});
const hashId = text => {
  let n = 2166136261;
  for (let i = 0; i < text.length; i++)
    n = Math.imul(n ^ text.charCodeAt(i), 16777619);
  return n >>> 0;
};

/** Presentation geometry only; no new visible graph identities or activity. */
export function projectPublicAtlasArchitecture(graph) {
  if (graph?.valid !== true || !Array.isArray(graph.nodes) ||
      graph.nodes.length < count || graph.nodes.length > 96) return invalid();
  const roots = graph.nodes.filter(node => node?.parent === null);
  if (roots.length !== count) return invalid();

  const clusters = [];
  for (const id of ROOT_IDS) {
    const matches = roots.filter(node => node?.id === id);
    if (matches.length !== 1) return invalid();
    const node = matches[0];
    const pos = node.position;
    if (node.state !== "catalogued" || node.label !== ROOT_LABELS[id] ||
        node.type !== (id.startsWith("section:") ? "section" : "project") ||
        !Array.isArray(pos) || pos.length !== 3 ||
        pos.some(v => !Number.isFinite(v) || Math.abs(v) > 10))
      return invalid();
    const seed = hashId(id);
    const rotation = ((seed % 314) / 314) * Math.PI * 2;
    const facets = [];
    for (let i = 0; i < facetsPerRoot; i++) {
      const angle = rotation + (i / facetsPerRoot) * Math.PI * 2;
      const radius = 0.35 + (i % 3) * 0.09;
      const width = 0.11 + (i % 3) * 0.025;
      const height = 0.23 + ((i + (seed % 5)) % 5) * 0.12;
      facets.push(Object.freeze({
        offset: vector([Math.cos(angle) * radius, -0.32 + height / 2, Math.sin(angle) * radius]),
        scale: vector([width, height, width]),
      }));
    }
    clusters.push(Object.freeze({
      id,
      position: vector(pos),
      color: PUBLIC_ATLAS_ROOT_COLORS[id],
      facets: Object.freeze(facets),
    }));
  }
  return Object.freeze({
    version: PUBLIC_ATLAS_ARCHITECTURE_VERSION,
    valid: true,
    clusters: Object.freeze(clusters),
  });
}
