/**
 * The Computational Laboratory — a source-honest, opt-in personal site candidate.
 * Deliberately separate from the production V4 and approved one-screen builds.
 * Mathematical figures are analytic, not measured experiments or live telemetry.
 */
import {spotifyCard} from './signal-cards.mjs';
import {renderHomeSocialHub, renderHomeThreadsSignal, renderThreadsPreview} from './social-presence.mjs';

const escapeHtml=value=>String(value ?? '').replace(/[&<>"']/g,
  c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=Object.freeze([
  ['home','Home'],['experience','Research'],['systems','Systems'],['work','Projects'],['portfolio','Portfolio'],
  ['activity','Activity'],['writing','Fieldnotes'],['contact','Contact'],
]);
/** Actual analytic Lissajous curve: x=sin(a*t), y=sin(b*t+phase).
 * Validated integer frequencies; no random data, inferred experiment or API.
 */
export function lissajousPath(a=3,b=4,phase=Math.PI/2) {
  if(!Number.isInteger(a)||a<1||a>6||!Number.isInteger(b)||b<1||b>6||
    !Number.isFinite(phase))throw new RangeError('Invalid Lissajous parameters');
  const points=Array.from({length:301},(_,i)=>{
    const t=i/300*Math.PI*2;
    return (i?'L':'M')+(320+166*Math.sin(a*t)).toFixed(2)+' '+
      (230-145*Math.sin(b*t+phase)).toFixed(2);
  });
  return points.join(' ');
}
function nav(kind){
  return '<nav class="one-tabs lab-tabs lab-tabs-'+kind+'" aria-label="'+
    (kind==='desktop'?'Laboratory navigation':'Mobile laboratory navigation')+'">'+
    '<div class="one-tablist" role="tablist" aria-label="Laboratory sections">'+
    sections.map(([key,label])=>'<button type="button" role="tab" id="one-'+kind+'-'+key+
      '" aria-controls="one-panel-'+key+'" aria-selected="'+(key==='home'?'true':'false')+
      '" tabindex="'+(key==='home'?'0':'-1')+'" data-one-target="'+key+'">'+
      '<span class="one-tab-label">'+escapeHtml(label)+'</span></button>').join('')+
    '</div></nav>';
}
function view(key,content){
  return '<section class="one-view lab-view lab-view-'+key+'" id="one-panel-'+key+
    '" data-one-view="'+key+'" aria-labelledby="one-desktop-'+key+
    '" role="tabpanel" tabindex="-1"'+(key==='home'?'':' hidden')+'>'+content+'</section>';
}
function goto(key,label,primary=false){
  return '<button type="button" class="lab-action'+(primary?' lab-action-primary':'')+
    '" data-one-go="'+key+'">'+escapeHtml(label)+' <span aria-hidden="true">↗</span></button>';
}
function feed(id,limit){
  return '<div class="one-feed lab-feed" id="'+id+'" data-public-github-feed data-limit="'+
    limit+'"><p role="status" aria-live="polite" data-feed-status>'+
    'Checking dated public GitHub events…</p><ol data-feed-list></ol>'+
    '<p class="one-feed-disclosure">Public events only · historical timestamps, not proof of working now.</p></div>';
}
function workPresence(){
  return '<div class="lab-source-status" role="status" data-public-work data-work-mode="idle">'+
    '<span class="lab-source-dot" aria-hidden="true"></span><div><small>DEVELOPMENT PRESENCE</small>'+
    '<strong data-work-state>CHECKING SOURCE</strong><span data-work-title>No verified active session</span>'+
    '<span class="lab-visually-hidden" data-work-detail>Source status pending</span></div></div>';
}
function instrument(id,interactive=false){
  const ticks=Array.from({length:9},(_,i)=>{
    const v=76+i*61;
    return '<path d="M'+v+' 50V410 M88 '+(56+i*43)+'H550" stroke="#83aba5" stroke-opacity=".10" fill="none"/>';
  }).join('');
  return '<div class="lab-instrument" aria-label="Mathematical visualization">'+
    '<div class="lab-instrument-top"><span>FIG. 01 / PARAMETRIC DYNAMICS</span>'+
    '<span>ANALYTIC MODEL</span></div>'+
    '<svg viewBox="0 0 640 460" xmlns="http://www.w3.org/2000/svg" role="img" '+
    'aria-labelledby="'+id+'-title '+id+'-desc" class="lab-instrument-svg">'+
    '<title id="'+id+'-title">Lissajous trajectory</title>'+
    '<desc id="'+id+'-desc">Exact parametric illustration with x equal to sine of a times t '+
    'and y equal to sine of b times t plus a phase shift. Not experimental data.</desc>'+
    '<defs><radialGradient id="'+id+'-halo"><stop stop-color="#6ab9ad" stop-opacity=".28"/>'+
    '<stop offset="1" stop-color="#6ab9ad" stop-opacity="0"/></radialGradient>'+
    '<linearGradient id="'+id+'-line" x1="0" y1="0" x2="1" y2="1">'+
    '<stop stop-color="#b8ede0"/><stop offset=".55" stop-color="#70b8b7"/>'+
    '<stop offset="1" stop-color="#d0a578"/></linearGradient></defs>'+
    '<ellipse cx="320" cy="230" rx="227" ry="218" fill="url(#'+id+'-halo)"/>'+
    '<g>'+ticks+'</g><circle cx="320" cy="230" r="171" stroke="#80b8b4" stroke-opacity=".27" fill="none"/>'+
    '<circle cx="320" cy="230" r="199" stroke="#d0a578" stroke-opacity=".17" stroke-dasharray="2 9" fill="none"/>'+
    '<path d="M320 23V438 M74 230H566" stroke="#a8c9c5" stroke-opacity=".38" fill="none"/>'+
    '<path data-lab-curve="'+(interactive?'interactive':'static')+'" d="'+lissajousPath()+
    '" fill="none" stroke="url(#'+id+'-line)" stroke-width="2.15" stroke-linejoin="round" stroke-linecap="round"/>'+
    '<circle cx="320" cy="230" r="3.4" fill="#e5e9db"/>'+
    '<path d="M308 230H332 M320 218V242" stroke="#e5e9db" stroke-width=".8"/>'+
    '<text x="100" y="35" fill="#b4d5d0" font-size="11" font-family="monospace">x = sin(a·t)</text>'+
    '<text x="422" y="430" fill="#cda77f" font-size="11" font-family="monospace">y = sin(b·t + π/2)</text>'+
    '</svg>'+
    '<div class="lab-instrument-foot"><span>DETERMINISTIC GEOMETRY</span>'+
    '<span>NO MEASURED DATA</span></div></div>';
}
function studyCard(index,category,title,description,status){
  return '<article class="lab-study"><span>'+index+' / '+category+'</span><h3>'+title+'</h3>'+
    '<p>'+description+'</p><small>'+status+'</small></article>';
}
// Original, lightweight line illustrations; decorative rather than measured data.
const destinations=[
  ['experience','Research','Mathematics, models & neural dynamics','01','M24 60C38 2 62 118 76 60S114 2 128 60 M24 60C38 118 62 2 76 60S114 118 128 60'],
  ['systems','Systems','Architecture & independent infrastructure','02','M30 30H66V52H30Z M86 30H122V52H86Z M58 78H94V100H58Z M48 52V66H104V52 M76 66V78'],
  ['work','Projects','Open source & work in progress','03','M30 30H122V100H30Z M30 48H122 M48 65L60 76L48 87 M72 87H100'],
  ['portfolio','Portfolio','Selected software & practical work','04','M28 40H124V98H28Z M56 40V28H96V40 M28 62L76 79L124 62 M70 72H82V85H70Z'],
  ['writing','Fieldnotes','Engineering notes & original writing','05','M38 26H104L118 40V100H38Z M104 26V42H118 M52 58H102 M52 72H102 M52 86H84'],
];
function destinationCards(){
  return destinations.map(([key,title,description,index,path])=>
    '<a class="lab-destination" href="#one-panel-'+key+'" data-one-go="'+key+'" data-lab-destination="'+key+'">'+
    '<svg viewBox="0 0 152 120" aria-hidden="true" fill="none"><circle cx="76" cy="60" r="48" stroke="currentColor" opacity=".12"/>'+
    '<path d="'+path+'" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>'+
    '<span>'+index+' / EXPLORE</span><strong>'+title+'</strong><small>'+description+'</small><b aria-hidden="true">↗</b></a>').join('');
}
export function renderResearchFacilityHome(){
  const introduction='Devon Alan Akins is an independent software developer pursuing scientific computing, computational modeling and open-source AI infrastructure.';
  const home=view('home',
    '<div class="lab-overview lab-portfolio-layout">'+
    '<section class="lab-portfolio-hero" aria-label="Personal portfolio introduction">'+
      '<div class="lab-portfolio-hero-art" aria-hidden="true"></div><div class="lab-neural-apparatus" aria-hidden="true"></div>'+
      '<div class="lab-portfolio-hero-content">'+
        '<p class="lab-overline"><span class="lab-diamond" aria-hidden="true"></span>INDEPENDENT SOFTWARE / RESEARCH / SYSTEMS</p>'+
        '<h1>Devon Alan <em>Akins.</em></h1>'+
        '<p class="lab-portfolio-role">INDEPENDENT SOFTWARE DEVELOPER & RESEARCH ENGINEER</p>'+
        '<p class="lab-portfolio-statement">I build independent software, explore complex systems, and engineer the tools that make ideas work.</p>'+
        '<p class="lab-portfolio-details">Scientific computing · AI infrastructure · Physics · Mathematics · Computational neuroscience</p>'+
        '<div class="lab-portfolio-actions">'+
          goto('work','Explore my work',true)+goto('experience','Research laboratory')+
          '<a class="lab-portfolio-link" href="https://github.com/devonalanakins" target="_blank" rel="noopener noreferrer">PERSONAL GITHUB ↗</a>'+
        '</div>'+
        '<noscript><nav class="lab-nojs" aria-label="Alternative navigation"><a href="/work/">Work</a><a href="/about/">About</a><a href="/contact/">Contact</a></nav></noscript>'+
      '</div>'+
      '<div class="lab-hero-art-label"><span>PERSONAL LABORATORY / DA 001</span><span>ARCHITECTURAL ILLUSTRATION</span></div>'+
    '</section>'+
    '<section class="lab-portfolio-selected" aria-labelledby="lab-selected-title">'+
      '<div class="lab-portfolio-section-label"><div><p class="lab-overline">THE LABORATORY / FIVE DIRECTIONS</p><h2 id="lab-selected-title">Explore the work.</h2></div>'+
      '<button type="button" data-one-go="work" aria-label="Explore all selected work">ALL PROJECTS ↗</button></div>'+
      '<div class="lab-destinations">'+destinationCards()+
      '</div>'+
    '</section>'+
    '<section class="lab-portfolio-signals" aria-labelledby="lab-signals-title">'+
      '<div class="lab-portfolio-section-label"><div><p class="lab-overline">PERSONAL PRESENCE / SOURCE-QUALIFIED FEEDS</p><h2 id="lab-signals-title">What I am working on.</h2></div>'+
      '<button type="button" data-one-go="activity" aria-label="Explore public activity and sources">ALL ACTIVITY ↗</button></div>'+
      '<div class="lab-portfolio-signal-grid">'+
        '<div class="lab-signal-tile lab-signal-github"><div class="lab-signal-title"><span>GITHUB / PUBLIC EVENTS</span><a href="https://github.com/devonalanakins" target="_blank" rel="noopener noreferrer">PROFILE ↗</a></div>'+feed('one-home-github',3)+'</div>'+
        '<div class="lab-signal-tile lab-signal-work">'+workPresence()+'</div>'+
        '<div class="lab-signal-tile lab-signal-spotify">'+spotifyCard()+'</div>'+
        '<div class="lab-signal-tile lab-signal-threads">'+renderHomeThreadsSignal('activity')+'</div>'+
      '</div>'+
      '<p class="lab-portfolio-provenance">Feeds only report approved public sources and timestamps. Unavailable is not inactive; historical activity is not a live editor session.</p>'+
    '</section>'+
    '</div>');
  const research=view('experience',
    '<div class="lab-secondary lab-research">'+
      '<div class="lab-section-intro"><p class="lab-overline">RESEARCH / PROGRAM 001</p>'+
      '<h1>The mathematics of <em>complex systems.</em></h1>'+
      '<p>My research direction connects physical models, neural dynamics, numerical methods and the computing infrastructure required to explore them.</p>'+
      '<div class="lab-status-pair"><span>STATUS / DESIGN & STUDY</span><span>NOT A PUBLISHED RESEARCH RESULT</span></div></div>'+
      '<div class="lab-research-instrument">'+instrument('lab-field-research',true)+
      '<div class="lab-controls"><div class="lab-control"><label for="lab-axis-a">X FREQUENCY <output for="lab-axis-a" data-lab-value="a">3</output></label>'+
      '<input id="lab-axis-a" type="range" min="1" max="6" step="1" value="3" data-lab-axis="a"/></div>'+
      '<div class="lab-control"><label for="lab-axis-b">Y FREQUENCY <output for="lab-axis-b" data-lab-value="b">4</output></label>'+
      '<input id="lab-axis-b" type="range" min="1" max="6" step="1" value="4" data-lab-axis="b"/></div>'+
      '<p role="status" data-lab-model-caption>Analytic Lissajous model: a = 3, b = 4, phase = π/2. Calculated locally.</p></div></div>'+
      '<div class="lab-research-stack">'+
      studyCard('01','MATHEMATICAL PHYSICS','Nonlinear dynamics','ODEs, coupled oscillators, numerical stability and physical simulation.','STUDY DIRECTION')+
      studyCard('02','COMPUTATIONAL NEUROSCIENCE','Excitable systems','From membrane models to reproducible simulations of neural behavior.','PROPOSED EXPERIMENT')+
      studyCard('03','SCIENTIFIC COMPUTING','Accelerated methods','Test numerical algorithms, CPU/GPU correctness and workload-specific performance.','PROPOSED BENCHMARKS')+
      '</div></div>');
  const projects=view('work',
    '<div class="lab-secondary lab-systems"><div class="lab-section-intro">'+
    '<p class="lab-overline">ENGINEERING / OPEN SOURCE</p><h1>Projects with <em>evidence.</em></h1>'+
    '<p>Existing software and operational work are distinct from future scientific infrastructure. Every project should show its maturity and source.</p></div>'+
    '<div class="lab-system-grid">'+
    '<a href="/work/" class="lab-system-card"><span>01 / PERSONAL WEBSITE</span><h3>DevonAkins.com</h3>'+
    '<p>Source-controlled personal site, technical experimentation and consent-qualified public signals.</p><small>EXISTING SOURCE · INSPECT WORK ↗</small></a>'+
    '<a href="/work/devonstation/" class="lab-system-card"><span>02 / INDEPENDENT SOFTWARE</span><h3>DevonStation & Knowledge</h3>'+
    '<p>Owner-controlled software and private-first information systems.</p><small>IN DEVELOPMENT · VIEW PROJECT ↗</small></a>'+
    '<a href="https://github.com/devonalanakins/merit" target="_blank" rel="noopener noreferrer" class="lab-system-card"><span>03 / ENGINEERING INTEGRITY</span><h3>Merit</h3>'+
    '<p>Evidence-based review tools for AI-assisted and human-written software.</p><small>EXPERIMENTAL SOURCE · GITHUB ↗</small></a>'+
    '<a href="/work/operations/" class="lab-system-card"><span>04 / PROFESSIONAL OPERATIONS</span><h3>Practical systems</h3>'+
    '<p>Nonclinical workflows, service coordination and software that supports real work.</p><small>ONGOING PRACTICE · VIEW WORK ↗</small></a>'+
    '</div><p class="lab-secondary-note">The proposed AI compute laboratory is a research direction, not a deployed cloud or a published GPU benchmark.</p></div>');
  const systems=view('systems',
    '<div class="lab-secondary lab-systems"><div class="lab-section-intro"><p class="lab-overline">SYSTEMS / ENGINEERING PRACTICE</p>'+
    '<h1>Architecture for <em>independence.</em></h1><p>I build source-controlled systems with explicit data boundaries, observable behavior, and a path back when a change fails.</p></div>'+
    '<div class="lab-system-grid">'+
    studyCard('01','WEB PLATFORM','An inspectable edge','This website combines static pages with a Worker API. Public signals use narrowly scoped projections rather than exposing owner records.','EXISTING WEBSITE ARCHITECTURE')+
    studyCard('02','PERSONAL INFRASTRUCTURE','DevonStation','Owner-controlled software and private-first knowledge systems. Public descriptions stay separate from private records and services.','IN DEVELOPMENT')+
    studyCard('03','SOURCE INTEGRITY','Evidence before confidence','Versioned changes, automated checks and independent browser review make work inspectable. A passing test is evidence only for what it actually checks.','ENGINEERING PRACTICE')+
    studyCard('04','RESEARCH COMPUTING','Reproducible methods','Numerical correctness and documented assumptions come before performance claims. GPU benchmarks and scientific results remain proposed work.','RESEARCH DIRECTION')+
    '</div></div>');
  const portfolio=view('portfolio',
    '<div class="lab-secondary lab-systems"><div class="lab-section-intro"><p class="lab-overline">PORTFOLIO / SELECTED PRACTICE</p>'+
    '<h1>Software that supports <em>real work.</em></h1><p>Independent development and practical operations, with public scope and project maturity made explicit.</p></div>'+
    '<div class="lab-system-grid">'+
    '<a class="lab-system-card" href="/work/operations/"><span>01 / NONCLINICAL OPERATIONS</span><h3>Nona Neuropsychology</h3><p>Service coordination, administrative workflows and digital experience. This public overview contains no clinical records or patient information.</p><small>PUBLIC OPERATIONS OVERVIEW ↗</small></a>'+
    '<a class="lab-system-card" href="/work/devonstation/"><span>02 / PERSONAL SOFTWARE</span><h3>DevonStation</h3><p>Independent tools and owner-controlled infrastructure, currently in development.</p><small>PUBLIC PROJECT OVERVIEW ↗</small></a>'+
    '<a class="lab-system-card" href="https://github.com/devonalanakins/devonakins.com" target="_blank" rel="noopener noreferrer"><span>03 / WEB ENGINEERING</span><h3>DevonAkins.com</h3><p>Personal portfolio, research exploration and consent-aware public presence.</p><small>INSPECT PUBLIC SOURCE ↗</small></a>'+
    '<a class="lab-system-card" href="https://github.com/devonalanakins/merit" target="_blank" rel="noopener noreferrer"><span>04 / SOFTWARE INTEGRITY</span><h3>Merit</h3><p>Experimental tools for evidence-based software review.</p><small>EXPERIMENTAL PUBLIC SOURCE ↗</small></a>'+
    '</div></div>');
  const activity=view('activity',
    '<div class="lab-secondary lab-activity"><div class="lab-section-intro">'+
      '<p class="lab-overline">ACTIVITY / WORK IN THE OPEN</p>'+
      '<h1>A visible record of <em>making.</em></h1>'+
      '<p>Public GitHub changes, owner-authorized development presence, music, and public writing. Each source stays separate, timestamped, and correctly labeled.</p></div>'+
    '<div class="lab-activity-grid">'+
    '<section class="lab-data-panel"><div class="lab-data-title"><strong>GITHUB / PUBLIC HISTORY</strong>'+
    '<a href="https://github.com/devonalanakins" target="_blank" rel="noopener noreferrer">OPEN GITHUB ↗</a></div>'+
    '<div class="lab-activity-filters" role="group" aria-label="Filter GitHub activity">'+
    '<button type="button" data-github-filter="all" aria-pressed="true">All</button>'+
    '<button type="button" data-github-filter="push" aria-pressed="false">Pushes</button>'+
    '<button type="button" data-github-filter="pull_request" aria-pressed="false">PRs</button>'+
    '<button type="button" data-github-refresh>Refresh</button></div>'+
    feed('one-activity-github',6)+'</section>'+
    '<div class="lab-activity-side">'+
    '<section class="lab-data-panel lab-threads">'+renderThreadsPreview()+'</section>'+
    '<section class="lab-data-panel lab-evidence-guide"><strong>SOURCE / INTEGRITY</strong>'+
    '<h2>Measured, not imagined.</h2><p>Recent public commits and pull requests are dated history. Development presence requires an owner-approved reporter. Playback reflects approved listening, not proof of coding. Posts appear only when public sharing is enabled.</p>'+
    '<a class="lab-text-link" href="/activity/">Explore the full public activity page ↗</a>'+
    '</section></div></div></div>');
  const notes=view('writing',
    '<div class="lab-secondary lab-notes"><div class="lab-section-intro">'+
      '<p class="lab-overline">FIELDNOTES / PUBLIC WRITING</p><h1>Think rigorously.<br><em>Write clearly.</em></h1>'+
      '<p>Technical research notes, mathematical derivations, engineering reports, and original writing. Published results must remain distinguishable from hypotheses.</p></div>'+
    '<div class="lab-notes-grid">'+
    '<article class="lab-study"><span>01 / MATHEMATICAL NOTE</span><h3>A curve is not a measurement</h3><p>The Research instrument evaluates x = sin(a·t), y = sin(b·t + π/2) over 0 ≤ t ≤ 2π. Integer frequencies close the trajectory over that interval. Changing their ratio changes the geometry.</p><details><summary>Read the assumptions</summary><p>Each coordinate is bounded by −1 and 1 before display scaling. The path joins 301 samples with straight segments; it is a visual approximation of an analytic curve. It contains no neural recordings and cannot establish anything about a biological system.</p></details><small>ANALYTIC EXPLANATION · NOT AN EXPERIMENT</small></article>'+
    '<article class="lab-study"><span>02 / ENGINEERING NOTE</span><h3>What a public signal proves</h3><p>A timestamped GitHub event records a public change. It does not establish an active editor session. Development presence comes from a separate owner-approved reporter.</p><details><summary>Read the evidence boundary</summary><p>Unavailable sources remain unavailable. Playback metadata describes approved listening; decorative graphics are illustrations. Project maturity, test results and release status must each have their own evidence.</p></details><small>PUBLIC SOURCE INTERPRETATION</small></article>'+
    studyCard('03','ORIGINAL WRITING','Books & worlds','Long-form creative work remains part of my life, without defining the technical research specialization.','ONGOING CREATIVE WORK')+
    '</div><a class="lab-text-link" href="/writing/">Existing writing and research page ↗</a></div>');
  const contact=view('contact',
    '<div class="lab-secondary lab-contact"><div class="lab-section-intro">'+
      '<p class="lab-overline">CONTACT / DEVON ALAN AKINS</p><h1>Let’s discuss a <em>real problem.</em></h1>'+
      '<p>For open-source software, scientific computing, infrastructure engineering, technical collaboration or professional operations.</p>'+
      '<a class="lab-contact-email" href="mailto:hello@devonakins.com">hello@devonakins.com <span aria-hidden="true">↗</span></a>'+
      '<p class="lab-secondary-note">Do not send confidential medical, patient, employee or other protected information through this public contact route.</p></div>'+
      '<div class="lab-contact-social">'+renderHomeSocialHub()+
      '<a class="lab-text-link" href="/contact/">Full contact details ↗</a></div></div>');
  return '<!doctype html><html lang="en" class="one-html lab-html"><head>'+
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
    '<meta name="theme-color" content="#071013"><meta name="color-scheme" content="dark">'+
    '<meta name="description" content="'+escapeHtml(introduction)+'">'+
    '<meta property="og:type" content="website"><meta property="og:title" content="Devon Alan Akins — Software, Systems & Research">'+
    '<meta property="og:description" content="'+escapeHtml(introduction)+'">'+
    '<link rel="canonical" href="https://devonakins.com/">'+
    '<link rel="icon" href="/favicon-32.png"><title>Devon Alan Akins — Software, Systems & Research</title>'+
    '<link rel="stylesheet" href="/src/professional/site.css">'+
    '<link rel="stylesheet" href="/src/professional/one-screen.css">'+
    '<link rel="stylesheet" href="/src/professional/social-presence.css">'+
    '<link rel="stylesheet" href="/src/professional/research-facility.css">'+
    '<link rel="stylesheet" href="/src/professional/research-portfolio.css">'+
    '<script type="module" src="/src/professional/client.ts"></script>'+
    '<script type="module" src="/src/professional/one-screen.ts"></script>'+
    '<script type="module" src="/src/professional/research-facility.ts"></script>'+
    '<noscript><style>html.lab-html,body.lab-body{height:auto;overflow:auto}.lab-body .lab-stage{height:auto;overflow:visible}.lab-body .lab-stage>.lab-view[hidden]{display:block!important}.lab-body .lab-view{height:auto;min-height:100vh}.lab-body .lab-secondary{height:auto}.lab-tabs,.lab-motion{display:none!important}</style></noscript>'+
    '</head><body class="p-body one-body lab-body">'+
    '<a class="one-skip lab-skip" href="#one-stage">Skip to content</a>'+
    '<div class="lab-background" aria-hidden="true"><div class="lab-background-grid"></div>'+
    '<div class="lab-background-glow"></div></div>'+
    '<header class="lab-header"><a href="/" class="lab-brand" aria-label="Devon Akins home">'+
    '<span class="lab-brand-glyph">DA<span aria-hidden="true">·</span></span><span class="lab-brand-caption">DEVON ALAN AKINS'+
    '<small>INDEPENDENT SOFTWARE · SCIENTIFIC COMPUTING</small></span></a>'+
    nav('desktop')+
    '<div class="lab-header-end"><span class="lab-header-index">PERSONAL / INDEPENDENT</span>'+
    '<button type="button" class="lab-motion" data-lab-motion aria-pressed="true" aria-label="Pause decorative motion">MOTION ON</button>'+
    '<a href="mailto:hello@devonakins.com" class="lab-header-contact">CONTACT ↗</a></div></header>'+
    '<main id="one-stage" class="one-stage lab-stage" tabindex="-1">'+
    home+research+systems+projects+portfolio+activity+notes+contact+'</main>'+
    '<div class="lab-bottom-status"><span>DEVON ALAN AKINS / INDEPENDENT DEVELOPER</span>'+
    '<span>PORTFOLIO · VERIFIED ACTIVITY · OPEN SOURCE</span></div>'+
    nav('mobile')+
    '</body></html>';
}
