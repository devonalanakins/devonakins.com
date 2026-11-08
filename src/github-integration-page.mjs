/** Static owner page. Authenticated repository metadata is fetched after Access validation. */
export function renderGithubIntegrationOwner() {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer">
<title>Repository connections — Devon Alan Akins</title>
<link rel="stylesheet" href="/v2/listening-owner.css"><link rel="stylesheet" href="/v2/github-owner.css">
</head><body><a class="skip" href="#main">Skip to repositories</a>
<header class="topbar"><a class="wordmark" href="/">DEVON ALAN AKINS <span>/ PRIVATE CONTROL ROOM</span></a><a class="return" href="/owner/presence/">SHARING CONTROLS ↗</a></header>
<main class="container" id="main"><div class="eyebrow">GITHUB / PRIVATE REPOSITORY INVENTORY</div>
<h1>Connected work.<br><em>Chosen by you.</em></h1>
<p class="intro">One authorized GitHub App can discover selected repositories and report genuine workflow activity. Discovery stays private. Each public project and workflow source needs your approval before visitors can see it.</p>
<section class="card" aria-labelledby="connection-heading"><h2 id="connection-heading">Central connection</h2>
<p class="fine" id="github-readiness">Checking configuration…</p><p class="fine" id="github-status" role="status" aria-live="polite"></p>
<div class="actions"><button type="button" id="github-discover" disabled>Discover authorized repositories</button><button type="button" id="github-reload" class="secondary">Refresh connections</button></div>
<p class="fine">The App uses repository metadata and Actions read access. No source code, commit messages, logs or provider account details appear in the public signal. A workflow event is distinct from you editing; a quiet connection does not imply current work. Stop all broadcasting invalidates sources.</p>
</section>
<section class="card github-inventory" aria-labelledby="inventory-heading"><h2 id="inventory-heading">Repository inventory</h2>
<p class="fine">Recognized means the repository matches an existing project identity. Connected means its reporting source is valid. Sharing is a separate permission. Private repositories remain disconnected.</p>
<div id="github-repositories"></div></section>
</main><script src="/v2/github-owner.js" defer></script></body></html>`;
}
