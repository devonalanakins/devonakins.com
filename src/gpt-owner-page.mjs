/** Access-only owner recording screen. Never embeds source observations in HTML. */
export function renderGptOwner() {
  return \`<!doctype html><html lang="en"><head>
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
  <p class="intro">Save an actual number visible in your own ChatGPT profile, Work/Codex usage screen, or your individual Business analytics row. The website checks for approved new readings every five minutes, but cannot force OpenAI to issue new measurements. No passwords, screenshots or conversations are collected.</p>
  <div class="grid">
    <section class="card" aria-labelledby="capture-heading">
      <h2 id="capture-heading">Add an observation</h2>
      <form id="gpt-record-form">
        <label class="gpt-field" for="gpt-metric">What did you measure?</label>
        <select id="gpt-metric" required>
          <option value="profile_7d_tokens">7-day tokens · owner profile</option>
          <option value="profile_lifetime_tokens_approx">Approximate lifetime tokens · owner profile</option>
          <option value="profile_7d_messages">7-day messages · owner profile</option>
          <option value="profile_streak_days">Streak days · owner profile</option>
          <option value="work_codex_credits_remaining">Work/Codex credits remaining</option>
          <option value="work_codex_credits_used">Work/Codex credits used</option>
          <option value="business_7d_messages">My Business member-row 7-day messages</option>
          <option value="business_7d_credits_used">My Business member-row 7-day credits</option>
        </select>
        <label class="gpt-field" for="gpt-value">Number shown in the source</label>
        <input id="gpt-value" type="number" inputmode="decimal" min="0" max="1000000000000" step="any" required placeholder="Enter the actual number">
        <p class="fine" id="gpt-source-help">Choose the metric exactly as labeled in the source. We record the capture time, not an OpenAI refresh time.</p>
        <div class="actions"><button id="gpt-save" type="submit">Save private reading</button><button id="gpt-reload" type="button" class="secondary">Refresh records</button></div>
      </form>
    </section>
    <section class="card" aria-labelledby="gpt-privacy-heading">
      <h2 id="gpt-privacy-heading">Privacy &amp; freshness</h2>
      <p class="fine">Every new metric is private by default. Publishing one requires an independent server release gate, your metric-specific permission, and the main Live Signal broadcasting permission. Stop all broadcasting hides every metric.</p>
      <p class="fine">An observation is <strong>recent for 24 hours</strong>, then explicitly historical. A page refresh does not change its recorded time. The archived 2026 profile is preserved separately and never treated as the current total.</p>
      <p class="fine">Only small numeric values and their capture timestamps are stored in the existing private database. No account IDs, conversations, client information, or usage exports are stored.</p>
      <a class="return" href="/gpt/">VIEW PUBLIC GPT PROFILE ↗</a>
    </section>
  </div>
  <section class="card gpt-record-card" aria-labelledby="gpt-record-heading">
    <h2 id="gpt-record-heading">Latest private readings</h2>
    <p class="fine" id="gpt-owner-status" role="status" aria-live="polite">Checking the private source…</p>
    <div id="gpt-owner-records" class="gpt-record-list"></div>
  </section>
  <p class="fine">Owner access is verified through Cloudflare Access. Missing sources remain disconnected, not zero.</p>
</main>
<script src="/v2/gpt-owner.js" defer></script></body></html>\`;
}
