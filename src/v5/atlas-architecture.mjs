/**
 * Deterministic VISUAL-ONLY sculptures for the eight approved V5 catalog roots.
 *
 * Each cluster has the same number of decorative facets; their sizes and
 * placement encode no measured features, commits, services, deployments,
 * dependencies, uptime or current activity. Never turn these into graph nodes.
 * The existing reviewed structural graph is the ONLY source of semantic edges.
 */
export const PUBLIC_ATLAS_ARCHITECTURE_VERSION = 2;
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
const facetsPerRoot = 24;
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
      // Three small, staggered rings suggest a living miniature skyline.
      // There are 24 equally decorative facets on EVERY approved identity;
      // this number is not a feature, deployment or service measurement.
      const radius = 0.18 + (i % 3) * 0.20;
      const width = 0.08 + (i % 4) * 0.017;
      const height = 0.20 + ((i * 7 + (seed % 13)) % 11) * 0.065;
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


/**
 * Static luminance / mist for the *already verified* eight approved public
 * structures. These are not telemetry, relationship edges, graph nodes,
 * inferred features or activity signals. They animate nothing and do not
 * depend on dates, network responses or private repository discovery.
 *
 * A hard cap and ordered identity check prevent a supplied catalog from
 * silently increasing visual scope or rendering unapproved identities.
 */
export const PUBLIC_ATLAS_ATMOSPHERE_VERSION = 1;
const ATMOSPHERE_CLOUD_POINTS = 128;
const ATMOSPHERE_BACKDROP_POINTS = 640;

export function projectPublicAtlasAtmosphere(architecture) {
  const invalid = () => Object.freeze({
    version: PUBLIC_ATLAS_ATMOSPHERE_VERSION, valid: false, clouds: [], backdrop: [],
  });
  if (architecture?.valid !== true ||
      architecture.version !== PUBLIC_ATLAS_ARCHITECTURE_VERSION ||
      !Array.isArray(architecture.clusters) ||
      architecture.clusters.length !== ROOT_IDS.length) return invalid();

  const clouds = [];
  for (const [rootIndex, id] of ROOT_IDS.entries()) {
    const cluster = architecture.clusters[rootIndex];
    if (cluster?.id !== id || cluster.color !== PUBLIC_ATLAS_ROOT_COLORS[id] ||
        !Array.isArray(cluster.position) || cluster.position.length !== 3 ||
        cluster.position.some(n => !Number.isFinite(n) || Math.abs(n) > 10) ||
        !Array.isArray(cluster.facets) || cluster.facets.length !== facetsPerRoot)
      return invalid();
    const seed = (hashId(id) % 360) * Math.PI / 180;
    const positions = [];
    for (let i = 0; i < ATMOSPHERE_CLOUD_POINTS; i++) {
      const angle = seed + i * 2.399963229728653;
      const radius = .16 + Math.sqrt((i + .5) / ATMOSPHERE_CLOUD_POINTS) * 1.21;
      positions.push(
        round(Math.cos(angle) * radius),
        round(-.29 + (i % 19) * .052 + Math.sin(i * .58) * .10),
        round(Math.sin(angle) * radius * .74),
      );
    }
    clouds.push(Object.freeze({
      id, color: cluster.color, positions: Object.freeze(positions),
    }));
  }

  // A loose ground-level aurora has no endpoints at or between project roots.
  // The bounded, deterministic geometry cannot depict a software dependency.
  const backdrop = [];
  for (let i = 0; i < ATMOSPHERE_BACKDROP_POINTS; i++) {
    const angle = i * 2.399963229728653;
    const radius = .55 + Math.sqrt((i + .5) / ATMOSPHERE_BACKDROP_POINTS) * 6.0;
    backdrop.push(
      round(Math.cos(angle) * radius),
      round(-1.92 + Math.sin(i * .71) * .52 + Math.cos(i * .13) * .20),
      round(Math.sin(angle) * radius * .73),
    );
  }
  return Object.freeze({
    version: PUBLIC_ATLAS_ATMOSPHERE_VERSION, valid: true,
    clouds: Object.freeze(clouds), backdrop: Object.freeze(backdrop),
  });
}
