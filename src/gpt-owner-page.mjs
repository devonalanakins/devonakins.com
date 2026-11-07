/** Access-only owner recording screen. Never embeds source observations in HTML. */
export function renderGptOwner(metrics) {
  const groups = [
    ['Personal ChatGPT profile', 'Record the numbers shown on your own profile.', 'owner-profile'],
    ['Work / Codex', 'Credits are separate from tokens and subscription entitlements.', 'work-codex'],
    ['My Business usage', 'Use only your individual member row, not your organization’s totals.', 'business-member'],
  ];
  const fields = groups.map(([title,help,scope],index)=>`<fieldset class="card gpt-group">
    <legend><span class="eyebrow">0${index+1}</span> ${title}</legend><p class="fine">${help}</p>
    <div class="gpt-input-grid">${Object.entries(metrics).filter(([,spec])=>spec.scope===scope).map(([metric,spec])=>`
      <div class="gpt-measurement"><label class="gpt-field" for="gpt-${metric}">${spec.label}</label>
        <input id="gpt-${metric}" data-metric="${metric}" type="number" inputmode="${spec.integer?'numeric':'decimal'}"
          min="0" max="${spec.max}" step="${spec.integer?'1':'any'}" placeholder="Leave blank to keep" aria-describedby="gpt-last-${metric}">
        <p class="gpt-previous fine" id="gpt-last-${metric}">Checking previous reading…</p>
      </div>`).join('')}</div></fieldset>`).join('');
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer">
<title>GPT Analytics — Devon Alan Akins</title>
<link rel="stylesheet" href="/v2/listening-owner.css">
<link rel="stylesheet" href="/v2/gpt-owner.css"></head><body>
<a class="skip" href="#main">Skip to metrics</a>
<header class="topbar"><a class="wordmark" href="/">DEVON ALAN AKINS <span>/ PRIVATE CONTROL ROOM</span></a>
<a class="return" href="/owner/presence/">LIVE SIGNAL CONTROLS ↗</a></header>
<main class="container" id="main">
  <div class="eyebrow">GPT OBSERVATORY / PRIVATE CAPTURE</div>
  <h1>Recorded usage.<br><em>No invented signal.</em></h1>
  <p class="intro">Record your profile, Work/Codex, and individual Business measurements together. The website checks for approved new readings every five minutes, but cannot force OpenAI to issue new measurements. No passwords, screenshots or conversations are collected.</p>
  <form id="gpt-record-form" aria-describedby="gpt-batch-help">
    <p class="fine" id="gpt-batch-help">Enter any measurements you checked. Blank fields keep their previous values and capture times. One save records the entire batch; sharing permissions stay as you set them.</p>
    <div class="gpt-groups">${fields}</div>
    <div class="gpt-save-bar"><div><strong id="gpt-draft-summary">No new readings entered</strong><p class="fine">Capture time is recorded when you save.</p></div>
      <div class="actions"><button id="gpt-save" type="submit" disabled>Save readings</button><button id="gpt-reload" type="button" class="secondary">Refresh records</button></div></div>
    <p id="gpt-form-status" class="fine" role="status" aria-live="polite">Loading current revision…</p>
  </form>
  <section class="card gpt-privacy-card" aria-labelledby="gpt-privacy-heading">
    <h2 id="gpt-privacy-heading">You control what is public.</h2>
    <p class="fine">New metrics stay private until you share each one below. Sharing a metric also permits its future recorded updates while Live Signal broadcasting is enabled. Stop all broadcasting hides every metric.</p>
    <p class="fine">Readings are recent for 24 hours, then historical. The homepage always features seven-day tokens when shared. The November 4 archive stays separate.</p>
    <a class="return" href="/gpt/">VIEW PUBLIC GPT PROFILE ↗</a>
  </section>
  <section class="card gpt-record-card" aria-labelledby="gpt-record-heading">
    <h2 id="gpt-record-heading">Latest private readings</h2>
    <p class="fine" id="gpt-owner-status" role="status" aria-live="polite">Checking the private source…</p>
    <div id="gpt-owner-records" class="gpt-record-list"></div>
  </section>
  <p class="fine">Owner access is verified through Cloudflare Access. Missing sources remain disconnected, not zero.</p>
</main>
<script src="/v2/gpt-owner.js" defer></script></body></html>`;
}
