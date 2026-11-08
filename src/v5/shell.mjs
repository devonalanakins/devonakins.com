import { V5_PUBLIC_ROUTES, publishV5Links } from "./public-routes.mjs";
import { renderReadingRoom } from "./reading-room.mjs";
import { publicNotes } from "./public-notes.mjs";
import { projects } from "../content.mjs";
import { renderReferenceHomepage, renderReferenceNav } from "./reference-home.mjs";
import { renderPublicGraphHistory } from "./public-graph-view.mjs";
import { renderV5Atlas } from "./atlas-markup.mjs";

export const PREVIEW_ROOT = "/__v5_preview__/";
export const previewPages = [
  ["home", "Home"],
  ["field", "Systems Map"],
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
export const previewTopicPages = publicNotes.map(note => ({key:"knowledge", topic:note.slug, path:PREVIEW_ROOT+"knowledge/"+note.slug+"/"}));
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
  ({ "rhen-language": "rhen", devonstation: "devonstation-mark", ideaflow: "ideaflow-mark" })[
    project.slug
  ] || project.slug;
const projectLink = (project) => `/work/${project.slug}/`;
const lockup = (project) =>
  !["mizvo", "merit", "rhen-language", "squelch", "vesper", "anevum", "brandicade", "devonstation", "ideaflow"].includes(project.slug) ? `<span class="v5-wordmark-text">${esc(project.title)}</span>` :
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
    <span class="v5-field-core" aria-hidden="true">DA<span>PUBLIC PROJECTS</span></span>
    <div class="v5-project-orbits">${catalog.map((project, index) => `<a class="v5-orbit v5-orbit-${index}" href="${projectLink(project)}">${lockup(project)}<span>${esc(project.label)}</span></a>`).join("")}</div>
  </div>`;
}
function ribbon() {
  return `<section class="v5-ribbon" aria-label="Work, Spotify and GPT sources">
    <div class="v5-ribbon-label"><span class="v5-status-ring" aria-hidden="true"></span>ACTIVITY<span>Independent sources</span></div>
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
  return `<a class="v5-card v5-project-card" data-v5-project-card data-search-text="${esc([project.title,project.label,project.summary,...project.tags].join(" ").toLowerCase())}" data-project-category="${esc(project.category)}" href="${projectLink(project)}">${lockup(project)}<span class="v5-card-state">${esc(project.status)}</span><h3>${esc(project.label)}</h3><p>${esc(project.summary)}</p><span class="v5-text-link">Explore project <span aria-hidden="true">↗</span></span></a>`;
}
function home() {
  return `<section class="v5-hero" aria-labelledby="v5-title">
    <div class="v5-portrait"><picture><source media="(max-width: 600px)" type="image/webp" srcset="/src/v5/assets/portrait-anevum-transcosmic-mobile.webp"><img src="/src/v5/assets/portrait-anevum-transcosmic.webp" alt="Cinematic portrait artwork of Devon Akins in a dark eclipse-graphic T-shirt and fitted jeans" width="1122" height="1402" fetchpriority="high" decoding="async"></picture></div>
    <div class="v5-intro"><p class="v5-eyebrow">INDEPENDENT DEVELOPER · AUTHOR</p><h1 id="v5-title">Devon<br><span>Akins.</span></h1><p class="v5-lede">Building useful systems.<br>Exploring ideas. Creating worlds.</p><p class="v5-intro-detail">Father, writer and independent developer working where thoughtful engineering meets imagination.</p>
      <div class="v5-actions"><a class="v5-button" href="${href("field")}">Explore the systems map <span aria-hidden="true">↗</span></a><a class="v5-secondary" href="${href("projects")}">My work</a></div>
      <a class="v5-github" href="https://github.com/devonalanakins">GitHub <span aria-hidden="true">↗</span></a>
    </div>
    <div class="v5-hero-field">${fieldComposition()}<p class="v5-art-note">Static project composition · no activity or dependency claims</p></div>
  </section>${ribbon()}
  <section class="v5-work-section" aria-labelledby="v5-work-title"><div class="v5-section-heading"><div><p class="v5-eyebrow">THE WORKSHOP</p><h2 id="v5-work-title">Ideas taking shape.</h2></div><a href="${href("projects")}">All projects <span aria-hidden="true">↗</span></a></div>
    <div class="v5-cards">${["merit", "rhen-language", "anevum"].map((slug) => projectCard(projects.find((p) => p.slug === slug))).join("")}</div>
  </section>`;
}
function secondary(key, options = {}) {
  const reading = renderReadingRoom(key, options);
  if (reading !== null) return reading;
  const page = previewPages.find((entry) => entry.key === key);
  const heading = (eyebrow, title, description) =>
    `<header class="v5-page-heading"><p class="v5-eyebrow">${eyebrow}</p><h1 id="v5-title">${title}</h1><p>${description}</p></header>`;
  if (key === "projects")
    return `${heading("THE WORKSHOP", "Projects & systems", "Original software, creative worlds and practical tools. Status descriptions come from the existing public portfolio; they are not live telemetry.")}
    <form class="v5-directory-controls" role="search" data-v5-directory-controls hidden><label>Find a project<input type="search" maxlength="120" data-v5-project-search placeholder="Name, purpose or subject"></label><label>Category<select data-v5-project-category><option value="">All categories</option>${["software","research","creative","business"].map(c=>`<option value="${c}">${c[0].toUpperCase()+c.slice(1)}</option>`).join("")}</select></label><p role="status" data-v5-project-count>${projects.length} public projects</p></form><div class="v5-cards v5-project-grid">${projects.map(projectCard).join("")}</div><p class="v5-card v5-reading" data-v5-project-empty hidden>No matching public projects. Try another name or category.</p>`;
  if (key === "field")
    return `${heading("SYSTEMS MAP", "A connected body of work.", "Explore approved public identities, inspect reviewed structural relationships in 3D, and replay the dated record without implying live work.")}
    <!-- V5_FIELD_BEGIN -->${renderV5Atlas({ requestedDate: options.asOf ?? null, now: options.now ?? Date.now() })}
    ${renderPublicGraphHistory({ requestedDate: options.asOf ?? null, now: options.now ?? Date.now() })}
    <!-- V5_FIELD_END -->${ribbon()}<section class="v5-card v5-reading"><h2>Live evidence stays separate.</h2><p>Editor observations, participating agent tasks and GitHub history do not create permanent graph nodes. This gated preview does not request private provider data.</p><a class="v5-text-link" href="/studio/">View the current Live Studio <span aria-hidden="true">↗</span></a></section>`;
  return `${heading("THE PERSON BEHIND THE PROJECTS", "Hello. I’m Devon.", "Father, author and independent developer. I build useful software, write fiction and help improve the systems behind family businesses.")}
    <section class="v5-card v5-reading"><h2>Curiosity, made useful.</h2><p>I care about software people can understand, original work worth finishing, and making space for family along the way.</p><div class="v5-actions"><a class="v5-button" href="/about/">Read my biography</a><a class="v5-secondary" href="/contact/">Get in touch</a></div></section>`;
}
export function renderV5Preview(key = "home", options = {}) {
  if (!previewPages.some((page) => page.key === key))
    throw new Error("Unknown V5 preview page");
  const nav = (className) =>
    `<nav class="${className}" aria-label="${className === "v5-desktop-nav" ? "Primary" : "Mobile"}">${previewPages.map((page) => `<a href="${page.path}"${key === page.key ? ' aria-current="page"' : ""}>${page.label}</a>`).join("")}</nav>`;
  const previewNotice = `<aside class="v5-preview-banner" aria-label="Preview notice"><span>INTERNAL DESIGN PREVIEW</span><span data-v5-preview-source-state>Development only · live sources not loaded</span><button type="button" data-v5-preview-connect hidden>Preview verified public signals</button><a href="/">Current website <span aria-hidden="true">↗</span></a></aside>`;
  return `<!doctype html><html lang="en" data-v5-signal-mode="preview"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="description" content="Development-only DevonAkins.com layout preview. Live data is not connected."><title>${previewPages.find((page) => page.key === key).label} — DevonAkins.com Preview</title><link rel="icon" href="/brand-mark-mono.svg"><link rel="stylesheet" href="/src/v5/shell.css">${key === "home" ? '<link rel="stylesheet" href="/src/v5/reference-home.css">' : ""}<script type="module" src="/src/v5/client.ts"></script></head>
  <body${key === "field" ? ' class="v5-page-field"' : ""}><a class="v5-skip" href="#v5-main">Skip to content</a><div class="v5-frame">
    ${key === "home" ? "" : previewNotice}
    <header class="v5-topbar"><a class="v5-brand" href="${PREVIEW_ROOT}" aria-label="Devon Akins home"><img src="/brand-mark-mono.svg" alt="" width="34" height="34"><span>DEVONAKINS.COM<small>SOFTWARE · WORLDS · POSSIBILITIES</small></span></a>${key === "home" ? renderReferenceNav() : nav("v5-desktop-nav")}<details class="v5-mobile-menu" data-mobile-menu><summary>Menu</summary>${nav("v5-mobile-nav")}</details></header>
    <main id="v5-main" tabindex="-1">${key === "home" ? renderReferenceHomepage() : secondary(key, options)}</main>
    <footer class="v5-footer"><a href="${PREVIEW_ROOT}">Devon Alan Akins</a><p>Original work. Open questions. A growing body of ideas.</p><nav aria-label="More"><a href="/listening/">Listening</a><a href="/gpt/">GPT captures</a><a href="/contact/">Contact</a></nav></footer>
    ${key === "home" ? previewNotice : ""}
  </div></body></html>`;
}


