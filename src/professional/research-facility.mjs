/**
 * The Computational Laboratory — a source-honest, opt-in personal site candidate.
 * Deliberately separate from the production V4 and approved one-screen builds.
 * Mathematical figures are analytic, not measured experiments or live telemetry.
 */
import {spotifyCard, gptSignalCard} from './signal-cards.mjs';
import {renderOneScreenGptSummary} from './gpt-capture.mjs';
import {renderHomeSocialHub, renderHomeThreadsSignal} from './social-presence.mjs';

const escapeHtml=value=>String(value ?? '').replace(/[&<>"']/g,
  c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=Object.freeze([
  ['home','Overview'],['experience','Research'],['work','Systems'],
  ['activity','Signals'],['writing','Fieldnotes'],['contact','Contact'],
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
export function renderResearchFacilityHome({datedCapture=null}={}){
  const gpt=datedCapture?renderOneScreenGptSummary(datedCapture):gptSignalCard();
  const introduction='Devon Alan Akins is an independent software developer pursuing scientific computing, computational modeling and open-source AI infrastructure.';
  const home=view('home',
    '<div class="lab-overview">'+
    '<section class="lab-intro" aria-label="Introduction">'+
      '<p class="lab-overline"><span class="lab-diamond" aria-hidden="true"></span>DEVON ALAN AKINS / PERSONAL LABORATORY</p>'+
      '<p class="lab-edition">INDEPENDENT SOFTWARE DEVELOPMENT & RESEARCH</p>'+
      '<h1>Understand the system.<br><em>Build the instrument.</em></h1>'+
      '<p class="lab-intro-text">I build software for studying complex systems—at the intersection of mathematics, physics, biology and artificial intelligence infrastructure.</p>'+
      '<p class="lab-qualification">A developing research practice grounded in reproducible experiments, source code and measured evidence.</p>'+
      '<div class="lab-actions">'+goto('experience','Explore the research',true)+goto('work','Inspect the systems')+'</div>'+'<noscript><nav class="lab-nojs" aria-label="Non-JavaScript navigation"><a href="/work/">Work</a><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/gpt/">GPT record</a></nav></noscript>'+
      '<div class="lab-discipline-grid"><span>MATHEMATICS</span><span>PHYSICS</span>'+
      '<span>COMPUTATIONAL BIOLOGY</span><span>AI SYSTEMS</span></div>'+
      '<div class="lab-intro-bottom"><span>OPEN SOURCE / SELF-HOSTABLE</span>'+
      '<span>FLORIDA, USA · REMOTE</span></div>'+
    '</section>'+
    '<section class="lab-field" aria-label="Illustrated mathematical field">'+
      '<div class="lab-field-label"><span>THEORETICAL SYSTEMS</span><b>DA / 001</b></div>'+
      instrument('lab-field-home')+
      '<div class="lab-field-annotation"><strong>Mathematical Field</strong>'+
      '<p>An analytic trajectory, not a live measurement. Explore the adjustable model in Research.</p>'+
      goto('experience','Open instrument')+'</div>'+
    '</section>'+
    '<aside class="lab-observatory" aria-label="Public source-qualified signals">'+
      '<div class="lab-observatory-heading"><span>OBSERVATORY / PUBLIC SIGNALS</span>'+
      '<strong>What is verifiable.</strong><small>Only connected and dated sources are reported.</small></div>'+
      '<div class="lab-observatory-feed"><div class="lab-signal-heading">GITHUB / RECENT PUBLIC EVENTS'+
      '<button type="button" data-one-go="activity">ALL ↗</button></div>'+feed('one-home-github',4)+'</div>'+
      workPresence()+
      '<div class="lab-spotify">'+spotifyCard()+'</div>'+
      '<p class="lab-evidence-note">Signals are historical or source-verified. Unavailable means unavailable—not zero activity. <a class="lab-source-link" href="https://github.com/devonalanakins" target="_blank" rel="noopener noreferrer">Inspect source ↗</a></p>'+
    '</aside>'+
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
  const systems=view('work',
    '<div class="lab-secondary lab-systems"><div class="lab-section-intro">'+
    '<p class="lab-overline">ENGINEERING / OPEN SOURCE</p><h1>Systems with <em>evidence.</em></h1>'+
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
  const activity=view('activity',
    '<div class="lab-secondary lab-activity"><div class="lab-section-intro">'+
      '<p class="lab-overline">OBSERVATORY / PUBLIC EVIDENCE</p>'+
      '<h1>Signals, not <em>fiction.</em></h1>'+
      '<p>GitHub events, independent development presence, approved listening and dated GPT captures remain separate sources.</p></div>'+
    '<div class="lab-activity-grid">'+
    '<section class="lab-data-panel"><div class="lab-data-title"><strong>GITHUB / PUBLIC HISTORY</strong>'+
    '<a href="https://github.com/devonalanakins" target="_blank" rel="noopener noreferrer">FULL HISTORY ↗</a></div>'+
    '<div class="lab-activity-filters" role="group" aria-label="Filter GitHub activity">'+
    '<button type="button" data-github-filter="all" aria-pressed="true">All</button>'+
    '<button type="button" data-github-filter="push" aria-pressed="false">Pushes</button>'+
    '<button type="button" data-github-filter="pull_request" aria-pressed="false">PRs</button>'+
    '<button type="button" data-github-refresh>Refresh</button></div>'+
    feed('one-activity-github',6)+'</section>'+
    '<div class="lab-activity-side"><section class="lab-data-panel lab-gpt">'+gpt+'</section>'+
    '<section class="lab-data-panel lab-threads">'+renderHomeThreadsSignal()+'</section>'+
    '</div></div></div>');
  const notes=view('writing',
    '<div class="lab-secondary lab-notes"><div class="lab-section-intro">'+
      '<p class="lab-overline">FIELDNOTES / PUBLIC WRITING</p><h1>Think rigorously.<br><em>Write clearly.</em></h1>'+
      '<p>Technical research notes, mathematical derivations, engineering reports, and original writing. Published results must remain distinguishable from hypotheses.</p></div>'+
    '<div class="lab-notes-grid">'+
    studyCard('01','SCIENTIFIC NOTEBOOK','Mathematical models','Working through equations, assumptions, tests and numerical methods before claiming results.','IN DEVELOPMENT')+
    studyCard('02','ENGINEERING REPORTS','Reproducibility','Source-linked benchmarks, test limitations and verified deployment evidence.','PRACTICE STANDARD')+
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
    '<meta property="og:type" content="website"><meta property="og:title" content="Devon Alan Akins — Computational Systems & AI Infrastructure">'+
    '<meta property="og:description" content="'+escapeHtml(introduction)+'">'+
    '<link rel="canonical" href="https://devonakins.com/">'+
    '<link rel="icon" href="/favicon-32.png"><title>Devon Alan Akins — Computational Laboratory</title>'+
    '<link rel="stylesheet" href="/src/professional/site.css">'+
    '<link rel="stylesheet" href="/src/professional/one-screen.css">'+
    '<link rel="stylesheet" href="/src/professional/social-presence.css">'+
    '<link rel="stylesheet" href="/src/professional/research-facility.css">'+
    '<script type="module" src="/src/professional/client.ts"></script>'+
    '<script type="module" src="/src/professional/one-screen.ts"></script>'+
    '<script type="module" src="/src/professional/research-facility.ts"></script>'+
    '</head><body class="p-body one-body lab-body">'+
    '<a class="one-skip lab-skip" href="#one-stage">Skip to content</a>'+
    '<div class="lab-background" aria-hidden="true"><div class="lab-background-grid"></div>'+
    '<div class="lab-background-glow"></div></div>'+
    '<header class="lab-header"><a href="/" class="lab-brand" aria-label="Devon Akins home">'+
    '<span class="lab-brand-glyph">DA<span aria-hidden="true">·</span></span><span class="lab-brand-caption">DEVON ALAN AKINS'+
    '<small>COMPUTATIONAL LABORATORY</small></span></a>'+
    nav('desktop')+
    '<div class="lab-header-end"><span class="lab-header-index">PERSONAL / INDEPENDENT</span>'+
    '<button type="button" class="lab-motion" data-lab-motion aria-pressed="true" aria-label="Pause decorative motion">MOTION ON</button>'+
    '<a href="mailto:hello@devonakins.com" class="lab-header-contact">CONTACT ↗</a></div></header>'+
    '<main id="one-stage" class="one-stage lab-stage" tabindex="-1">'+
    home+research+systems+activity+notes+contact+'</main>'+
    '<div class="lab-bottom-status"><span>DA / SCIENTIFIC COMPUTING</span>'+
    '<span>ORIGINAL RESEARCH DIRECTIONS · VERIFIED WORK MARKED EXPLICITLY</span></div>'+
    nav('mobile')+
    '</body></html>';
}
