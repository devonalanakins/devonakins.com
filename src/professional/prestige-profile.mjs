/**
 * Living Console — faithful translation of the approved portrait-free concept.
 * This is the spatial interface only. Public events, work presence, listening
 * and GPT captures continue to come from the existing independently validated
 * source components. No simulated counters, activity or project outcomes.
 */
const processStages = [
  ['01','Understand','Reality','Observe people, constraints, and what already works.'],
  ['02','Define','Excellence','Decide what useful and exceptional should mean.'],
  ['03','Choose','Solution','Select the smallest coherent working system.'],
  ['04','Set','Acceptance','Name the evidence required before implementation.'],
  ['05','Execute','& Verify','Build, inspect, test, and validate in real use.'],
  ['06','Preserve','& Improve','Record decisions and make the result teachable.'],
];
const quality = [
  ['product','01','PRODUCT','Useful','Someone can complete a real task.'],
  ['experience','02','EXPERIENCE','Intentional','Interaction and design meet the chosen vision.'],
  ['engineering','03','ENGINEERING','Verified','Real behavior, security and failure modes withstand testing.'],
  ['stewardship','04','STEWARDSHIP','Teachable','The result can be explained, operated and maintained.'],
];
const processButtons=processStages.map(([n,a,b,detail],i)=>
  '<button type="button" class="concept-process-step" data-process-step="'+i+'" aria-pressed="'+(i===0?'true':'false')+'" aria-label="Step '+n+': '+a+' '+b+'. '+detail+'">'+
  '<span class="concept-step-number">'+n+'</span><span class="concept-step-ornament" aria-hidden="true">'+(['◇','◎','⬡','✓','⌘','∞'][i])+'</span>'+
  '<strong>'+a+'<br>'+b+'</strong></button>'
).join('');
const qualityButtons=quality.map(([key,n,a,b,detail],i)=>
  '<button type="button" class="concept-quality-gate" data-concept-gate="'+key+'" aria-pressed="'+(i===0?'true':'false')+'" aria-label="'+a+': '+b+'. '+detail+'">'+
  '<span class="concept-quality-symbol" aria-hidden="true">'+(['⬡','✧','⌘','∞'][i])+'</span><span><strong>'+a+'</strong><small>'+b+'</small></span></button>'
).join('');
const studioWorkPresence='<span class="prestige-command-corner prestige-presence" data-public-work data-work-mode="idle" role="status"><i class="prestige-presence-dot" aria-hidden="true"></i><span data-work-state>CHECKING SOURCE</span><span class="prestige-presence-detail" data-work-title>No verified active session</span><span class="prestige-visually-hidden" data-work-detail>Source status pending</span></span>';
export function renderPrestigeHome({publicFeed,button,spotifyCard}) {
  return '<div class="one-home-layout prestige-home concept-console">'+
    '<section class="one-hero-copy prestige-player concept-intro" aria-label="Devon Akins professional profile">'+
      '<div class="prestige-player-top"><span class="prestige-player-id"><i aria-hidden="true"></i> THE LIVING STUDIO</span><span class="prestige-player-edition">INDEPENDENT · FLORIDA</span></div>'+
      '<div class="prestige-identity-main"><div class="prestige-emblem" aria-hidden="true"><span>D<span>A</span></span><b>INDEPENDENT / 001</b></div>'+
        '<div class="prestige-identity-copy"><p class="prestige-eyebrow">ENGINEERING / DESIGN / OPERATIONS / CREATIVE</p>'+
          '<h1>I DESIGN,<br>BUILD &amp; RUN<br>DIGITAL<br>SYSTEMS.</h1>'+
          '<p class="prestige-subtitle">SOFTWARE DEVELOPER <span aria-hidden="true">//</span> SYSTEMS DESIGNER</p></div></div>'+
      '<p class="one-lede prestige-statement">Independent software developer, product builder &amp; operations lead.</p>'+
      '<div class="prestige-player-actions">'+button('work','Explore my work',true)+button('contact','Get in touch')+'</div>'+
      '<div class="prestige-build" aria-label="My areas of practice">'+
        '<div class="prestige-build-row"><span class="prestige-build-index">01</span><div><strong>SOFTWARE & PRODUCTS</strong><small>End-to-end products, tools & platforms.</small></div><span class="prestige-build-end">BUILD</span></div>'+
        '<div class="prestige-build-row"><span class="prestige-build-index">02</span><div><strong>SYSTEM DESIGN</strong><small>Scalable, reliable & maintainable systems.</small></div><span class="prestige-build-end">OPERATE</span></div>'+
        '<div class="prestige-build-row"><span class="prestige-build-index">03</span><div><strong>OPERATIONS & INTEGRATION</strong><small>Technology, workflows & business operations.</small></div><span class="prestige-build-end">CREATE</span></div>'+
       '<button type="button" data-one-go="contact" class="studio-rail-contact">LET’S WORK TOGETHER <span aria-hidden="true">→</span></button>'+
      '</div>'+
    '</section>'+
    '<div class="concept-visual">'+
       '<a href="/work/devonstation/" class="studio-project-card studio-project-card--knowledge" aria-label="Knowledge, in development, explore project"><span class="studio-project-card__icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"><path d="m16 3 12 7-12 7L4 10 16 3Z"/><path d="m4 16 12 7 12-7"/><path d="m4 22 12 7 12-7"/></svg></span><span class="studio-project-card__body"><strong>KNOWLEDGE</strong><small>A private-first knowledge &amp; files workspace.</small></span><span class="studio-project-card__status">IN DEVELOPMENT</span></a>'+
       '<a href="/work/devonstation/" class="studio-project-card studio-project-card--station" aria-label="DevonStation, in development, explore project"><span class="studio-project-card__icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"><path d="M5 25V7h10c9 0 12 6 8 12-3 5-8 6-18 6Z"/><path d="m7 23 14-14"/></svg></span><span class="studio-project-card__body"><strong>DEVONSTATION</strong><small>An integrated environment for systems &amp; work.</small></span><span class="studio-project-card__status">IN DEVELOPMENT</span></a></div>'+
    '<aside class="one-signals prestige-command concept-live" aria-label="Source-qualified public work activity">'+
      '<div class="prestige-command-top"><div><span class="prestige-command-eyebrow">LIVE STUDIO / PUBLIC SIGNALS</span><strong>STUDIO SIGNAL</strong><span class="studio-signal-caption">A REAL-TIME LOOK AT WHAT I’M BUILDING &amp; CREATING.</span></div>'+
      '<span class="studio-signal-label">PUBLIC SOURCE</span></div>'+
      '<section class="one-github one-panel prestige-activity-card"><header class="one-panel-head"><span class="prestige-feed-mark" aria-hidden="true">GH</span><span><strong>PUBLIC GITHUB / RECENT EVENTS</strong><small>Independently timestamped history</small></span><button type="button" data-one-go="activity" aria-label="Open full GitHub event log">View all ↗</button></header>'+
      '<div class="concept-feed-filters" role="group" aria-label="Filter recent GitHub events"><button type="button" data-github-filter="all" aria-pressed="true">All</button><button type="button" data-github-filter="push" aria-pressed="false">Pushes</button><button type="button" data-github-filter="pull_request" aria-pressed="false">PRs</button></div>'+
      publicFeed('one-home-github',4)+'<div class="concept-feed-empty"><span aria-hidden="true">⌁</span><p>Public development events appear here when GitHub responds.</p><a href="https://github.com/devonalanakins" target="_blank" rel="noopener noreferrer">Inspect public GitHub ↗</a></div></section>'+
      '<section class="studio-development" aria-label="Development presence"><div class="studio-development__head">DEVELOPMENT PRESENCE</div>'+studioWorkPresence+'</section>'+ 
       '<div class="one-spotify studio-spotify">'+spotifyCard()+'</div>'+ 
       '<div class="concept-live-foot"><span>PROVENANCE FIRST</span><button type="button" data-github-refresh aria-label="Refresh GitHub events now">↻ Refresh</button></div>'+
    '</aside>'+
    '<section class="concept-signal-band" aria-label="Publicly sourced signals">'+
      '<div class="concept-signal-metric concept-github-stat"><span class="concept-signal-label">GITHUB · RECENT PUBLIC EVENTS</span><div><strong data-github-count="push" aria-label="Pushes unavailable">—</strong><small>Push activity</small><svg class="concept-event-spark" data-github-spark viewBox="0 0 112 32" role="img" aria-label="Waiting for public GitHub event data" focusable="false"></svg></div><span class="concept-signal-provenance">Event-count window, not lifetime totals</span></div>'+
      '<div class="one-signal-bottom prestige-stat-pair"><div class="one-gpt"><!--ONE_SCREEN_GPT_SLOT--></div></div>'+
      '<button type="button" data-one-go="activity" class="concept-signal-metric concept-source-tile"><span class="concept-signal-label">WORK / SOURCE STATUS</span><strong>Observe the record <span aria-hidden="true">↗</span></strong><small>GitHub history · authenticated presence · separate from music</small></button>'+
    '</section>'+
    '<section class="concept-process concept-glass" aria-label="Six-stage working process"><div class="concept-card-heading"><div><small>01 / MY METHOD</small><h2>How work becomes <em>finished.</em></h2></div><button type="button" data-one-go="experience" aria-label="Explore the complete working method">Explore ↗</button></div>'+
      '<div class="concept-process-steps" role="group" aria-label="Explore the six stages">'+processButtons+'</div>'+
      '<p class="concept-process-detail" data-process-detail aria-live="polite">'+processStages[0][3]+'</p></section>'+
    '<section class="concept-quality concept-glass" aria-label="Four independent quality standards"><div class="concept-card-heading"><div><small>02 / DEFINITION OF DONE</small><h2>My quality <em>standard.</em></h2></div></div>'+
      '<div class="concept-quality-grid" role="group" aria-label="Explore the quality standard">'+qualityButtons+'</div>'+
      '<p class="concept-gate-detail" data-concept-gate-detail aria-live="polite">'+quality[0][4]+'</p></section>'+
    '<section class="concept-featured concept-glass" aria-label="Selected work"><div class="concept-card-heading"><div><small>03 / THE PORTFOLIO</small><h2>Real systems. <em>Real work.</em></h2></div><button type="button" data-one-go="work" aria-label="View all selected work">Explore ↗</button></div><div class="concept-project-links">'+
      '<a class="concept-project-link concept-project-link-ops" href="/work/operations/"><span>OPERATIONS</span><strong>Professional systems</strong><small>Nonclinical workflows · service experience</small></a>'+
      '<a class="concept-project-link concept-project-link-devon" href="/work/devonstation/"><span>PLATFORM</span><strong>DevonStation & Knowledge</strong><small>Independent, owner-controlled infrastructure</small></a>'+
      '<a class="concept-project-link concept-project-link-site" href="/work/"><span>ENGINEERING</span><strong>DevonAkins.com</strong><small>Public portfolio · source-qualified work</small></a>'+
    '</div></section>'+
    '<section class="concept-focus concept-glass" aria-label="Current professional focus"><div class="concept-card-heading"><div><small>04 / CURRENT FOCUS</small><h2>Building for <em>use.</em></h2></div></div><div class="concept-focus-list">'+
      '<a href="/work/operations/"><b>01</b><span>Professional operations</span><small>Workflow & service reliability</small></a>'+
      '<a href="/work/devonstation/"><b>02</b><span>DevonStation / Knowledge</span><small>Owner-controlled systems</small></a>'+
      '<a href="/writing/"><b>03</b><span>Writing & research</span><small>Original long-form work</small></a>'+
    '</div></section>'+
    '<section class="concept-activity-ribbon concept-glass" aria-label="Live sourced highlights"><div class="concept-ribbon-label"><i aria-hidden="true"></i><strong>RECENT PUBLIC WORK</strong><span>GitHub · latest observed events</span></div><ol data-github-highlights aria-live="polite"><li>Checking the public source…</li></ol><button type="button" data-one-go="activity" aria-label="Explore all public activity">All activity ↗</button></section>'+
  '</div>';
}