// Built only by the explicit, non-default release-candidate build. The
// screenshot-authoritative home markup is shared with the preview; only
// publication metadata and links change. This function alone cannot alter
// any deployed route or bypass the existing public V4 consent gates.
export function renderV5PublicHomepage({ fullSite = false } = {}) {
  let html = renderV5Preview("home");
  const exact = (before, after) => {
    if (!html.includes(before)) throw new Error("V5 public home source drift: " + before);
    html = html.replace(before, after);
  };
  exact('data-v5-signal-mode="preview"', 'data-v5-signal-mode="released-v5"');
  exact('<meta name="robots" content="noindex,nofollow,noarchive">', '<meta name="robots" content="index,follow,max-image-preview:large">');
  exact('Development-only DevonAkins.com layout preview. Live data is not connected.',
    'Devon Alan Akins — independent developer, researcher, writer and builder. Public work and source-qualified activity.');
  exact('<title>Home — DevonAkins.com Preview</title>',
    '<title>Devon Alan Akins — Developer, Researcher, Builder</title>');
  // The below-footer preview-only control is never published. The released
  // homepage automatically READS the same consent-filtered V4 projection.
  const notice = /<aside class="v5-preview-banner" aria-label="Preview notice">[\s\S]*?<\/aside>/;
  if (!notice.test(html)) throw new Error("V5 preview banner not found");
  html = html.replace(notice, "");
  const publicRoutes = [
    ["/__v5_preview__/projects/", "/work/"],
    // A standalone V5 home continues to preserve legacy V4 links. The
    // explicitly selected full-site V5 release must navigate to its real
    // Knowledge, Research, Writing, and Signal Field pages instead.
    ["/__v5_preview__/knowledge/", fullSite ? "/knowledge/" : "/source/"],
    ["/__v5_preview__/research/", fullSite ? "/research/" : "/source/"],
    ["/__v5_preview__/writing/", fullSite ? "/writing/" : "/work/writing/"],
    ["/__v5_preview__/field/", fullSite ? "/signal-field/" : "/#v5-lock-field-title"],
    ["/__v5_preview__/about/", "/about/"],
    ["/__v5_preview__/", "/"],
  ];
  for (const [preview, published] of publicRoutes) {
    html = html.replaceAll('href="' + preview + '"', 'href="' + published + '"');
  }
  if (html.includes("/__v5_preview__/") || html.includes("DESIGN PREVIEW") ||
      html.includes("data-v5-preview-connect") ||
      html.includes("noindex,nofollow,noarchive")) {
    throw new Error("Unreleased preview content in V5 public homepage");
  }
  return html;
}

