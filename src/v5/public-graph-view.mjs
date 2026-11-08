/**
 * Server-rendered, no-JavaScript public structure/history reader.
 * It is used ONLY by the gated V5 Signal Field preview. Source records must
 * already be reviewed and allowlisted by public-graph-history.mjs.
 */
import {
  PUBLIC_GRAPH_REVIEWED_RECORDS, replayPublicGraphHistory,
} from "./public-graph-history.mjs";

const PREVIEW_FIELD = "/__v5_preview__/field/";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TIME = 8.64e15;
const safe = value => String(value ?? "").replace(/[&<>"']/g, char =>
  ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
const labels = Object.freeze({
  "publish-node": "Published structure",
  "retire-node": "Retired structure",
  "publish-relation": "Published relationship",
  "retire-relation": "Retired relationship",
  "reinstate-node": "Reinstated structure",
  "reinstate-relation": "Reinstated relationship",
});
const rootLink = id => {
  if (id === "section:knowledge-overview") return "/__v5_preview__/knowledge/";
  const match = /^project:([a-z][a-z0-9-]*)$/.exec(id);
  return match ? "/work/" + match[1] + "/" : null;
};
const utcDate = date => new Date(date).toISOString().slice(0, 10);

export function selectPublicGraphDate(requested, at = Date.now()) {
  const now = Number.isFinite(at) && at >= 0 && at <= MAX_TIME ? at : 0;
  const maxDate = utcDate(now);
  if (requested == null || requested === "") {
    return { selected: maxDate, maxDate, at: now, invalid: false };
  }
  if (typeof requested !== "string" || !DATE_PATTERN.test(requested)) {
    return { selected: maxDate, maxDate, at: now, invalid: true };
  }
  const day = Date.parse(requested + "T00:00:00.000Z");
  if (!Number.isFinite(day) || utcDate(day) !== requested ||
      requested > maxDate) {
    return { selected: maxDate, maxDate, at: now, invalid: true };
  }
  // Replay through the end of a completed UTC date, but never look ahead of
  // the actual server time for the current UTC day.
  const selectedEnd = Date.parse(requested + "T23:59:59.999Z");
  return { selected: requested, maxDate, at: Math.min(now, selectedEnd), invalid: false };
}

function structuralItem(node) {
  const link = rootLink(node.id);
  const heading = node.type === "section" ? "PUBLIC SECTION" :
    node.type === "project" ? "PUBLIC PROJECT" : "REVIEWED " + node.type.toUpperCase();
  const title = link
    ? '<a href="' + safe(link) + '">' + safe(node.label) + '</a>'
    : safe(node.label);
  const status = node.state === "catalogued"
    ? "Approved directory entry; no connection or historical launch is implied"
    : node.state === "retired" ? "Retired structure" : "Published structure";
  const evidence = node.evidenceUrl && node.reviewUrl
    ? '<p class="v5-graph-proof">Reviewed public milestone: ' +
      '<a href="' + safe(node.reviewUrl) + '">Publication review</a>' +
      ' · <a href="' + safe(node.evidenceUrl) + '">Source evidence</a></p>'
    : "";
  return '<li class="v5-graph-node"><article><span class="v5-graph-kind">' +
    heading + '</span><h3>' + title + '</h3><p>' + status + '</p>' +
    evidence + '</article></li>';
}
function relationshipItem(relation, nodes) {
  const from = nodes.get(relation.from), to = nodes.get(relation.to);
  return '<li><strong>' + safe(from?.label || "Unknown") + '</strong>' +
    '<span>' + safe(relation.type.replaceAll("-", " ")) + '</span>' +
    '<strong>' + safe(to?.label || "Unknown") + '</strong>' +
    '<a href="' + safe(relation.reviewUrl) + '">Review evidence</a></li>';
}

/** Render a bounded, dated structure inspector. Never accept raw live events. */
export function renderPublicGraphHistory({
  requestedDate = null, now = Date.now(), records = PUBLIC_GRAPH_REVIEWED_RECORDS,
} = {}) {
  const selection = selectPublicGraphDate(requestedDate, now);
  const frame = replayPublicGraphHistory(records, selection.at);
  const valid = frame.valid;
  const nodes = valid ? frame.nodes : frame.nodes.filter(n => n.state === "catalogued");
  const roots = nodes.filter(n => n.state === "catalogued");
  const children = nodes.filter(n => n.state !== "catalogued");
  const relations = valid ? frame.relations : [];
  const changes = valid ? frame.changes : [];
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const error = selection.invalid
    ? '<p class="v5-graph-error" role="status">Choose a valid UTC date no later than today. Showing the current directory.</p>'
    : !valid
      ? '<p class="v5-graph-error" role="status">The reviewed history could not be validated. Structural changes are hidden.</p>'
      : "";
  return '<section class="v5-graph-history" aria-labelledby="v5-graph-title" ' +
    'data-v5-graph-revision="' + frame.revision + '" data-v5-graph-version="' + frame.schema + '">' +
    '<div class="v5-graph-heading"><div><p class="v5-eyebrow">EVIDENCE-BASED STRUCTURE</p>' +
      '<h2 id="v5-graph-title">Public systems atlas</h2>' +
      '<p>Explore reviewed structures and their history. Live work signals are separate from this directory.</p></div>' +
      '<p class="v5-graph-revision">STRUCTURE REVISION <strong>' + frame.revision + '</strong></p></div>' +
    '<form class="v5-graph-date-form" method="get" action="' + PREVIEW_FIELD + '">' +
      '<label for="v5-graph-date">Structure as of (UTC)</label>' +
      '<input id="v5-graph-date" name="asOf" type="date" required value="' + selection.selected +
        '" max="' + selection.maxDate + '">' +
      '<button type="submit">View date</button>' +
      '<a href="' + PREVIEW_FIELD + '">Latest</a></form>' +
    error +
    '<p class="v5-graph-asof">Displaying reviewed structure through <time datetime="' +
      safe(new Date(selection.at).toISOString()) + '">' + safe(selection.selected) + '</time> UTC. ' +
      'Directory identities reflect current public curation, not proof of their existence on that date.</p>' +
    '<div class="v5-graph-summary" aria-label="Public structure summary">' +
      '<p><strong>' + roots.length + '</strong><span>Public identities</span></p>' +
      '<p><strong>' + children.length + '</strong><span>Reviewed structures</span></p>' +
      '<p><strong>' + relations.length + '</strong><span>Published relationships</span></p>' +
      '<p><strong>' + changes.length + '</strong><span>Dated changes</span></p></div>' +
    '<section class="v5-graph-section" aria-labelledby="v5-graph-directory-title">' +
      '<h3 id="v5-graph-directory-title">Public directory</h3>' +
      '<ul class="v5-graph-node-list">' + roots.map(structuralItem).join("") + '</ul></section>' +
    '<section class="v5-graph-section" aria-labelledby="v5-graph-structure-title">' +
      '<h3 id="v5-graph-structure-title">Reviewed components</h3>' +
      (children.length ? '<ul class="v5-graph-node-list">' + children.map(structuralItem).join("") + '</ul>'
        : '<p class="v5-graph-empty">No component milestones have been reviewed for public display.</p>') +
      '</section>' +
    '<section class="v5-graph-section" aria-labelledby="v5-graph-relations-title">' +
      '<h3 id="v5-graph-relations-title">Verified relationships</h3>' +
      (relations.length
        ? '<ul class="v5-graph-relations">' + relations.map(r => relationshipItem(r, nodeMap)).join("") + '</ul>'
        : '<p class="v5-graph-empty">No verified public relationships have been published.</p>') +
      '</section>' +
    '<section class="v5-graph-section" aria-labelledby="v5-graph-timeline-title">' +
      '<h3 id="v5-graph-timeline-title">Growth timeline</h3>' +
      (changes.length
        ? '<ol class="v5-graph-timeline">' +
          [...changes].reverse().map(c => '<li><time datetime="' + safe(c.effectiveAt) + '">' +
            safe(c.effectiveAt.slice(0, 10)) + '</time><span>' + safe(labels[c.action]) + '</span>' +
            '<a href="' + safe(c.reviewUrl) + '">Review #' + c.sequence + '</a></li>').join("") + '</ol>'
        : '<p class="v5-graph-empty">No reviewed structural events yet. GitHub activity alone does not create a node.</p>') +
      '</section><p class="v5-graph-footnote">This preview never reads private Knowledge pages, repo inventories, or provider data. ' +
      'A published project identity does not confirm an active source connection.</p>' +
    '</section>';
}
