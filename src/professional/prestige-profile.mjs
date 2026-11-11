/**
 * Prestige Profile — public identity surface, not a gamified performance claim.
 * All live/delayed telemetry is rendered by the pre-existing source-qualified
 * GitHub, Spotify and owner-dated GPT components. Class/focus labels are editorial.
 */
export function renderPrestigeHome({publicFeed,button,spotifyCard}) {
  return '<div class="one-home-layout prestige-home">'+
    '<section class="one-hero-copy prestige-player" aria-label="Devon Akins professional profile">'+
      '<div class="prestige-player-top">'+
        '<span class="prestige-player-id"><i aria-hidden="true"></i> DA / PROFESSIONAL PROFILE</span>'+
        '<span class="prestige-player-edition">DESIGNATION / INDEPENDENT</span>'+
      '</div>'+
      '<div class="prestige-identity-main">'+
        '<div class="prestige-emblem" aria-hidden="true"><span>D<span>A</span></span><b>INDEPENDENT / 001</b></div>'+
        '<div class="prestige-identity-copy">'+
          '<p class="prestige-eyebrow">OWNER-OPERATED · FLORIDA / REMOTE</p>'+
          '<h1>Devon <em>Akins.</em></h1>'+
          '<p class="prestige-subtitle">OPERATIONS ARCHITECT <span aria-hidden="true">//</span> SOFTWARE ENGINEER</p>'+
        '</div>'+
      '</div>'+
      '<p class="one-lede prestige-statement">I run nonclinical business operations and build the systems behind more reliable work.</p>'+
      '<div class="prestige-divider" aria-hidden="true"><span></span><b>PROFESSIONAL BUILD</b><span></span></div>'+
      '<div class="prestige-build" aria-label="Professional areas of work">'+
        '<div class="prestige-build-row"><span class="prestige-build-index">01</span><div><strong>OPERATIONS</strong><small>Workflow reliability · administration</small></div><span class="prestige-build-end">PRIMARY</span></div>'+
        '<div class="prestige-build-row"><span class="prestige-build-index">02</span><div><strong>ENGINEERING</strong><small>Software · infrastructure · delivery</small></div><span class="prestige-build-end">BUILDER</span></div>'+
        '<div class="prestige-build-row"><span class="prestige-build-index">03</span><div><strong>AUTHORSHIP</strong><small>Original writing · research</small></div><span class="prestige-build-end">CREATOR</span></div>'+
      '</div>'+
      '<div class="prestige-player-actions">'+button('work','View missions',true)+button('experience','Career build')+'</div>'+
      '<div class="prestige-player-bottom">'+
        '<span><b>CURRENT FOCUS</b><small>Professional operations & systems</small></span>'+
        '<span class="prestige-source-promise">REAL WORK <i aria-hidden="true">/</i> PUBLIC EVIDENCE</span>'+
      '</div>'+
    '</section>'+
    '<aside class="one-signals prestige-command" aria-label="Source-qualified public statistics and activity">'+
      '<div class="prestige-command-top"><div><span class="prestige-command-eyebrow">LIVE OBSERVATORY / <b>PUBLIC RECORD</b></span><strong>THE SIGNAL BOARD</strong></div><span class="prestige-command-corner">VERIFIED WHEN AVAILABLE <i aria-hidden="true"></i></span></div>'+
      '<section class="one-github one-panel prestige-activity-card"><header class="one-panel-head">'+
        '<span class="prestige-feed-mark" aria-hidden="true">GH</span>'+
        '<span><strong>GITHUB / ACTIVITY LOG</strong><small>Source-qualified public events</small></span>'+
        '<button type="button" data-one-go="activity" aria-label="Open the full public activity panel">Full log ↗</button></header>'+
        publicFeed('one-home-github',4)+'</section>'+
      '<div class="one-signal-bottom prestige-stat-pair">'+
        '<div class="one-spotify">'+spotifyCard()+'</div>'+
        '<div class="one-gpt"><!--ONE_SCREEN_GPT_SLOT--></div>'+
      '</div>'+
      '<div class="prestige-command-foot"><span>PUBLIC SIGNALS ONLY</span><span aria-hidden="true">///</span><span>HISTORY ≠ LIVE PRESENCE</span></div>'+
    '</aside>'+
  '</div>';
}