/** Opt-in whole-site candidate. Default V4 and home-only candidates are unchanged. */
export function renderV5PublicPage(key, options = {}) {
  const path = options.publicPath ?? V5_PUBLIC_ROUTES[key];
  if (!path || !Object.hasOwn(V5_PUBLIC_ROUTES,key)) throw Error("Unknown public V5 route");
  let html = key === "home" ? renderV5PublicHomepage({ fullSite: true }) : renderV5Preview(key, options);
  html = html.replace('data-v5-signal-mode="preview"','data-v5-signal-mode="released-v5"')
    .replace('<meta name="robots" content="noindex,nofollow,noarchive">','<meta name="robots" content="index,follow,max-image-preview:large">')
    .replace(/<aside class="v5-preview-banner" aria-label="Preview notice">[\s\S]*?<\/aside>/g,"")
    .replace('Development-only DevonAkins.com layout preview. Live data is not connected.',
      'Public projects, writing and source-linked engineering explanations by Devon Alan Akins.')
    .replace(/ — DevonAkins.com Preview<\/title>/,' — Devon Alan Akins</title>');
  html = publishV5Links(html).replace('href="/#v5-lock-field-title"','href="/signal-field/"')
    .replaceAll('This preview never reads private Knowledge','The public atlas never reads private Knowledge')
    .replaceAll('This gated preview does not request private provider data.','This view does not request private provider data.')
    .replaceAll('Preview · no source request','Live sources not loaded on this page');
  const topic = options.topic && publicNotes.find(note => note.slug === options.topic);
  if (topic) html=html.replace(/<title>[^<]*<\/title>/,`<title>${esc(topic.title)} — Devon Alan Akins</title>`);
  if (options.pageTitle) html=html.replace(/<title>[^<]*<\/title>/,
    `<title>${esc(options.pageTitle)} — Devon Alan Akins</title>`);
  // The full-site candidate publishes real canonical, shareable page metadata.
  // Use an existing first-party public image; never expose preview artwork,
  // fictional source readings or private Knowledge documents.
  const socialTitle = html.match(/<title>([^<]*)<\/title>/)?.[1];
  if (!socialTitle) throw Error("Public page title missing");
  const canonical = "https://devonakins.com" + esc(path);
  const social = `<link rel="canonical" href="${canonical}">` +
    `<meta property="og:type" content="website">` +
    `<meta property="og:site_name" content="DevonAkins.com">` +
    `<meta property="og:title" content="${socialTitle}">` +
    `<meta property="og:description" content="Original software, writing, and source-linked research by Devon Alan Akins.">` +
    `<meta property="og:url" content="${canonical}">` +
    `<meta property="og:image" content="https://devonakins.com/da-social-2400.png">` +
    `<meta property="og:image:alt" content="Original DevonAkins.com social illustration">` +
    `<meta name="twitter:card" content="summary_large_image">`;
  html = html.replace('</head>', social + '</head>');
  if (html.includes('/__v5_preview__/')) throw Error("Preview link in public V5 page");
  return html;
}

