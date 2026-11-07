import { projects } from "../content.mjs";

// This is the screenshot's semantic layout, not a bitmap or a simulated feed.
// Data slots stay unavailable until independently authenticated/consented sources
// are connected. The original V4 renderer and production route are untouched.
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
const bySlug = (slug) => projects.find((entry) => entry.slug === slug);
const projectHref = (slug) => "/work/" + encodeURIComponent(slug) + "/";
const identitySlug = (slug) =>
  ({ "rhen-language": "rhen", devonstation: "devonstation-mark" })[slug] || slug;
const protectedLink = (label, href, text) =>
  '<a href="' + href + '" aria-label="' + escapeHtml(label) + '">' + text + "</a>";
const icon = (name) => {
  const paths = {
    signal: '<path d="M2 12h3l2-6 3 12 3-9 2 4h7"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 17l9 5 9-5"/>',
    book: '<path d="M12 7c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V6c-3-1-6-1-9 1ZM12 7v14"/>',
    code: '<path d="m8 4-6 8 6 8m8-16 6 8-6 8M14 3l-4 18"/>',
    play: '<path d="m7 4 13 8-13 8V4Z"/>',
    orbit: '<ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-30 12 12)"/><circle cx="12" cy="12" r="2"/>',
    nodes: '<circle cx="5" cy="6" r="2"/><circle cx="18" cy="4" r="2"/><circle cx="12" cy="20" r="2"/><path d="m7 6 9-2M6 8l5 10m6-12-4 12"/>',
    github: '<path d="M9 19c-4 1-4-2-6-2m12 4v-3a3 3 0 0 0-1-2c4-.4 7-2 7-7a5 5 0 0 0-1-4c.1-1-.2-2-1-3-2 0-3 1-4 1a13 13 0 0 0-6 0C8 2 7 2 5 2c-.8 1-1.1 2-1 3a5 5 0 0 0-1 4c0 5 3 7 7 7a3 3 0 0 0-1 2v3"/>',
    search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7"/>',
    music: '<path d="M9 18V5l12-2v13M9 9l12-2"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/>',
    pencil: '<path d="m3 17 11-11 4 4L7 21H3v-4ZM13 7l4 4M15 5l2-2 4 4-2 2"/>',
    arrow: '<path d="M4 12h16m-7-7 7 7-7 7"/>',
  };
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.orbit) + "</svg>";
};
const navRail = [
  ["Live Signal", "signal", "/studio/"],
  ["Projects", "layers", "/__v5_preview__/projects/"],
  ["Knowledge", "book", "/__v5_preview__/knowledge/"],
  ["GitHub", "github", "https://github.com/devonalanakins"],
  ["Media", "play", "/listening/"],
  ["Anevum", "orbit", "/work/anevum/"],
  ["Mizvo", "nodes", "/work/mizvo/"],
  ["Writing", "pencil", "/__v5_preview__/writing/"],
  ["Socials", "user", "/contact/"],
];

