import { publicNotes } from "./public-notes.mjs";
import { approvedPublicProjects as projects } from "../publication-manifest.mjs";
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const source = (path) =>
  "https://github.com/devonalanakins/devonakins.com/blob/53efc7cac6abdf83a44d6631285977202212b03b/" +
  path;
const link = (href, text) =>
  `<a class="v5-text-link" href="${esc(href)}">${esc(text)} <span aria-hidden="true">↗</span></a>`;
const heading = (kicker, title, description) =>
  `<header class="v5-page-heading"><p class="v5-eyebrow">${kicker}</p><h1 id="v5-title">${title}</h1><p>${description}</p></header>`;
export function renderReadingRoom(
  key,
  { root = "/__v5_preview__/", topic = null } = {},
) {
  if (key === "knowledge") {
    const note = publicNotes.find((n) => n.slug === topic);
    if (topic && !note)
      return (
        heading(
          "PUBLIC KNOWLEDGE",
          "Topic not found",
          "Choose a topic from the public reading room.",
        ) + link(root + "knowledge/", "All public topics")
      );
    if (note)
      return (
        heading(esc(note.kind), esc(note.title), esc(note.summary)) +
        `<div class="v5-reading-layout"><article class="v5-card v5-reading v5-note-body">${note.sections.map(([title, text]) => `<section><h2>${esc(title)}</h2><p>${esc(text)}</p></section>`).join("")}<section><h2>Inspect the source</h2><p>These are explanations of the public implementation, not independent certifications.</p>${note.sources.map(([label, path]) => link(source(path), label)).join("")}</section></article><aside class="v5-card v5-reading"><h2>Connected ideas</h2>${note.related
          .map((slug) => {
            const n = publicNotes.find((n) => n.slug === slug);
            return link(root + "knowledge/" + slug + "/", n.title);
          })
          .join("")}<h2>Referenced by</h2>${publicNotes
          .filter((n) => n.related.includes(note.slug))
          .map((n) => link(root + "knowledge/" + n.slug + "/", n.title))
          .join("")}${link(root + "knowledge/", "All topics")}</aside></div>`
      );
    return (
      heading(
        "PUBLIC KNOWLEDGE",
        "Ideas with context.",
        "A curated reading room about the public systems behind this website. Follow a question, inspect its source, and explore connected ideas.",
      ) +
      `<div class="v5-cards v5-project-grid">${publicNotes.map((n) => `<article class="v5-card v5-reading"><p class="v5-eyebrow">${esc(n.topic)}</p><h2>${esc(n.title)}</h2><p>${esc(n.summary)}</p><p class="v5-card-state">${esc(n.kind)}</p>${link(root + "knowledge/" + n.slug + "/", "Read & explore")}</article>`).join("")}</div><p class="v5-reading-disclosure">Curated public explanations. Private Knowledge records are not connected to this reading room.</p>`
    );
  }
  if (key === "research")
    return (
      heading(
        "QUESTIONS & METHODS",
        "Follow the question.",
        "Independent software experiments and engineering explanations. Project prototypes and research interests are distinct from established scientific results.",
      ) +
      `<section class="v5-section-heading"><h2>Independent research</h2></section><div class="v5-cards v5-project-grid">${[
        "rhen-language",
        "vesper",
      ]
        .map((slug) => {
          const p = projects.find((p) => p.slug === slug);
          return `<article class="v5-card v5-reading"><p class="v5-eyebrow">RESEARCH PROTOTYPE</p><h2>${esc(p.title)}</h2><p>${esc(p.summary)}</p><p class="v5-card-state">${esc(p.status)}</p><p>${esc(p.detail)}</p>${link("/work/" + p.slug + "/", "Project context")}${p.url ? link(p.url, "Inspect public research") : '<p class="v5-reading-disclosure">Source repository is private; the reviewed concept is public.</p>'}</article>`;
        })
        .join(
          "",
        )}</div><section class="v5-section-heading"><h2>Engineering explanations</h2></section><div class="v5-cards">${publicNotes.map((n) => `<article class="v5-card v5-reading"><h3>${esc(n.title)}</h3><p>${esc(n.summary)}</p>${link(root + "knowledge/" + n.slug + "/", "Read the explanation")}</article>`).join("")}</div><section class="v5-card v5-reading"><h2>Open areas of inquiry</h2><p>Mathematics, physics and cognition are ongoing interests. No new scientific findings, peer-reviewed publications or discoveries are claimed here.</p></section>`
    );
  if (key === "writing") {
    const writing = projects.find((p) => p.slug === "writing"),
      anevum = projects.find((p) => p.slug === "anevum");
    return (
      heading(
        "ORIGINAL WORKS",
        "Stories. Worlds. Possibilities.",
        "Books, revision and the worlds behind the pages.",
      ) +
      `<div class="v5-reading-layout"><article class="v5-card v5-reading"><p class="v5-eyebrow">BOOKS & MANUSCRIPTS</p><h2>Writing & revision</h2><p class="v5-card-state">${esc(writing.status)}</p><p>${esc(writing.description)}</p><p>${esc(writing.detail)}</p><p>Publication details and excerpts will be linked when an edition is ready to share.</p>${link("/work/writing/", "Writing record")}</article><article class="v5-card v5-reading"><img class="v5-wordmark" src="/v2/identity/anevum.svg" alt="Anevum" width="180" height="36"><h2>A world for original stories</h2><p>${esc(anevum.description)}</p><p>${esc(anevum.detail)}</p>${link(anevum.url, "Explore Anevum")}${link("/work/anevum/", "Creative project context")}</article></div>`
    );
  }
  return null;
}