export function renderV5ProjectPage(slug) {
  const p=projects.find(p=>p.slug===slug);
  if(!p) throw Error("Unknown public project");
  let html=renderV5PublicPage("projects",{publicPath:"/work/"+p.slug+"/",pageTitle:p.title});
  const content=`<header class="v5-page-heading"><p class="v5-eyebrow">${esc(p.category)} · ${esc(p.role)}</p>${lockup(p)}<h1 id="v5-title">${esc(p.title)}</h1><p>${esc(p.summary)}</p></header><div class="v5-reading-layout"><article class="v5-card v5-reading"><p class="v5-card-state">${esc(p.status)}</p><h2>The project</h2><p>${esc(p.description)}</p><h2>Documented scope</h2><p>${esc(p.detail)}</p><h2>Next acceptance step</h2><p>${esc(p.next)}</p></article><aside class="v5-card v5-reading"><h2>Public information</h2><p>${esc(p.boundary)}</p>${p.url?`<a class="v5-text-link" href="${esc(p.url)}" rel="noopener noreferrer">${esc(p.urlLabel||"Public source")}</a>`:""}<a class="v5-text-link" href="/work/">All projects</a><a class="v5-text-link" href="/writing/">Writing</a><a class="v5-text-link" href="/research/">Research</a><a class="v5-text-link" href="/knowledge/">Public Knowledge</a></aside></div>`;
  return html.replace(/<main id="v5-main" tabindex="-1">[\s\S]*?<\/main>/,`<main id="v5-main" tabindex="-1">${content}</main>`)
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(p.title)} — Devon Alan Akins</title>`);
}