function projectArtwork(index) {
  // Five first-party illustrated environments matched to the approved image.
  // Deliberately atmospheric: no bars, heights, pulses or symbols imply
  // project readiness, verified progress or market price data.
  const scenePaths = [
    // Mizvo: sculpted violet ecosystem ridges.
    '<path d="M0 126 Q43 84 88 129 T190 113 T300 106 L300 180 H0Z" fill="url(#v5art-a)"/>' +
    '<path d="M-20 141 Q47 70 93 134 T188 119 T330 109M-10 156 Q53 92 96 150 T193 138 T330 129M-10 164 Q55 114 100 161 T204 152 T320 143"/>',
    // Rhen: warm systems horizon / multiple crossing trajectories.
    '<path d="M0 163 C70 136 113 107 178 119 S269 127 315 67M0 155 Q99 160 142 89 T319 108M-10 175 C65 141 96 155 153 125 T310 157"/>' +
    '<circle cx="238" cy="68" r="6" fill="#ffd6a0" stroke="none"/>',
    // Merit: precise cyan luminous engineering loops.
    '<path d="M-14 120 Q80 65 145 142 T316 126M-14 130 Q78 79 145 151 T316 135M-14 144 Q74 104 149 165 T316 155"/>' +
    '<path d="M36 148 91 91l63 67 52-52 75 55M66 157l27-25 35 22" stroke-dasharray="5 5"/>',
    // Vesper: amber monolithic geometry, neutral market metaphor.
    '<path d="M0 178 0 157 31 157 31 139 52 139 52 171 74 171 74 122 96 122 96 171 116 171 116 92 132 92 132 167 145 167 145 113 172 113 172 171 198 171 198 72 212 72 212 160 236 160 236 103 248 103 248 171 272 171 272 120 294 120 294 178Z" fill="url(#v5art-a)"/>' +
    '<path d="M0 154 48 148 75 133 109 143 141 107 169 128 211 85 245 106 280 83 300 65"/>',
    // Squelch: sculptural four-channel violet/fuchsia signal waves.
    '<path d="M-20 151 C15 150 17 84 40 94 S70 179 93 147 S132 53 154 126 S184 175 207 116 S259 77 320 148M-20 161 C17 157 20 101 46 107 S76 187 98 158 S137 75 155 138 S188 184 211 130 S254 98 320 158"/>' +
    '<path d="M33 115v-34M41 125v-51M50 139v-72M58 126v-53M66 144v-60M74 132v-34M84 145v-52" stroke-width="2"/>',
  ];
  const palettes = [
    ["#1d0b46", "#9c5df9", "#5d3bd1"],
    ["#261102", "#ffc078", "#bd6a2c"],
    ["#041c30", "#62f8ff", "#178fb0"],
    ["#221002", "#f0b66f", "#ad7528"],
    ["#200528", "#ff83f0", "#863deb"],
  ];
  const [dark, bright, shade] = palettes[index] || palettes[0];
  return '<svg class="v5-lock-project-art" viewBox="0 0 300 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="v5art-a-' + index + '" x1="0" x2="1" y1="1" y2="0"><stop stop-color="' + dark + '" stop-opacity=".86"/><stop offset=".6" stop-color="' +
    shade + '" stop-opacity=".39"/><stop offset="1" stop-color="' + bright + '" stop-opacity=".21"/></linearGradient>' +
    '<radialGradient id="v5art-b-' + index + '" cx=".74" cy=".8" r=".67"><stop stop-color="' + bright + '" stop-opacity=".58"/><stop offset="1" stop-color="' + dark + '" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="300" height="180" fill="url(#v5art-b-' + index + ')"/>' +
    '<g fill="none" stroke="' + bright + '" stroke-width="1.5" opacity=".73">' + scenePaths[index].replaceAll('url(#v5art-a)', 'url(#v5art-a-' + index + ')') + '</g>' +
    Array.from({length:14},(_,i)=>'<circle cx="'+((i*73+17)%300)+'" cy="'+((i*41+9)%180)+'" r="'+(i%4===0?1.5:.65)+'" fill="'+bright+'" opacity="'+(.2+(i%5)*.1)+'"/>').join("") +
    '</svg>';
}

function featuredProject(slug, number) {
  const entry = bySlug(slug);
  if (!entry) return "";
  return '<a class="v5-lock-project v5-lock-project-' + number + '" href="' +
    projectHref(slug) + '">' + projectArtwork(number) +
    '<img class="v5-lock-wordmark" src="/v2/identity/' +
    identitySlug(slug) + '.svg" alt="" loading="lazy">' +
    '<h3>' + escapeHtml(entry.title) + '</h3>' +
    '<p>' + escapeHtml(entry.label || entry.summary) + '</p>' +
    '<span class="v5-lock-state">Portfolio · ' + escapeHtml(entry.status) +
    '</span></a>';
}
const fieldPoints = [
  ["DevonStation", 13, 49, "cyan"], ["Mizvo", 25, 35, "violet"],
  ["Knowledge", 37, 32, "teal"], ["Anevum", 53, 20, "amber"],
  ["Rhen", 65, 33, "amber"], ["Merit", 74, 45, "gold"],
  ["Vesper", 84, 37, "blue"], ["Squelch", 94, 44, "pink"],
];
function terrain() {
  const wires = Array.from({ length: 36 }, (_, i) => {
    const y = 150 + i * 4.6;
    return '<path d="M 0 ' + y + ' Q 220 ' + (45 + i * 2) +
      ' 400 ' + (150 + i * 2) + ' T 800 ' + (142 + i * 2) +
      ' T 1199 ' + (100 + i * 3) + '"/>';
  }).join("");
  const beams = fieldPoints.map(([name, x, y, color]) =>
    '<span class="v5-lock-beam v5-lock-' + color +
    '" style="--point-x:' + x + '%;--point-y:' + y +
    '%"><span class="v5-lock-beam-label">' + escapeHtml(name) +
    '</span><span class="v5-lock-beam-line"></span><span class="v5-lock-beam-dot"></span></span>',
  ).join("");
  return '<div class="v5-lock-terrain" aria-hidden="true">' +
    '<svg class="v5-lock-terrain-wire" viewBox="0 0 1199 300" preserveAspectRatio="none" fill="none"><g>' +
    wires + '</g></svg>' + beams + '</div>';
}

