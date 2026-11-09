// An intentionally small bridge from the already consent-filtered V4 model.
// Fixed public catalog nodes are structural; GitHub history is not live work.
// Private Knowledge records and unapproved project IDs never enter the terrain.
export const terrainPublicSlugs = Object.freeze([
  "devonstation", "mizvo", "knowledge-overview", "anevum",
  "rhen-language", "merit", "vesper", "squelch",
]);

export function publicV5TerrainStates(projection) {
  const states = Object.create(null);
  if (projection?.available !== true || !projection.nodes ||
      typeof projection.nodes !== "object" || Array.isArray(projection.nodes)) {
    return states;
  }
  for (const slug of terrainPublicSlugs) {
    // Knowledge is a public section label, never a source of private status.
    if (slug === "knowledge-overview" || slug === "vesper") continue;
    const node = Object.hasOwn(projection.nodes, slug) ? projection.nodes[slug] : null;
    const kind = node?.active?.kind;
    if (kind === "editor" || kind === "remote") states[slug] = kind;
  }
  return states;
}
