import { replayPublicGraphHistory } from "./public-graph-history.mjs";
import { selectPublicGraphDate } from "./public-graph-view.mjs";
import { projectV5Atlas } from "./atlas-layout.mjs";

const esc = v => String(v ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const url = id => {
  if (id === "section:knowledge-overview") return "/__v5_preview__/knowledge/";
  const slug = /^project:([a-z][a-z0-9-]*)$/.exec(id)?.[1];
  return slug ? "/work/" + slug + "/" : null;
};
const terms = Object.freeze({
  project: "Public project", section: "Public section",
  component: "Reviewed component", feature: "Reviewed feature",
  publication: "Reviewed publication", integration: "Reviewed integration",
});
function item(node, source) {
  const target = url(node.id) || url(node.parent);
  const root = node.parent === null;
  const proof = !root && source?.evidenceUrl && source.reviewUrl
    ? '<p class="v5-atlas-proof"><a href="' + esc(source.reviewUrl) +
      '">Publication review</a> · <a href="' + esc(source.evidenceUrl) +
      '">Evidence source</a></p>'
    : "";
  return '<details data-v5-atlas-node-id="' + esc(node.id) +
    '" id="v5-atlas-' + esc(node.id.replace(/[^a-z0-9]+/g, "-")) +
    '"><summary>' + esc(node.label) + '</summary><p>' +
    esc(terms[node.type] || "Reviewed public structure") + ' · ' +
    (root ? "Catalog identity only. This is not a verified active reporter." :
      node.state === "retired" ? "Historical, retired structure." :
        "Published from an explicitly reviewed public milestone.") + '</p>' +
    (target ? '<a class="v5-text-link" href="' + esc(target) +
      '">Open public context</a>' : "") + proof + '</details>';
}
function renderExplorer(layout) {
  const roots = layout.nodes.filter(node => node.parent === null);
  const projects = roots.filter(node => node.type === "project");
  const sections = roots.filter(node => node.type === "section");
  const reviewed = layout.nodes.filter(node => node.parent !== null);
  const relations = layout.links.filter(edge => edge.evidence === "reviewed-public-relation");
  const layer = (key, label, count) =>
    '<label class="v5-atlas-layer"><input type="checkbox" data-v5-atlas-layer="' +
    key + '" checked' + (count === 0 ? ' disabled' : '') +
    '><span>' + label + '</span><strong>' + count + '</strong></label>';
  return '<aside class="v5-atlas-explorer" aria-label="Public systems explorer">' +
    '<p class="v5-eyebrow">SIGNAL FIELD · V5</p>' +
    '<h2>Systems explorer</h2>' +
    '<p class="v5-atlas-explorer-note">Inspect the curated public catalog. Project names are not live connections.</p>' +
    '<nav class="v5-atlas-quicklinks" aria-label="Signal Field sections">' +
      '<a href="#v5-atlas-viewport" aria-current="location">Atlas view</a>' +
      '<a href="#v5-graph-timeline-title">Growth timeline</a>' +
      '<a href="#v5-graph-relations-title">Reviewed relationships</a>' +
    '</nav>' +
    '<div data-v5-atlas-controls hidden>' +
      '<div class="v5-atlas-filter-search" role="search">' +
        '<label for="v5-atlas-search">Find a public system</label>' +
        '<input id="v5-atlas-search" type="search" autocomplete="off"' +
          ' placeholder="Search approved names" maxlength="80" data-v5-atlas-search>' +
      '</div>' +
      '<fieldset class="v5-atlas-layer-list"><legend>Visible layers</legend>' +
        layer("projects", "Projects", projects.length) +
        layer("sections", "Public sections", sections.length) +
        layer("reviewed", "Reviewed structures", reviewed.length) +
        layer("relationships", "Reviewed relationships", relations.length) +
      '</fieldset>' +
    '</div>' +
    '<nav aria-label="Approved public system index"><h3>Public directory</h3>' +
    '<ul class="v5-atlas-root-list">' +
      roots.map(node =>
        '<li><a href="#v5-atlas-' + esc(node.id.replace(/[^a-z0-9]+/g, "-")) +
          '" data-v5-atlas-select="' + esc(node.id) + '">' +
          '<span class="v5-atlas-root-glyph" aria-hidden="true"></span>' +
          '<span>' + esc(node.label) + '<small>' +
            (node.type === "project" ? "Public project" : "Public section") +
          '</small></span></a></li>'
      ).join("") +
    '</ul></nav>' +
    '<p class="v5-atlas-visible-status" data-v5-atlas-filter-count>' +
      roots.length + ' approved public identities · no live connection implied</p>' +
  '</aside>';
}
/** Gated, SEO-disabled preview only. The homepage and V4 never use this. */
export function renderV5Atlas({ requestedDate = null, now = Date.now() } = {}) {
  const selection = selectPublicGraphDate(requestedDate, now);
  const frame = replayPublicGraphHistory(undefined, selection.at);
  const layout = projectV5Atlas(frame);
  const sources = new Map(frame.nodes.map(node => [node.id, node]));
  return '<section class="v5-atlas-shell" data-v5-atlas data-v5-atlas-version="' +
    layout.version + '" data-v5-atlas-at="' +
    esc(new Date(selection.at).toISOString()) + '" data-v5-atlas-revision="' +
    frame.revision + '" aria-label="Reviewed public systems atlas">' +
    renderExplorer(layout) +
    '<div class="v5-atlas-viewport" id="v5-atlas-viewport">' +
      '<div class="v5-atlas-host" data-v5-atlas-host aria-hidden="true"></div>' +
      '<div class="v5-atlas-still" data-v5-atlas-still aria-hidden="true">' +
        '<span class="v5-atlas-still-mark">DA</span>' +
        '<span>THE LIVING MIND</span>' +
      '</div>' +
      '<div class="v5-atlas-label-layer" data-v5-atlas-label-layer aria-hidden="true"></div>' +
      '<div class="v5-atlas-legend" aria-hidden="true"><span>APPROVED PUBLIC IDENTITIES</span>' +
        '<span>Solid links require reviewed public evidence</span></div>' +
    '</div>' +
    '<aside class="v5-atlas-index" aria-label="Accessible public systems index">' +
      '<p class="v5-eyebrow">THE STRUCTURAL MAP</p>' +
      '<h2>Explore the structure.</h2>' +
      '<p data-v5-atlas-status role="status">3D rendering is optional. The complete public index works without JavaScript or graphics.</p>' +
      '<p class="v5-atlas-caveat">Only approved public identities and separately reviewed structural milestones appear here. A visual node does not imply live work, a connected service, or a software dependency.</p>' +
      '<div class="v5-atlas-details">' + layout.nodes.map(node => item(node, sources.get(node.id))).join("") + '</div>' +
    '</aside>' +
  '</section>';
}
