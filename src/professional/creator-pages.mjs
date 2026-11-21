import {PODCAST_TITLE, PODCAST_DESCRIPTION, podcastPublication, publicWebUrl} from "./podcast-publication.mjs";

export const CREATOR_ROUTES = Object.freeze({podcast: "/podcast/", setup: "/setup/"});
export const CREATOR_CATEGORIES = Object.freeze([
  {id: "field", label: "Field Kit", description: "A portable recording chain for interviews away from the studio."},
  {id: "stage", label: "The Stage", description: "Camera, lighting and stands for a two-person recording room. The room, seating and acoustic treatment are still open decisions."},
  {id: "control", label: "Control Room", description: "Editing, monitoring, storage and backups."},
  {id: "lab", label: "Blackwell Lab", description: "Future local AI and scientific computing hardware."}
]);
export const CREATOR_GEAR = Object.freeze([
  {id: "p4next", category: "field", kind: "recorder", name: "Zoom PodTrak P4next", spec: "4 XLR inputs · 4 headphone outputs · 24-bit/48 kHz WAV",
    use: "Separate mic tracks and independent headphone monitoring for the host and guest.", quantity: "1 under consideration", status: "considering",
    url: "https://zoomcorp.com/en/us/podtrak-recorders/podcast-recorders/podtrak-p4next/", retailer: "https://www.sweetwater.com/store/detail/PodTrakP4next--zoom-podtrak-p4next-audio-interface"},
  {id: "podmic-usb", category: "field", kind: "mic", name: "RØDE PodMic USB", spec: "Black · dynamic cardioid · XLR and USB-C",
    use: "Use XLR into the recorder for interviews or USB-C into a compatible device for solo recording.", quantity: "2 under consideration", status: "considering", shared: true,
    url: "https://rode.com/en-us/products/podmic-usb", retailer: "https://www.sweetwater.com/store/detail/PodMicUSB--rode-podmic-usb-dynamic-broadcast-microphone"},
  {id: "mdr7506", category: "field", kind: "headphones", name: "Sony MDR-7506", spec: "Closed-back · 63 Ω · wired 3.5 mm plug",
    use: "A pair for each person to check levels and catch noise during recording.", quantity: "2 under consideration", status: "considering", shared: true,
    url: "https://electronics.sony.com/audio/headphones/all-headphones/p/mdr7506", retailer: "https://www.sweetwater.com/store/detail/MDR7506--sony-mdr-7506-closed-back-professional-headphones"},
  {id: "fx30", category: "stage", kind: "camera", name: "Sony FX30", spec: "ILME-FX30B body · APS-C / Super 35 · Sony E-mount",
    use: "A possible main camera. Start with a test of one wide angle before designing a multi-camera setup.", quantity: "1 under consideration", status: "considering",
    url: "https://electronics.sony.com/imaging/interchangeable-lens-cameras/all-interchangeable-lens-cameras/p/ilmefx30b", retailer: "https://www.bhphotovideo.com/c/product/1729317-REG/sony_ilme_fx30_fx30_digital_cinema_camera.html"},
  {id: "sigma-18-50", category: "stage", kind: "lens", name: "Sigma 18–50mm F2.8 DC DN", spec: "Contemporary · Sony E version · constant f/2.8",
    use: "An APS-C zoom for the FX30. Whether 18 mm fits both seats depends on the room and camera position.", quantity: "1 under consideration", status: "considering",
    url: "https://www.sigma-global.com/en/lenses/c021_18_50_28/", retailer: "https://www.bhphotovideo.com/c/product/1667228-REG/sigma_18_50mm_f_2_8_dg_dn.html"},
  {id: "halo-200x", category: "stage", kind: "light", name: "amaran Halo 200x", spec: "200 W · bi-color COB · Bowens mount",
    use: "A possible key light with a softbox. Check distance, room power and fan noise during a recording test.", quantity: "Up to 2 under consideration", status: "considering",
    url: "https://amarancreators.com/products/amaran-halo-200x"},
  {id: "km-2109", category: "stage", kind: "stand", name: "K&M 210/9", spec: "Black · telescoping boom · 5/8-inch thread on linked model",
    use: "Floor stands can keep the mics off the table. Test stability with the actual mic and cable at interview height.", quantity: "2 under consideration", status: "considering",
    url: "https://www.sweetwater.com/store/detail/KM21090--k-and-m-210-9-telescoping-boom-microphone-stand", linkLabel: "Sweetwater"},
  {id: "dgx-spark", category: "lab", kind: "compute", name: "NVIDIA DGX Spark", spec: "GB10 Grace Blackwell · 128 GB unified memory · Arm CPU",
    use: "A future option for local inference and small-scale AI experiments. Check Arm software compatibility and benchmark a real workload before choosing hardware.", status: "future",
    url: "https://www.nvidia.com/en-us/products/workstations/dgx-spark/", retailer: "https://marketplace.nvidia.com/en-us/enterprise/personal-ai-supercomputers/dgx-spark/"}
]);
const statusText = Object.freeze({owned: "Owned and verified", selected: "Selected but not purchased", considering: "Considering", future: "Future"});
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[character]));
const configuredPodcast = podcastPublication();
export const creatorPaths = [CREATOR_ROUTES.podcast, CREATOR_ROUTES.setup, ...configuredPodcast.episodes.map(episode => episode.route)];
export const creatorMediaFiles = configuredPodcast.mediaFiles;
const podcastFormat = episode => episode.format === "interview" ? "Interview" : "Solo";
const podcastDate = new Intl.DateTimeFormat("en-US", {dateStyle: "long", timeZone: "UTC"});
const episodeDuration = seconds => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return (minutes ? minutes + " min " : "") + (remainder || !minutes ? remainder + " sec" : "");
};
const arrow = '<span aria-hidden="true">↗</span>';
function link(path, label, current) {
  return '<a href="' + escapeHtml(path) + '"' + (path === current ? ' aria-current="page"' : "") + '>' + escapeHtml(label) + '</a>';
}
function external(url, label, context) {
  return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer"' +
    (context ? ' aria-label="' + escapeHtml(label + " — " + context) + '"' : "") + '>' + escapeHtml(label) + ' ' + arrow + '</a>';
}
function button(path, label, primary = false) {
  return '<a class="pc-button' + (primary ? ' pc-button-primary' : '') + '" href="' + path + '">' + label + ' ' + arrow + '</a>';
}
function themeControl() {
  return '<label class="pc-appearance"><span>Appearance</span><select data-lab-theme-select><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>';
}
function shell({path, title, description, current, rss, image}, main) {
  const canonical = 'https://devonakins.com' + path;
  const socialImage = 'https://devonakins.com' + (image || '/social-card.jpg');
  return '<!doctype html><html lang="en" class="lab-html"><head>' +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
    '<meta name="theme-color" content="#f3f1e9"><meta name="color-scheme" content="light dark">' +
    '<script src="/laboratory-theme.js"></script>' +
    '<meta name="description" content="' + escapeHtml(description) + '"><title>' + escapeHtml(title) + '</title>' +
    '<link rel="canonical" href="' + escapeHtml(canonical) + '">' +
    (rss ? '<link rel="alternate" type="application/rss+xml" title="' + PODCAST_TITLE + '" href="' + escapeHtml(rss.href) + '">' : '') +
    '<meta property="og:type" content="website"><meta property="og:title" content="' + escapeHtml(title) + '">' +
    '<meta property="og:description" content="' + escapeHtml(description) + '"><meta property="og:url" content="' + escapeHtml(canonical) + '">' +
    '<meta property="og:image" content="' + escapeHtml(socialImage) + '">' +
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + escapeHtml(title) + '">' +
    '<meta name="twitter:description" content="' + escapeHtml(description) + '"><meta name="twitter:image" content="' + escapeHtml(socialImage) + '">' +
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="apple-touch-icon" href="/apple-touch-icon.png">' +
    '<link rel="stylesheet" href="/src/professional/creator-pages.css"></head>' +
    '<body class="creator-body"><a class="pc-skip" href="#pc-main">Skip to content</a>' +
    '<header class="pc-header"><div class="pc-wrap pc-header-row"><a class="pc-brand" href="/" aria-label="da. Devon Alan Akins home"><span aria-hidden="true">da.</span><small>Devon Alan Akins</small></a>' +
    '<nav class="pc-nav" aria-label="Primary navigation">' +
    link("/work/", "Work", current) + link("/research/", "Research", current) + link("/podcast/", "Podcast", current) + link("/setup/", "My Setup", current) +
    '</nav></div></header><main id="pc-main" tabindex="-1">' + main + '</main>' +
    '<footer class="pc-footer pc-wrap"><div><a href="/" aria-label="da. Devon Alan Akins home">da.</a><p>Devon Alan Akins</p></div>' +
    '<nav aria-label="Footer navigation"><a href="/fieldnotes/">Writing</a><a href="/about/">About</a><a href="/contact/">Contact</a></nav>' +
    themeControl() + '</footer></body></html>';
}
function episodeMeta(episode) {
  return '<p class="pc-episode-meta">' + podcastFormat(episode) +
    (episode.guests.length ? ' · ' + episode.guests.map(escapeHtml).join(', ') : '') +
    ' · <time datetime="' + episode.date + '">' + podcastDate.format(new Date(episode.date)) + '</time> · ' +
    episodeDuration(episode.durationSeconds).trim() + '</p>';
}
function episodeCard(episode, featured = false) {
  return '<article class="pc-episode">' +
    (episode.thumbnail ? '<img src="' + episode.thumbnail + '" alt="" loading="lazy" decoding="async">' : '') +
    '<div>' + (featured ? '<p class="pc-eyebrow">Featured episode</p>' : '') + '<h3>' +
    link(episode.route, episode.title) + '</h3>' + episodeMeta(episode) + '<p>' + escapeHtml(episode.summary) + '</p></div></article>';
}
function renderEpisode(episode) {
  const related = episode.links.filter(({url}) => publicWebUrl(url)).map(({label, url}) => '<li>' + external(url, label) + '</li>').join('');
  return '<article class="pc-wrap pc-episode-detail"><header><p class="pc-eyebrow"><a href="/podcast/">Devon Alan Akins podcast</a></p>' +
    '<h1>' + escapeHtml(episode.title) + '</h1>' + episodeMeta(episode) + '<p class="pc-lede">' + escapeHtml(episode.summary) + '</p></header>' +
    (episode.video ? '<video controls playsinline preload="none" aria-label="Episode video"' +
      (episode.thumbnail ? ' poster="' + episode.thumbnail + '"' : '') + '><source src="' + episode.video + '" type="video/mp4">' +
      '<track kind="captions" srclang="en" label="English" src="' + episode.captions + '"><a href="' + episode.video + '">Download video</a></video>' : '') +
    (episode.audio ? '<audio controls preload="none" aria-label="Episode audio"><source src="' + episode.audio + '" type="audio/mpeg"><a href="' + episode.audio + '">Download audio</a></audio>' : '') +
    (episode.playbackLinks.length ? '<ul class="pc-media-links">' + episode.playbackLinks.map(({href, label}) => '<li>' + external(href, label) + '</li>').join('') + '</ul>' : '') +
    (episode.notes.length ? '<section class="pc-section"><h2>Show notes</h2>' + episode.notes.map(note => '<p>' + escapeHtml(note) + '</p>').join('') + '</section>' : '') +
    (related ? '<section class="pc-section"><h2>Links</h2><ul>' + related + '</ul></section>' : '') +
    (episode.transcript.length ? '<section class="pc-section"><h2>Transcript</h2>' + episode.transcript.map(line => '<p>' + escapeHtml(line) + '</p>').join('') + '</section>' : '') +
    '</article>';
}
function renderPodcast({episodes, outlets}) {
  const featured = episodes[0];
  return '<div class="pc-wrap"><section class="pc-hero" aria-labelledby="pc-title"><div class="pc-hero-copy">' +
    '<p class="pc-eyebrow">The podcast</p><h1 id="pc-title">Devon <em>Alan Akins</em></h1>' +
    '<p class="pc-lede">I mostly sit down with people I want to talk to. Sometimes it’s just me working through a question or talking about something I’m making.</p>' +
    (!featured ? '<p class="pc-state">No episodes published yet</p>' : '') +
    '<div class="pc-actions">' + button('#episodes', featured ? 'Browse episodes' : 'About the show', true) + button('/setup/', 'See my setup') + '</div></div>' +
    '<div class="pc-hero-art" aria-hidden="true"><svg viewBox="0 0 540 520" fill="none"><circle cx="270" cy="260" r="194"/><circle cx="270" cy="260" r="145"/><circle cx="270" cy="260" r="96"/>' +
    '<path d="M40 264h55l14-36 20 92 28-148 22 183 27-119 20 28h43l19-38 24 80 26-141 25 208 21-125 17 16h99"/><path d="M86 264h368M270 55v410"/></svg></div></section>' +
    '<section class="pc-section pc-two-column" id="episodes" aria-labelledby="pc-episodes-title"><div><h2 id="pc-episodes-title">Episodes</h2></div>' +
    (featured ? '<div class="pc-episodes">' + episodeCard(featured, true) + episodes.slice(1).map(episode => episodeCard(episode)).join('') + '</div>' :
      '<div class="pc-prose"><p>I’m still getting the show going. Interviews will be mostly unscripted. We could get into science, business, games, or whatever comes up.</p><p>Published episodes will appear here.</p></div>') + '</section>' +
    (outlets.length ? '<section class="pc-section pc-two-column"><h2>Follow the show</h2><ul class="pc-media-links">' +
      outlets.map(({label, href}) => '<li>' + external(href, label) + '</li>').join('') + '</ul></section>' : '') +
    '<section class="pc-section pc-two-column pc-studio-teaser"><div><h2>How I’m putting it together</h2></div><div class="pc-prose"><p>I’m working out what I need to record in the field, shoot in a room, and edit afterward.</p>' +
    button('/setup/', 'Explore My Setup') + '</div></section></div>';
}
function glyph(kind){
  const shapes={
    recorder:'<rect x="80" y="18" width="120" height="106" rx="8"/><rect x="99" y="35" width="82" height="25" rx="3"/><circle cx="113" cy="85" r="9"/><circle cx="168" cy="85" r="9"/><path d="M100 107h80"/>',
    mic:'<rect x="116" y="14" width="48" height="75" rx="24"/><path d="M101 64a39 39 0 0 0 78 0M140 102v20m-32 0h64M119 38h42m-42 14h42"/>',
    headphones:'<path d="M79 74V64a61 61 0 0 1 122 0v10"/><rect x="71" y="71" width="27" height="44" rx="9"/><rect x="182" y="71" width="27" height="44" rx="9"/><path d="M98 108l16 8m68-8-16 8"/>',
    camera:'<rect x="65" y="43" width="150" height="70" rx="9"/><circle cx="139" cy="78" r="28"/><circle cx="139" cy="78" r="12"/><path d="M87 43l11-20h52l11 20m32 0V33h14v10"/>',
    lens:'<path d="M100 27h70l20 13v68l-20 13h-70l-12-13V40z"/><path d="M106 27v94m20-94v94m36-94v94"/><ellipse cx="174" cy="74" rx="10" ry="26"/>',
    light:'<rect x="92" y="22" width="96" height="54" rx="3"/><path d="M140 76v46m-35 0h70M92 22l-29-13m125 13 29-13M92 76L63 89m125-13 29 13"/>',
    stand:'<path d="M75 47h88l18-12M163 47l15 15M128 47v75m-25 0h50M128 122l-43 13m43-13 43 13M181 35l16-12"/>',
    compute:'<rect x="67" y="20" width="146" height="106" rx="5"/><path d="M90 44h100M90 64h100M90 84h100M90 104h100"/><circle cx="182" cy="112" r="3"/>'
  };
  return '<svg viewBox="0 0 280 150" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'+(shapes[kind]||shapes.compute)+'</svg>';
}
function renderGear(product) {
  const photo = product.approvedPhoto;
  return '<article class="pc-product" data-gear-id="' + product.id + '" data-gear-status="' + product.status + '">' +
    '<div class="pc-product-plate">' + (photo ? '<img src="' + escapeHtml(photo.src) + '" alt="' + escapeHtml(photo.alt) + '" loading="lazy" decoding="async">' : glyph(product.kind)) + '</div>' +
    '<div class="pc-product-info"><span class="pc-product-status pc-product-status-' + product.status + '">' + statusText[product.status] + '</span>' +
    '<h3>' + escapeHtml(product.name) + '</h3><p class="pc-product-spec">' + escapeHtml(product.spec) + '</p><p>' + escapeHtml(product.use) + '</p>' +
    (product.quantity ? '<p class="pc-product-meta">' + escapeHtml(product.quantity) + (product.shared ? ' · Shared with The Stage' : '') + '</p>' : '') +
    '<div class="pc-product-links">' + external(product.url, product.linkLabel ?? 'Manufacturer', product.name) +
    (product.retailer ? external(product.retailer, product.category === "lab" ? "Marketplace" : "Retailer", product.name) : '') + '</div></div></article>';
}
function renderSetup() {
  const groups = CREATOR_CATEGORIES.map(category => {
    const items = CREATOR_GEAR.filter(product => product.category === category.id);
    const ordered = [...items.filter(product => product.status === "owned"), ...items.filter(product => product.status !== "owned")];
    return '<section class="pc-section pc-category" id="' + category.id + '" aria-labelledby="pc-cat-' + category.id + '">' +
      '<div class="pc-section-heading"><div><h2 id="pc-cat-' + category.id + '">' + category.label + '</h2><p>' + category.description + '</p></div></div>' +
      (items.length ? '<div class="pc-products">' + ordered.map(renderGear).join('') + '</div>' :
        '<div class="pc-control-empty"><strong>Inventory pending</strong><p>The editing computer, displays, software and storage will go here once I’ve checked what I already have.</p></div>') + '</section>';
  }).join('');
  return '<div class="pc-wrap"><header class="pc-setup-hero"><p class="pc-eyebrow">Studio build</p><h1>My Setup<span>.</span></h1>' +
    '<div class="pc-setup-intro"><p>What I’m looking at for recording conversations, editing, and eventually running AI and scientific workloads locally.</p>' +
    '<p>Ownership is still being inventoried. The catalog shows what I’m considering and what’s further out.</p></div></header>' +
    '<nav class="pc-jump" aria-label="Setup sections">' + CREATOR_CATEGORIES.map(category => link('#' + category.id, category.label)).join('') + '</nav>' + groups +
    '<section class="pc-section pc-two-column" id="build-log"><div><h2>Build notes</h2></div><div class="pc-prose">' +
    '<article><h3>Start with two voices</h3><p>For interviews, XLR to a multitrack recorder gives each person a separate track. For a solo session, one USB-C mic can go straight into a compatible device. The two workflows can share microphones and headphones.</p></article>' +
    '<article><h3>Test the room before adding cameras</h3><p>A single wide shot is simpler to record and edit. Extra angles mean more media, synchronization and editing time. The room and a two-person test will determine what makes sense.</p></article></div></section>' +
    '<section class="pc-section pc-two-column pc-ethics"><h2>Catalog status</h2><div class="pc-prose">' +
    '<dl><dt>Owned and verified</dt><dd>In my inventory and checked.</dd><dt>Selected but not purchased</dt><dd>Chosen for the build and still to be bought.</dd>' +
    '<dt>Considering</dt><dd>On the shortlist while I check fit.</dd><dt>Future</dt><dd>A longer-range idea.</dd></dl>' +
    '<p>Manufacturer and retailer links are ordinary references. I earn no commission from them.</p>' + button('/podcast/', 'Go to the podcast') + '</div></section></div>';
}
export function renderCreatorPage(path, publication = configuredPodcast) {
  const rss = publication.outlets.find(outlet => outlet.key === "rss");
  if (path === CREATOR_ROUTES.podcast) {
    return shell({path, title: PODCAST_TITLE + " — Podcast", description: PODCAST_DESCRIPTION, current: path, rss}, renderPodcast(publication));
  }
  if (path === CREATOR_ROUTES.setup) {
    return shell({path, title: "My Setup — " + PODCAST_TITLE, description: "Devon Alan Akins’s studio build journal. Gear for interviews, editing and future independent AI computing.", current: path}, renderSetup());
  }
  const episode = publication.episodes.find(entry => entry.route === path);
  if (!episode) throw new RangeError("Unknown creator path");
  return shell({path, title: episode.title + " — " + PODCAST_TITLE, description: episode.summary,
    current: CREATOR_ROUTES.podcast, image: episode.thumbnail, rss}, renderEpisode(episode));
}
