import { projects } from "../content.mjs";
import { renderReferenceHomepage, renderReferenceNav } from "./reference-home.mjs";

export const PREVIEW_ROOT = "/__v5_preview__/";
export const previewPages = [
  ["home", "Home"],
  ["field", "Signal Field"],
  ["projects", "Projects"],
  ["writing", "Writing"],
  ["research", "Research"],
  ["knowledge", "Knowledge"],
  ["about", "About"],
].map(([key, label]) => ({
  key,
  label,
  path: PREVIEW_ROOT + (key === "home" ? "" : key + "/"),
}));
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const href = (key) => previewPages.find((p) => p.key === key).path;
const catalog = [
  "mizvo",
  "devonstation",
  "rhen-language",
  "merit",
  "anevum",
  "squelch",
  "brandicade",
  "vesper",
].map((slug) => projects.find((project) => project.slug === slug));
const identity = (project) =>
  ({ "rhen-language": "rhen", devonstation: "devonstation-mark" })[
    project.slug
  ] || project.slug;
const projectLink = (project) => `/work/${project.slug}/`;
const lockup = (project) =>
  `<img class="v5-wordmark" src="/v2/identity/${identity(project)}.svg" alt="${esc(project.title)}" width="180" height="36">`;

function fieldComposition() {
  // An authored, static illustration. These curves encode no dependencies or events.
  const curves = Array.from({ length: 24 }, (_, index) => {
    const y = 65 + index * 13;
    const bend = index % 2 ? 90 : -80;
    return `<path d="M 40 ${y} C 190 ${y + bend}, 250 ${500 - y}, 365 222 S 560 ${y - bend}, 695 ${y}"/>`;
  }).join("");
  const stars = Array.from({ length: 65 }, (_, index) => {
    const x = 40 + ((index * 97) % 650);
    const y = 55 + ((index * 79) % 320);
    return `<circle cx="${x}" cy="${y}" r="${index % 5 === 0 ? 2 : 1}"/>`;
  }).join("");
  return `<div class="v5-field-art">
    <svg viewBox="0 0 730 440" aria-hidden="true" focusable="false"><defs>
      <radialGradient id="field-halo"><stop stop-color="#7beae9" stop-opacity=".22"/><stop offset="1" stop-color="#7beae9" stop-opacity="0"/></radialGradient>
      <linearGradient id="field-thread"><stop stop-color="#b39dfa" stop-opacity=".15"/><stop offset=".47" stop-color="#7beae9" stop-opacity=".8"/><stop offset="1" stop-color="#b39dfa" stop-opacity=".25"/></linearGradient>
    </defs><ellipse cx="365" cy="222" rx="280" ry="205" fill="url(#field-halo)"/>
    <g class="v5-strands" fill="none" stroke="url(#field-thread)">${curves}</g>
    <g fill="#a6f3ed" opacity=".65">${stars}</g>
    <g fill="none" stroke="#7beae9" opacity=".4"><ellipse cx="365" cy="222" rx="80" ry="65"/><ellipse cx="365" cy="222" rx="65" ry="80" transform="rotate(32 365 222)"/></g></svg>
    <span class="v5-field-core" aria-hidden="true">DA<span>THE LIVING MIND</span></span>
    <div class="v5-project-orbits">${catalog.map((project, index) => `<a class="v5-orbit v5-orbit-${index}" href="${projectLink(project)}">${lockup(project)}<span>${esc(project.label)}</span></a>`).join("")}</div>
  </div>`;
}
function ribbon() {
  return `<section class="v5-ribbon" aria-label="Work, Spotify and GPT sources">
    <div class="v5-ribbon-label"><span class="v5-status-ring" aria-hidden="true"></span>LIVE SIGNAL<span>Independent sources</span></div>
    ${[
      [
        "work",
        "Work",
        "Work signal not loaded",
        "/studio/",
        "View work sources",
      ],
      [
        "spotify",
        "Spotify",
        "Playback not loaded",
        "/listening/",
        "Visit Listening",
      ],
      ["gpt", "GPT", "Capture not loaded", "/gpt/", "View dated GPT captures"],
    ]
      .map(
        ([key, label, state, url, link]) =>
          `<a data-v5-signal="${key}" class="v5-signal" href="${url}" aria-label="${link}"><span>${label}<span aria-hidden="true">↗</span></span><strong>${state}</strong><small>Preview · no source request</small></a>`,
      )
      .join("")}
  </section>`;
}
function projectCard(project) {
  return `<a class="v5-card v5-project-card" href="${projectLink(project)}">${lockup(project)}<span class="v5-card-state">${esc(project.status)}</span><h3>${esc(project.label)}</h3><p>${esc(project.summary)}</p><span class="v5-text-link">Explore project <span aria-hidden="true">↗</span></span></a>`;
}
function home() {
  return `<section class="v5-hero" aria-labelledby="v5-title">
    <div class="v5-portrait"><img src="/v2/crossed-arms.webp" alt="Devon Akins, standing with his arms crossed" width="820" height="1024" fetchpriority="high"></div>
    <div class="v5-intro"><p class="v5-eyebrow">INDEPENDENT DEVELOPER · AUTHOR</p><h1 id="v5-title">Devon<br><span>Akins.</span></h1><p class="v5-lede">Building useful systems.<br>Exploring ideas. Creating worlds.</p><p class="v5-intro-detail">Father, writer and independent developer working where thoughtful engineering meets imagination.</p>
      <div class="v5-actions"><a class="v5-button" href="${href("field")}">Explore the Signal Field <span aria-hidden="true">↗</span></a><a class="v5-secondary" href="${href("projects")}">My work</a></div>
      <a class="v5-github" href="https://github.com/devonalanakins">GitHub <span aria-hidden="true">↗</span></a>
    </div>
    <div class="v5-hero-field">${fieldComposition()}<p class="v5-art-note">Static project composition · no activity or dependency claims</p></div>
  </section>${ribbon()}
  <section class="v5-work-section" aria-labelledby="v5-work-title"><div class="v5-section-heading"><div><p class="v5-eyebrow">THE WORKSHOP</p><h2 id="v5-work-title">Ideas taking shape.</h2></div><a href="${href("projects")}">All projects <span aria-hidden="true">↗</span></a></div>
    <div class="v5-cards">${["merit", "rhen-language", "anevum"].map((slug) => projectCard(projects.find((p) => p.slug === slug))).join("")}</div>
  </section>`;
}
function secondary(key) {
  const page = previewPages.find((entry) => entry.key === key);
  const heading = (eyebrow, title, description) =>
    `<header class="v5-page-heading"><p class="v5-eyebrow">${eyebrow}</p><h1 id="v5-title">${title}</h1><p>${description}</p></header>`;
  if (key === "projects")
    return `${heading("THE WORKSHOP", "Projects & systems", "Original software, creative worlds and practical tools. Status descriptions come from the existing public portfolio; they are not live telemetry.")}
    <div class="v5-cards v5-project-grid">${catalog.map(projectCard).join("")}</div>`;
  if (key === "field")
    return `${heading("THE SIGNAL FIELD", "A connected body of work.", "Explore the existing public project identities. This first preview is a static composition; the semantic 3D atlas, inspector and replay are not implemented yet.")}
    <section class="v5-field-stage" aria-label="Static project composition">${fieldComposition()}</section><p class="v5-art-note">Decorative geometry · project links lead to the current portfolio</p>
    ${ribbon()}<section class="v5-card v5-reading"><h2>Structure needs evidence.</h2><p>The future atlas will distinguish enduring project structure from temporary activity. A project being listed here does not mean its reporter is connected or that it is currently running.</p><a class="v5-text-link" href="/studio/">View the current Live Studio <span aria-hidden="true">↗</span></a></section>`;
  if (key === "writing")
    return `${heading("ORIGINAL WORKS", "Stories. Worlds. Possibilities.", "Writing, revision and the worlds behind the pages.")}
    <section class="v5-card v5-reading"><p class="v5-eyebrow">BOOKS & MANUSCRIPTS</p><h2>Making room for the story.</h2><p>${esc(projects.find((p) => p.slug === "writing").description)}</p><a class="v5-text-link" href="/work/writing/">Books & writing <span aria-hidden="true">↗</span></a></section>`;
  if (key === "research")
    return `${heading("QUESTIONS & METHODS", "Follow the question.", "Mathematics, physics, cognition and software engineering are ongoing interests. Study, original hypotheses and validated findings will have distinct labels.")}
    <section class="v5-card v5-reading"><h2>Research index in preparation</h2><p>No new articles, reviewed findings or discoveries are published in this preview.</p><a class="v5-text-link" href="/#research">Read the current research introduction <span aria-hidden="true">↗</span></a></section>`;
  if (key === "knowledge")
    return `${heading("PUBLIC KNOWLEDGE", "Ideas with context.", "A future curated index of public topics, sources and relationships.")}
    <section class="v5-card v5-reading"><h2>Public index in preparation</h2><p>This preview does not connect to the private Knowledge workspace. Public articles and backlinks will appear only after individual review.</p><a class="v5-text-link" href="/source/">Explore existing public source <span aria-hidden="true">↗</span></a></section>`;
  return `${heading("THE PERSON BEHIND THE PROJECTS", "Hello. I’m Devon.", "Father, author and independent developer. I build useful software, write fiction and help improve the systems behind family businesses.")}
    <section class="v5-card v5-reading"><h2>Curiosity, made useful.</h2><p>I care about software people can understand, original work worth finishing, and making space for family along the way.</p><div class="v5-actions"><a class="v5-button" href="/about/">Read my biography</a><a class="v5-secondary" href="/contact/">Get in touch</a></div></section>`;
}
export function renderV5Preview(key = "home") {
  if (!previewPages.some((page) => page.key === key))
    throw new Error("Unknown V5 preview page");
  const nav = (className) =>
    `<nav class="${className}" aria-label="${className === "v5-desktop-nav" ? "Primary" : "Mobile"}">${previewPages.map((page) => `<a href="${page.path}"${key === page.key ? ' aria-current="page"' : ""}>${page.label}</a>`).join("")}</nav>`;
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="description" content="Development-only Living Mind V5 layout preview. Live data is not connected."><title>${previewPages.find((page) => page.key === key).label} — Living Mind V5 Preview</title><link rel="icon" href="/brand-mark-mono.svg"><link rel="stylesheet" href="/src/v5/shell.css">${key === "home" ? '<link rel="stylesheet" href="/src/v5/reference-home.css">' : ""}<script type="module" src="/src/v5/client.ts"></script></head>
  <body><a class="v5-skip" href="#v5-main">Skip to content</a><div class="v5-frame">
    <aside class="v5-preview-banner" aria-label="Preview notice"><span>DESIGN PREVIEW · V5</span><span>Development only · live sources not loaded</span><a href="/">Current website <span aria-hidden="true">↗</span></a></aside>
    <header class="v5-topbar"><a class="v5-brand" href="${PREVIEW_ROOT}" aria-label="Devon Akins home"><img src="/brand-mark-mono.svg" alt="" width="34" height="34"><span>DEVONAKINS.COM<small>SOFTWARE · WORLDS · POSSIBILITIES</small></span></a>${key === "home" ? renderReferenceNav() : nav("v5-desktop-nav")}<details class="v5-mobile-menu" data-mobile-menu><summary>Menu</summary>${nav("v5-mobile-nav")}</details></header>
    <main id="v5-main" tabindex="-1">${key === "home" ? renderReferenceHomepage() : secondary(key)}</main>
    <footer class="v5-footer"><a href="${PREVIEW_ROOT}">The Living Mind <span>V5</span></a><p>Original work. Open questions. A growing body of ideas.</p><nav aria-label="More"><a href="/listening/">Listening</a><a href="/gpt/">GPT captures</a><a href="/contact/">Contact</a></nav></footer>
  </div></body></html>`;
}
