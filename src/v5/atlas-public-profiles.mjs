/**
 * Read-only public editorial project profiles for the V5 Signal Field.
 *
 * Profiles come solely from the site's existing CURATED public portfolio,
 * never private Knowledge, arbitrary repository discovery, event payloads,
 * agent status or inferred graph relations. A portfolio status is not live.
 */
import { projects } from "../content.mjs";

const ROOT_CATALOG = Object.freeze([
  ["project:devonstation", "devonstation", null],
  ["project:mizvo", "mizvo", "https://github.com/devonalanakins/mizvo"],
  ["section:knowledge-overview", null, null],
  ["project:anevum", "anevum", "https://anevum.com"],
  ["project:rhen-language", "rhen-language", "https://github.com/devonalanakins/rhen"],
  ["project:merit", "merit", "https://github.com/devonalanakins/merit"],
  ["project:vesper", "vesper", "https://github.com/devonalanakins/vesper"],
  ["project:squelch", "squelch", "https://github.com/devonalanakins/squelch"],
]);

const short = (value, max) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max
    ? value.trim() : null;

export function publicAtlasProfiles(layout) {
  if (layout?.valid !== true || !Array.isArray(layout.nodes) ||
      layout.nodes.length > 96) return [];
  const roots = layout.nodes.filter(node => node?.parent === null);
  if (roots.length !== ROOT_CATALOG.length) return [];
  const result = [];
  for (const [id, slug, approvedUrl] of ROOT_CATALOG) {
    const found = roots.filter(node => node?.id === id);
    if (found.length !== 1) return [];
    const node = found[0];
    if (!short(node.label, 70) || node.state !== "catalogued" ||
        node.type !== (slug === null ? "section" : "project")) return [];
    if (slug === null) {
      if (node.label !== "Knowledge") return [];
      result.push(Object.freeze({
        id, title: "Knowledge", category: "Public section",
        status: "Curated directory entry, not a live service",
        summary: "Browse the public introduction to Knowledge. The private record library and personal, family, client and business information are not published here.",
        boundary: "No private Knowledge pages, record titles, metadata, backlinks or access credentials are exposed.",
        url: "/__v5_preview__/knowledge/", urlLabel: "Open public section",
      }));
      continue;
    }
    const source = projects.find(project => project.slug === slug);
    if (!source || node.label !== source.title) return [];
    const category = short(source.label, 90);
    const status = short(source.status, 100);
    const summary = short(source.summary, 450);
    const boundary = short(source.boundary, 650);
    if (!category || !status || !summary || !boundary) return [];
    const url = approvedUrl && source.url === approvedUrl ? approvedUrl : null;
    const urlLabel = url ? (short(source.urlLabel, 90) || "Open public project") : null;
    result.push(Object.freeze({
      id, title: node.label, category, status, summary, boundary,
      url, urlLabel,
    }));
  }
  return Object.freeze(result);
}