export function renderReferenceNav() {
  const items = [
    ["Home", "/__v5_preview__/"],
    ["Projects", "/__v5_preview__/projects/"],
    ["Knowledge", "/__v5_preview__/knowledge/"],
    ["Anevum", "/work/anevum/"],
    ["Mizvo", "/work/mizvo/"],
    ["Writing", "/__v5_preview__/writing/"],
    ["Media", "/listening/"],
  ];
  const nav = '<nav class="v5-desktop-nav v5-lock-top-nav" aria-label="Primary">' +
    items.map(([label, href], i) =>
      '<a href="' + href + '"' + (i === 0 ? ' aria-current="page"' : "") +
      ">" + label + "</a>").join("") + "</nav>";
  const search = '<button class="v5-lock-search-toggle" type="button" data-v5-search-toggle aria-label="Search public projects" aria-controls="v5-lock-search-panel" aria-expanded="false">' +
    icon("search") + '</button>' +
    '<div class="v5-lock-search-panel" id="v5-lock-search-panel" data-v5-search-panel hidden>' +
      '<label for="v5-lock-search-input">Search public projects</label>' +
      '<input id="v5-lock-search-input" data-v5-search-input type="search" autocomplete="off" placeholder="Project or system">' +
      '<ul data-v5-search-items>' +
      projects.filter((p) => Boolean(p.slug) && Boolean(p.title) && p.status !== "private")
        .map((p) =>
          '<li data-v5-search-item data-search-text="' +
          escapeHtml([p.title, p.label, p.summary].filter(Boolean).join(" ").toLowerCase()) +
          '"><a href="' + projectHref(p.slug) + '">' + escapeHtml(p.title) + "</a></li>",
        ).join("") +
      '</ul><p data-v5-search-empty hidden>No matching public project.</p>' +
    '</div>';
  return nav + search + '<a class="v5-lock-profile-link" href="/about/" aria-label="About Devon">' +
    icon("user") + '</a><a class="v5-lock-source-link" href="/studio/" aria-label="View source state">' +
    '<span class="v5-lock-source-dot" aria-hidden="true"></span>SOURCES</a>';
}

