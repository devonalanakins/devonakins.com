import {validatePublicGptSnapshot} from "../gpt-profile.mjs";

// Rendering is deliberately static: this is an owner-supplied recording, not an API connection.
const shape = (value, fields) => value && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).sort().join("|") === [...fields].sort().join("|");
const integer = value => Number.isSafeInteger(value) && value >= 0;
const escapeHtml = value => String(value).replace(/[&<>"']/g, c =>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const full = value => new Intl.NumberFormat("en-US").format(value);
const short = value => new Intl.NumberFormat("en-US", {
  notation:"compact",maximumFractionDigits:1,
}).format(value);
const dayLabel = value => new Date(value + "T12:00:00Z").toLocaleDateString("en-US", {
  timeZone:"UTC",month:"long",day:"numeric",year:"numeric",
});
const timeLabel = value => new Date(value).toLocaleString("en-US", {
  timeZone:"America/New_York",month:"short",day:"numeric",hour:"numeric",
  minute:"2-digit",timeZoneName:"short",
});
const sourceTimeLabel = value => new Date(value).toLocaleString("en-US", {
  timeZone:"UTC",month:"short",day:"numeric",year:"numeric",hour:"numeric",
  minute:"2-digit",timeZoneName:"short",
});

export function validateDatedGptCapture(value) {
  if (!shape(value, ["version","capturedAt","captureDate","source","attestation","profile","usage7d"]) ||
      value.version !== 1 || value.attestation !== "owner-recorded" ||
      value.source !== "Owner-provided ChatGPT public profile and Usage Analytics recording" ||
      typeof value.capturedAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value.capturedAt) ||
      !Number.isFinite(Date.parse(value.capturedAt)) ||
      typeof value.captureDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.captureDate)) {
    throw new Error("Invalid owner-recorded GPT capture");
  }
  const instant = Date.parse(value.capturedAt);
  const local = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit",
  }).formatToParts(new Date(instant)).map(part=>[part.type,part.value]));
  const localDate = [local.year,local.month,local.day].join("-");
  if (value.captureDate !== localDate || instant > Date.now()+60000)
    throw new Error("Invalid capture chronology");

  const p = value.profile;
  if (!shape(p, ["lifetimeTokensApprox","peakTokensApprox","longestTaskHours",
    "longestStreakDays","currentStreakDays","skillsExplored","totalSkillUses",
    "fastModePercent","mostUsedReasoning","mostUsedReasoningPercent"]) ||
    ![p.lifetimeTokensApprox,p.peakTokensApprox,p.longestTaskHours,
      p.longestStreakDays,p.currentStreakDays,p.skillsExplored,p.totalSkillUses,
      p.fastModePercent,p.mostUsedReasoningPercent].every(integer) ||
    p.fastModePercent > 100 || p.mostUsedReasoningPercent > 100 ||
    typeof p.mostUsedReasoning !== "string" ||
    !/^[A-Za-z][A-Za-z0-9 -]{0,39}$/.test(p.mostUsedReasoning))
    throw new Error("Invalid cumulative profile metrics");

  const w=value.usage7d;
  if (!shape(w, ["selection","tokens","messages","pluginCalls","skillUses",
    "tokensUpdatedAt","toolsUpdatedAt"]) ||
    w.selection !== "7d" ||
    ![w.tokens,w.messages,w.pluginCalls,w.skillUses].every(integer) ||
    ![w.tokensUpdatedAt,w.toolsUpdatedAt].every(t => typeof t === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(t) &&
      Number.isFinite(Date.parse(t)) && Date.parse(t) <= instant))
    throw new Error("Invalid seven-day usage metrics");
  return value;
}

const fact = (label, value) =>
  '<div><strong>' + escapeHtml(value) + '</strong><small>' + escapeHtml(label) + '</small></div>';
const usageCard = (label, value, units) =>
  '<article class="p-card p-gpt-record-card"><p class="p-card-over">' + escapeHtml(label) +
  '</p><strong class="p-gpt-record-number">' + full(value) + '</strong>' +
  '<p>Seven-day ' + escapeHtml(units) + ', as displayed in Usage Analytics.</p></article>';

