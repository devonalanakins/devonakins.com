/**
 * V5 Signal Field explorer: display-only filters over the already approved
 * public atlas layout. Never create or infer nodes, edges, live source states
 * or private entries from search text or browser state.
 */
export const ATLAS_DISPLAY_LAYERS = Object.freeze([
  "projects", "sections", "reviewed", "relationships",
]);
const VALID_TYPES = new Set(["project", "section", "feature", "component", "integration", "publication"]);

export function publicAtlasVisibleSlice(layout, options = {}) {
  const empty = () => ({ nodeIds: [], linkIndexes: [], count: 0 });
  if (!layout || layout.valid !== true || !Array.isArray(layout.nodes) ||
      !Array.isArray(layout.links) || layout.nodes.length > 96 ||
      layout.links.length > 256) return empty();

  const search = typeof options.search === "string"
    ? options.search.trim().toLocaleLowerCase().slice(0, 80) : "";
  const enabled = key => options[key] !== false;
  const visible = new Set();
  for (const node of layout.nodes) {
    if (!node || typeof node.id !== "string" ||
        typeof node.label !== "string" || !VALID_TYPES.has(node.type)) continue;
    const layer = node.type === "project" ? "projects" :
      node.type === "section" ? "sections" : "reviewed";
    if (!enabled(layer) || (search && !node.label.toLocaleLowerCase().includes(search))) continue;
    visible.add(node.id);
  }
  const linkIndexes = [];
  layout.links.forEach((link, index) => {
    if (!link || !visible.has(link.from) || !visible.has(link.to)) return;
    if (link.evidence === "reviewed-public-relation" && !enabled("relationships")) return;
    if (link.evidence === "reviewed-public-structure" ||
        link.evidence === "reviewed-public-relation") linkIndexes.push(index);
  });
  const nodeIds = layout.nodes.filter(node => visible.has(node?.id)).map(node => node.id);
  return { nodeIds, linkIndexes, count: nodeIds.length };
}