export function renderReferenceHomepage() {
  const rail = navRail.map(([label, glyph, href], i) =>
    '<a href="' + href + '"' + (i === 0 ? ' aria-current="location"' : "") +
    '>' + icon(glyph) + '<span>' + label + '</span></a>',
  ).join("");
  const cards = ["mizvo", "rhen-language", "merit", "vesper", "squelch"]
    .map(featuredProject).join("");
  return '<div class="v5-locked-home" data-v5-exact-reference="2026-11-07">' +
    '<section class="v5-locked-hero" aria-labelledby="v5-title">' +
      '<nav class="v5-locked-rail" aria-label="Screenshot side navigation">' + rail + '</nav>' +
      '<div class="v5-locked-portrait v5-portrait"><picture><source media="(max-width: 600px)" type="image/webp" srcset="/src/v5/assets/portrait-anevum-transcosmic-mobile.webp"><img src="/src/v5/assets/portrait-anevum-transcosmic.webp" alt="Cinematic portrait artwork of Devon Akins in a dark eclipse-graphic T-shirt and fitted jeans" width="1122" height="1402" fetchpriority="high" decoding="async"></picture></div>' +
      '<div class="v5-locked-identity"><h1 id="v5-title">Devon Alan Akins</h1>' +
        '<p class="v5-locked-roles">Developer · Researcher · Builder · Father<br>Writer · Systems Architect</p>' +
        '<div class="v5-locked-accent"></div>' +
        '<p class="v5-locked-manifesto">Building real tools, exploring real ideas,<br>and turning research into things<br>that actually work.</p>' +
        '<div class="v5-locked-socials">' +
          protectedLink("GitHub profile", "https://github.com/devonalanakins", icon("github")) +
          protectedLink("Social links and contact", "/contact/", icon("user")) +
          protectedLink("Public projects", "/__v5_preview__/projects/", icon("nodes")) +
        '</div>' +
        '<a class="v5-locked-session-link" href="/studio/"><span class="v5-locked-indicator" aria-hidden="true"></span>Work source status</a>' +
        '<p class="v5-locked-identity-small">Verified signals only · no session asserted</p>' +
      '</div>' +
      '<section class="v5-locked-signal" aria-labelledby="v5-lock-signal-title">' +
        '<header class="v5-lock-signal-heading"><div>' + icon("signal") +
        '<div><h2 id="v5-lock-signal-title">Live Signal <span>V5</span></h2><p>REAL WORK · REAL EVIDENCE</p></div></div><span class="v5-lock-wave" aria-hidden="true"></span></header>' +
        '<a class="v5-lock-spotify v5-lock-evidence" data-v5-signal="spotify" href="/listening/">' +
          '<span class="v5-lock-music-tile">' + icon("music") + '</span>' +
          '<span class="v5-lock-music-text"><small>SPOTIFY · PLAYBACK</small><strong>Playback not loaded</strong><span>Awaiting consented source</span></span>' +
          '<span class="v5-lock-open" aria-hidden="true">' + icon("arrow") + '</span>' +
        '</a>' +
        '<a class="v5-lock-work v5-lock-evidence" data-v5-signal="work" href="/studio/">' +
          '<span class="v5-lock-panel-title">' + icon("code") + ' Current Work Session <small>NOT VERIFIED</small></span>' +
          '<span class="v5-lock-no-work">No fresh, verified work session</span>' +
          '<span class="v5-lock-work-hint">Editor / GitHub / participating agent sources are separate</span>' +
        '</a>' +
        '<section class="v5-lock-metrics" aria-label="Evidence-based activity metrics">' +
          '<header class="v5-lock-panel-title">' + icon("signal") + ' Live Metrics <small>PROVENANCE REQUIRED</small></header>' +
          '<div class="v5-lock-metric-grid">' +
            '<a data-v5-signal="gpt" href="/gpt/"><span>GPT CAPTURE</span><strong>—</strong><small>Manual · dated</small></a>' +
            '<a href="/studio/"><span>COMMITS</span><strong>—</strong><small>Verified events</small></a>' +
            '<a href="/studio/"><span>BUILDS</span><strong>—</strong><small>Verified CI</small></a>' +
            '<a href="/__v5_preview__/projects/"><span>PROJECTS</span><strong>—</strong><small>Approved scope</small></a>' +
          '</div>' +
        '</section>' +
      '</section>' +
    '</section>' +
    '<section class="v5-lock-projects" aria-labelledby="v5-lock-projects-title">' +
      '<div class="v5-lock-heading"><h2 id="v5-lock-projects-title">' + icon("layers") + 'Active Projects</h2><span>Public portfolio · not a claim of live activity</span><a href="/__v5_preview__/projects/">View All Projects →</a></div>' +
      '<div class="v5-lock-project-grid">' + cards + '</div>' +
    '</section>' +
    '<div class="v5-lock-triple">' +
      '<section class="v5-lock-panel" aria-labelledby="v5-lock-github-title"><h2 id="v5-lock-github-title">' + icon("github") + ' GitHub Activity <small>PROVIDER-SOURCED</small></h2><p class="v5-lock-empty">Waiting for verified, allowlisted GitHub events.</p><a href="https://github.com/devonalanakins">View GitHub →</a></section>' +
      '<section class="v5-lock-panel" aria-labelledby="v5-lock-threads-title"><h2 id="v5-lock-threads-title">' + icon("nodes") + ' Threads Feed <small>CONNECTION PENDING</small></h2><p class="v5-lock-empty">Public Threads posts will appear only through a permitted integration after account authorization and publication review.</p><a href="/contact/">Public social profiles →</a></section>' +
      '<section class="v5-lock-panel" aria-labelledby="v5-lock-gpt-title"><h2 id="v5-lock-gpt-title">' + icon("signal") + ' GPT Analytics <small>MANUAL CAPTURES</small></h2><p class="v5-lock-empty">Owner-recorded values will display here with their capture date. No automated token total is claimed.</p><a href="/gpt/">View GPT profile →</a></section>' +
    '</div>' +
    '<section class="v5-lock-field" aria-labelledby="v5-lock-field-title">' +
      '<header><h2 id="v5-lock-field-title">The Signal Field</h2><p>A living view of everything in motion — verified events only.</p></header>' +
      terrain() +
      '<p class="v5-lock-art-disclosure">Static project composition · no activity or dependency claims</p>' +
      '<a class="v5-lock-field-cta" href="/__v5_preview__/field/">Explore the Signal Field →</a>' +
    '</section>' +
  '</div>';
}
