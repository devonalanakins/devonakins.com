/**
 * Overlay current, consent-filtered V4 evidence on the fixed public atlas.
 * Input must be the normalized publicV5ProjectEvidence projection, never raw
 * discovery, private Knowledge data or direct provider payloads. This does
 * not create graph nodes, structural relationships or runtime traffic.
 */
const ROOTS = Object.freeze([
  ["project:devonstation", "devonstation", "DevonStation"],
  ["project:mizvo", "mizvo", "Mizvo"],
  ["project:anevum", "anevum", "Anevum"],
  ["project:rhen-language", "rhen-language", "Rhen"],
  ["project:merit", "merit", "Merit"],
  ["project:vesper", "vesper", "Vesper"],
  ["project:squelch", "squelch", "Squelch"],
]);
const SOURCES = Object.freeze({
  editor: Object.freeze(["Editor observed"]),
  remote: Object.freeze(["Codex task", "Work task", "Workflow task"]),
});

export function publicV5AtlasSignals(projection, at = Date.now()) {
  const empty = { available: false, active: [] };
  if (!Number.isFinite(at) || projection?.available !== true ||
      !projection.nodes || typeof projection.nodes !== "object" ||
      Array.isArray(projection.nodes)) return empty;
  const active = [];
  for (const [id, slug, label] of ROOTS) {
    if (!Object.hasOwn(projection.nodes, slug)) continue;
    const evidence = projection.nodes[slug]?.active;
    const kind = evidence?.kind;
    const sources = typeof kind === "string" && Object.hasOwn(SOURCES, kind)
      ? SOURCES[kind] : null;
    if (!sources || !sources.includes(evidence.source) ||
        typeof evidence.at !== "string" || evidence.at.length > 36) continue;
    const observed = Date.parse(evidence.at);
    if (!Number.isFinite(observed) || new Date(observed).toISOString() !== evidence.at ||
        observed > at + 10_000 || at - observed >= 120_000) continue;
    active.push({ id, label, kind: evidence.kind, source: evidence.source, at: evidence.at });
  }
  return { available: true, active };
}