export function renderDatedGptCapture(capture, oldSnapshot, priorCaptures=[]) {
  const c=validateDatedGptCapture(capture);
  const old=validatePublicGptSnapshot(oldSnapshot);
  const p=c.profile, w=c.usage7d, date=dayLabel(c.captureDate);
  return '<section class="p-section p-gpt-recorded" aria-labelledby="p-gpt-record-heading">' +
    '<div class="p-section-heading"><div><p class="p-eyebrow">OWNER-RECORDED / ' +
    escapeHtml(c.captureDate) + '</p><h2 id="p-gpt-record-heading">Latest dated snapshot.</h2></div>' +
    '<p>Captured ' + escapeHtml(timeLabel(c.capturedAt)) +
    ' from the public profile and the selected seven-day Usage Analytics view. Not live account telemetry.</p></div>' +
    '<div class="p-aside-panel p-gpt-record-hero"><p class="p-card-over">PERSONAL PROFILE / APPROXIMATE LIFETIME TOKENS</p>' +
    '<strong class="p-gpt-lifetime">≈' + short(p.lifetimeTokensApprox) + '</strong>' +
    '<p>Displayed by the public ChatGPT profile at capture time. This cumulative profile figure is not the seven-day token total or API billing.</p>' +
    '<div class="p-gpt-facts">' +
    fact("Peak tokens (approx.)","≈"+short(p.peakTokensApprox)) +
    fact("Longest task",p.longestTaskHours+"h") +
    fact("Longest streak",p.longestStreakDays+" days") +
    fact("Current streak at capture",p.currentStreakDays+" days") +
    fact("Lifetime skill uses",full(p.totalSkillUses)) +
    fact("Skills explored",full(p.skillsExplored)) +
    fact("Fast mode",p.fastModePercent+"%") +
    fact("Most-used reasoning",p.mostUsedReasoning+" · "+p.mostUsedReasoningPercent+"%") + '</div></div>' +
    '<div class="p-gpt-weekly-head"><p class="p-eyebrow">USAGE / LAST SEVEN DAYS</p>' +
    '<h3>Seven-day activity, separate from lifetime.</h3>' +
    '<p>Seven-day tab selected in the recording on ' + escapeHtml(date) +
    '. Exact totals shown; no daily series has been inferred.</p></div>' +
    '<div class="p-card-grid p-gpt-weekly-grid">' +
    usageCard("Tokens",w.tokens,"tokens") +
    usageCard("Messages",w.messages,"messages") +
    usageCard("Plugin calls",w.pluginCalls,"plugin calls") +
    usageCard("Skill uses",w.skillUses,"skill uses") + '</div>' +
    '<p class="p-gpt-source-note">Source panels refresh independently. Token panel last updated ' +
    escapeHtml(sourceTimeLabel(w.tokensUpdatedAt)) + '; plugin and skill panel last updated ' +
    escapeHtml(sourceTimeLabel(w.toolsUpdatedAt)) +
    '. Values were observed in the owner recording, not retrieved from an OpenAI account API. ' +
    '<a class="p-text-link" href="/gpt/snapshots/' + escapeHtml(c.captureDate) +
    '.json">Review this dated source</a></p></section>' +
    '<section class="p-section p-gpt-history" aria-labelledby="p-gpt-history-heading">' +
    '<div class="p-section-heading"><div><p class="p-eyebrow">HISTORICAL RECORD / PRESERVED</p>' +
    '<h2 id="p-gpt-history-heading">Earlier dated capture.</h2></div>' +
    '<p>Previous observations remain unchanged and separately attributed. Differently scoped captures should not be treated as a precise growth series.</p></div>' +
    '<div class="p-aside-panel p-gpt-history-card"><time datetime="' +
    escapeHtml(old.asOf) + '">' + escapeHtml(dayLabel(old.asOf)) + '</time>' +
    '<strong>≈' + short(old.count) + ' recorded cumulative Work/Codex tokens</strong>' +
    '<p>Original seven-day period ' + escapeHtml(old.profile.weeklyActivity.startDate) +
    ' to ' + escapeHtml(old.profile.weeklyActivity.endDate) + ': ' +
    full(old.profile.weeklyActivity.tokens) + ' tokens, ' +
    full(old.profile.weeklyActivity.messages) + ' messages, ' +
    full(old.profile.weeklyActivity.pluginCalls) + ' plugin calls, ' +
    full(old.profile.weeklyActivity.skillUses) + ' skill uses.</p>' +
    '<a class="p-text-link" href="/v2/usage-snapshot.json">View preserved November 4 source</a></div>' +
    (priorCaptures.length ? '<div class="p-gpt-prior-records">' + priorCaptures.map(previous=>{
      const older=validateDatedGptCapture(previous);
      if (older.capturedAt>=c.capturedAt) throw new Error("Dated capture history is not chronological");
      return '<div class="p-aside-panel p-gpt-history-card"><time datetime="' +
        escapeHtml(older.captureDate) + '">' + escapeHtml(dayLabel(older.captureDate)) +
        '</time><strong>≈' + short(older.profile.lifetimeTokensApprox) +
        ' profile lifetime tokens</strong><p>' + full(older.usage7d.tokens) +
        ' seven-day tokens, ' + full(older.usage7d.messages) + ' messages, ' +
        full(older.usage7d.pluginCalls) + ' plugin calls, ' +
        full(older.usage7d.skillUses) + ' skill uses.</p>' +
        '<a class="p-text-link" href="/gpt/snapshots/' +
        escapeHtml(older.captureDate) + '.json">View dated source</a></div>';
      }).join("") + '</div>' : '') + '</section>';
}

/** A compact, source-dated preview for the one-viewport professional homepage. */
export function renderOneScreenGptSummary(input) {
  const c=validateDatedGptCapture(input);
  const p=c.profile,w=c.usage7d;
  const day=new Date(c.captureDate+"T12:00:00Z").toLocaleDateString("en-US",{
    timeZone:"UTC",month:"short",day:"numeric",year:"numeric",
  });
  return '<a href="/gpt/" class="one-gpt-record" aria-label="Open recorded GPT usage for '+escapeHtml(day)+'">'+
    '<div class="one-gpt-record-over"><strong>GPT / RECORDED USAGE</strong>'+
    '<time datetime="'+escapeHtml(c.captureDate)+'">'+escapeHtml(day)+'</time></div>'+
    '<div class="one-gpt-record-values"><div><strong>≈'+short(p.lifetimeTokensApprox)+
    '</strong><small>PROFILE LIFETIME</small></div>'+
    '<div><strong title="'+full(w.tokens)+' tokens">'+short(w.tokens)+
    '</strong><small>LAST 7 DAYS</small></div></div>'+
    '<div class="one-gpt-record-mini"><span>'+full(w.messages)+' MESSAGES</span>'+
    '<span>'+full(w.pluginCalls)+' PLUGINS</span>'+
    '<span>'+full(w.skillUses)+' SKILLS</span></div>'+
    '<p class="one-gpt-record-foot">Owner recording · dated, not live</p></a>';
}
