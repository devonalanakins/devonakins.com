/**
 * The Computational Laboratory — a source-honest, opt-in personal site candidate.
 * Deliberately separate from the production V4 and approved one-screen builds.
 * Mathematical figures are analytic, not measured experiments or live telemetry.
 */
import {LABORATORY_ROUTES} from './laboratory-routes.mjs';
import {listeningCollections} from './signal-cards.mjs';
import {brandIcon} from './brand-icons.mjs';
import {approvedPublicProjects} from '../publication-manifest.mjs';
import {renderHomeSocialHub, renderSocialChannels} from './social-presence.mjs';

const escapeHtml=value=>String(value ?? '').replace(/[&<>"']/g,
  c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=Object.freeze([
  ['home','Home'],['experience','Research'],['systems','Systems'],['work','Work'],['portfolio','Portfolio'],
  ['activity','Activity'],['writing','Fieldnotes'],['contact','Contact'],
]);
// Only three public destinations; historical sections remain addressable for
// bookmarks, case studies and direct links without cluttering the main nav.
const primarySections=Object.freeze([['home','Home'],['work','Work'],['experience','Research']]);
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
function renderNavigation(kind,activeView){
  return '<nav class="one-tabs lab-tabs lab-tabs-'+kind+'" aria-label="'+
    (kind==='desktop'?'Laboratory navigation':'Mobile laboratory navigation')+'">'+
    '<div class="one-tablist" role="tablist" aria-label="Laboratory sections">'+
    primarySections.map(([key,label])=>'<button type="button" role="tab" id="one-'+kind+'-'+key+
      '" aria-controls="one-panel-'+key+'" aria-selected="'+(key===activeView?'true':'false')+
      '" tabindex="'+(key===activeView?'0':'-1')+'" data-one-target="'+key+'">'+
      '<span class="one-tab-label">'+escapeHtml(label)+'</span></button>').join('')+
    '</div></nav>';
}
function renderView(key,content,activeView){
  return '<section class="one-view lab-view lab-view-'+key+'" id="one-panel-'+key+
    '" data-one-view="'+key+'" aria-label="'+sections.find(([id])=>id===key)[1]+
    '" role="tabpanel" tabindex="-1"'+(key===activeView?'':' hidden')+'>'+content+'</section>';
}
function goto(key,label,primary=false){
  return '<a href="'+LABORATORY_ROUTES[key]+'" class="lab-action'+(primary?' lab-action-primary':'')+
    '" data-one-go="'+key+'">'+escapeHtml(label)+' <span aria-hidden="true">→</span></a>';
}
function feed(id,limit){
  return '<div class="one-feed lab-feed" id="'+id+'" data-public-github-feed data-limit="'+
    limit+'"><p role="status" aria-live="polite" data-feed-status>'+
    'Checking dated public GitHub events…</p><ol data-feed-list></ol>'+
    '<p class="one-feed-disclosure">Public events only · historical timestamps, not proof of working now.</p></div>';
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
const destinations=[
 ['work','Work','Operations, engineering, selected systems and real project evidence.','work','M3 19V5h8l3 4h7v10H3 M7 14h10 M7 10h3'],
 ['experience','Research','Methods, mathematical models, computational inquiry and fieldnotes.','research','M2 16q5-14 10-2t10-2 M2 20h20 M12 2v20'],
];
function destinationCards(){
 return destinations.map(([key,title,description,art,path],index)=>
 '<a class="lab-destination lab-destination--'+art+'" href="'+LABORATORY_ROUTES[key]+'" data-one-go="'+key+'" data-lab-destination="'+key+'">'+
 '<span class="lab-destination-index" aria-hidden="true">'+String(index+1).padStart(2,'0')+' / 02</span>'+
 '<span class="lab-card-print" aria-hidden="true">'+String(index+1).padStart(2,'0')+'</span>'+
 '<span class="lab-card-rule" aria-hidden="true"></span>'+
 '<svg class="lab-destination-glyph" viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="'+path+'" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>'+
 '<div class="lab-destination-copy"><strong>'+title+'</strong><small>'+description+'</small></div>'+
 '<span class="lab-destination-arrow" aria-hidden="true">↗</span></a>').join('');
}
function atomMark(){return '<svg viewBox="0 0 90 50" aria-hidden="true" fill="none"><ellipse cx="45" cy="25" rx="40" ry="10" transform="rotate(-24 45 25)" stroke="#a8dad3"/><ellipse cx="45" cy="25" rx="40" ry="10" transform="rotate(24 45 25)" stroke="#dfaa75"/><path d="M45 2v46" stroke="#8ca7a0" stroke-width=".5"/><circle cx="45" cy="25" r="3" fill="#fff0d3"/></svg>'}
function compactSignals(){return '<section class="lab-portfolio-signals" aria-label="Selected public sources">'+
 '<div class="lab-signals-label"><span class="lab-source-eyebrow">THE PUBLIC RECORD / 01</span><strong>Traceable work.<br> Intentional listening.</strong><small>Two optional windows into the practice, never a substitute for the work itself.</small></div>'+
 '<div class="lab-portfolio-signal-grid">'+
 '<details class="lab-signal-tile lab-signal-github"><summary>'+brandIcon('github')+'<span><strong>Source &amp; changes</strong><small data-github-compact>Checking dated public history</small></span></summary><div class="lab-signal-expanded">'+feed('one-home-github',3)+'<button data-one-go="activity">Explore public record →</button></div></details>'+
 '<details class="lab-signal-tile lab-signal-spotify" data-public-spotify><summary>'+brandIcon('spotify')+'<span><strong>Listening room</strong><small data-spotify-title>Checking approved playback</small></span></summary><div class="lab-signal-expanded"><span data-spotify-state>Checking source</span><p data-spotify-artist>Only explicitly shared playback.</p><img data-spotify-cover alt="" width="48" height="48" referrerpolicy="no-referrer" decoding="async" loading="lazy" hidden><progress data-spotify-progress aria-label="Track progress" hidden></progress><p data-spotify-note>No autoplay audio.</p><a data-spotify-link href="/listening/">About listening →</a></div></details>'+
 '</div></section>'}
function projectCatalog(){return '<div class="lab-project-browser"><label for="lab-project-search">Search public projects</label><input type="search" id="lab-project-search" data-lab-project-search placeholder="Search by name or area"><label for="lab-project-filter">Area</label><select id="lab-project-filter" data-lab-project-filter><option value="all">All areas</option>'+[...new Set(approvedPublicProjects.map(p=>p.publication.category))].map(c=>'<option>'+escapeHtml(c)+'</option>').join('')+'</select><p role="status" data-lab-project-count>'+approvedPublicProjects.length+' public projects</p><div class="lab-system-grid">'+approvedPublicProjects.map(p=>'<a class="lab-system-card" data-lab-project data-category="'+escapeHtml(p.publication.category)+'" href="/work/'+p.slug+'/"><span>'+escapeHtml(p.publication.category)+' / '+escapeHtml(p.publication.stage)+'</span><h3>'+escapeHtml(p.title)+'</h3><p>'+escapeHtml(p.summary)+'</p><small>'+escapeHtml(p.status)+' · PUBLIC OVERVIEW →</small></a>').join('')+'</div></div>'}
export function renderResearchFacilityHome({initialView='home',canonicalPath='/',project=null,listening=false,notFound=false}={}){
  if(project&&!approvedPublicProjects.includes(project))throw new Error('Project publication is not approved');
  if(!Object.hasOwn(LABORATORY_ROUTES,initialView))throw new Error('Unknown cinematic view');
  const view=(key,content)=>renderView(key,content,initialView);
  const nav=kind=>renderNavigation(kind,initialView);
  const pageTitle=project?project.title+' — Devon Alan Akins':notFound?'Page not found — Devon Alan Akins':listening?'Listening — Devon Alan Akins':initialView==='home'?'Devon Alan Akins — Operations, Engineering & Research':sections.find(([key])=>key===initialView)[1]+' — Devon Alan Akins';
  const introductions={home:'Devon Alan Akins leads nonclinical operations and technology work at Nona Neuropsychology, independently develops software, and studies scientific computing and AI infrastructure.',experience:'Interactive mathematical models, scientific questions, assumptions and citations from Devon Alan Akins.',systems:'Documented software architecture, privacy boundaries and independent infrastructure engineering.',work:'Explore approved public software projects, source links, categories and honest implementation status.',portfolio:'Selected software and nonclinical professional operations, including operational and digital-experience work for Nona Neuropsychology.',activity:'Dated public engineering changes, with source provenance and clear project boundaries.',writing:'Mathematical explanations, engineering notes, original writing and books in development.',contact:'Contact Devon Alan Akins about nonclinical operations, independent software development, and research computing. Do not send protected information.'};
  const introduction=project?project.summary:listening?'Owner-approved Spotify playback and selected public playlists, with independent source and privacy controls.':notFound?'This page is unavailable. Explore Devon Alan Akins’s public software and research portfolio.':introductions[initialView];
  const home=view('home',
 '<div class="lab-overview lab-portfolio-layout">'+
 '<section class="lab-portfolio-hero" aria-label="Personal introduction and current professional focus">'+
 '<div class="lab-hero-field" aria-hidden="true"><div class="lab-field-grid"></div><div class="lab-field-sheet"><div class="lab-field-sheet-head"><span>DA / 001 — FIELD STUDY</span><span>2D / EXPERIMENTAL DIAGRAM</span></div><svg class="lab-field-traces" viewBox="0 0 720 420" preserveAspectRatio="xMidYMid meet" fill="none"><g class="lab-trace-grid" stroke="currentColor" stroke-width="1"><path d="M0 60H720 M0 120H720 M0 180H720 M0 240H720 M0 300H720 M0 360H720 M90 0V420 M180 0V420 M270 0V420 M360 0V420 M450 0V420 M540 0V420 M630 0V420"/></g><g class="lab-trace-axis" stroke="currentColor" stroke-width="1"><path d="M42 210H680 M360 24V396"/></g><path class="lab-trace lab-trace--primary" d="M24 268 C90 268 108 156 170 156 S262 310 340 260 S444 95 520 143 S634 280 700 128" stroke="currentColor" stroke-width="2.5"/><path class="lab-trace lab-trace--secondary" d="M24 130 C110 170 116 290 204 276 S311 112 390 155 S500 330 586 250 S664 160 700 210" stroke="currentColor" stroke-width="1.6"/><path class="lab-trace lab-trace--fine" d="M24 330 L94 330 L130 322 L177 331 L237 285 L299 292 L352 194 L405 202 L452 132 L520 154 L568 101 L620 126 L700 65" stroke="currentColor" stroke-width="1.2"/><circle cx="360" cy="194" r="5" fill="currentColor"/><circle cx="520" cy="143" r="4" fill="currentColor"/><circle cx="586" cy="250" r="3" fill="currentColor"/></svg><div class="lab-field-sheet-foot"><span>SCHEMATIC / NOT MEASURED DATA</span><span>STUDY ↔ BUILD</span></div></div><span class="lab-field-measure lab-field-measure--top">INQUIRY / 001</span><span class="lab-field-measure lab-field-measure--bottom">MATH · SYSTEMS · COMPUTING</span></div><div class="lab-scene-light" aria-hidden="true"></div>'+
 '<div class="lab-portfolio-hero-content"><p class="lab-hero-name"><span class="lab-hero-marker" aria-hidden="true"></span>DEVON ALAN AKINS<span class="lab-hero-ordinal">/ 001</span></p>'+
 '<p class="lab-hero-kicker">OPERATIONS. ENGINEERING. RESEARCH.</p>'+
 '<h1>Build what matters.<br><em>Study what comes next.</em></h1>'+
 '<p class="lab-portfolio-statement">OPERATIONS &amp; TECHNOLOGY LEADERSHIP AT NONA NEUROPSYCHOLOGY.<br>INDEPENDENT SOFTWARE DEVELOPMENT &amp; RESEARCH ENGINEERING.</p>'+
 '<p class="lab-hero-deck">Improving real organizations and building independent software, while pursuing the mathematical and computational foundations of complex systems.</p>'+
 '<div class="lab-portfolio-actions">'+goto('work','Explore my work',true)+goto('experience','Enter the research lab')+'</div>'+
 '<p class="lab-hero-method"><span class="lab-hero-method-line" aria-hidden="true"></span>Documented work. Open questions. No manufactured signals.</p>'+
 '<noscript><nav class="lab-nojs" aria-label="Alternative navigation"><a href="/work/">Work</a><a href="/research/">Research</a><a href="/contact/">Contact</a></nav></noscript></div></section>'+
 '<section class="lab-focus" aria-label="Current work and professional focus"><div class="lab-focus-heading"><span>THE WORK / PRESENT</span><p>One practice. Three connected disciplines.</p></div>'+
 '<div class="lab-focus-grid">'+
 '<a class="lab-focus-card lab-focus-card--nona" href="/work/" data-one-go="work"><span class="lab-focus-number">01 / PRINCIPAL FOCUS</span><strong>Nona Neuropsychology</strong><p>Nonclinical operations, digital experience, and dependable systems supporting professional care.</p><span class="lab-focus-bottom">OPERATIONS &amp; TECHNOLOGY <b aria-hidden="true">↗</b></span></a>'+
 '<a class="lab-focus-card lab-focus-card--engineering" href="/work/" data-one-go="work"><span class="lab-focus-number">02 / ENGINEERING</span><strong>Independent development</strong><p>Open-source-oriented software, thoughtful architecture, resilient tools and practical product delivery.</p><span class="lab-focus-bottom">BUILDING &amp; SHIPPING <b aria-hidden="true">↗</b></span></a>'+
 '<a class="lab-focus-card lab-focus-card--research" href="/research/" data-one-go="experience"><span class="lab-focus-number">03 / RESEARCH DIRECTION</span><strong>Scientific computing</strong><p>Mathematics, physics, computational neuroscience and AI infrastructure—studied through reproducible models.</p><span class="lab-focus-bottom">INQUIRY &amp; EXPERIMENTS <b aria-hidden="true">↗</b></span></a>'+
 '</div></section>'+
 '<section class="lab-portfolio-selected" aria-label="Two primary destinations"><div class="lab-explore-heading"><div><span>SELECT A DIRECTION / 01—02</span><h2>Two paths. One practice.</h2></div><p>See what exists and is being delivered, or explore the questions and methods shaping what comes next.</p></div><div class="lab-destinations">'+destinationCards()+'</div></section>'+
 compactSignals()+'</div>');
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
      '</div><section class="lab-research-journal" aria-label="Fieldnotes and methods"><div class="lab-work-heading"><span>FIELDNOTES / IN CONTEXT</span><h2>The question is the beginning.</h2><p>Short, source-aware explanations accompany the interactive model rather than living behind a maze of pages.</p></div><div class="lab-research-notes"><details><summary>What does this curve actually demonstrate?</summary><p>A Lissajous curve shows the interaction of two periodic coordinates. Its geometry is determined by frequencies and phase; it is not a recording of neural activity or a validated neuroscience result.</p></details><details><summary>What counts as research evidence?</summary><p>Equations, assumptions and reproducible calculations explain a model. Observations, validation and independent review are separate requirements before scientific conclusions can be claimed.</p></details></div><a class="lab-text-link" href="/fieldnotes/" data-one-go="writing">Explore the full fieldnotes archive ↗</a></section><p class="lab-secondary-note">Sources: <a href="https://mathworld.wolfram.com/LissajousCurve.html" target="_blank" rel="noopener noreferrer">Lissajous curve definition</a> · <a href="https://doi.org/10.1113/jphysiol.1952.sp004764" target="_blank" rel="noopener noreferrer">Hodgkin & Huxley (1952)</a>. The latter is a study reference, not an implemented simulation.</p></div>');
  const projects=view('work',
    '<div class="lab-secondary lab-systems lab-work-hub"><div class="lab-section-intro">'+
    '<p class="lab-overline">WORK / THE PUBLIC RECORD</p><h1>Systems built for <em>real life.</em></h1>'+
    '<p>Operational leadership and independent software belong in the same conversation: define a real problem, design a durable system, and show the evidence of delivery.</p>'+
    '<div class="lab-status-pair"><span>NONCLINICAL OPERATIONS / SOFTWARE ENGINEERING</span><span>RELEASE STATUS LABELED PER PROJECT</span></div></div>'+
    '<section class="lab-work-feature" aria-labelledby="lab-work-feature-title"><div class="lab-work-feature-index">01 / PRINCIPAL WORK</div>'+
    '<div><h2 id="lab-work-feature-title">Nona Neuropsychology</h2><p>Leading nonclinical operations and technology improvements with a focus on administrative reliability, the referral experience and well-designed digital systems. Clinical decisions and patient information remain outside this public portfolio.</p>'+
    '<a class="lab-text-link" href="/work/operations/">Read the nonclinical operations case study ↗</a></div>'+
    '<div class="lab-work-feature-aside"><span>OPERATING DISCIPLINES</span><span>OPERATIONS</span><span>PRODUCT DESIGN</span><span>SECURE SYSTEMS</span></div></section>'+
    '<section class="lab-work-collection" aria-label="Independent software projects"><div class="lab-work-heading"><span>02 / SELECTED ENGINEERING</span><h2>Inspectable projects.</h2><p>Source links, stages and scope are reported individually—not invented as live activity.</p></div>'+projectCatalog()+'</section>'+
    '<section class="lab-work-method" aria-label="Engineering method"><div><span>03 / METHODOLOGY</span><h2>From problem to proof.</h2><p>Understand the work, make changes incrementally, test what matters and document what actually shipped.</p></div>'+
    '<ol><li><b>01</b><strong>Understand</strong><span>Define scope and constraints</span></li><li><b>02</b><strong>Build</strong><span>Create accessible, maintainable systems</span></li><li><b>03</b><strong>Verify</strong><span>Inspect code, tests and actual UI</span></li><li><b>04</b><strong>Document</strong><span>Link work to visible evidence</span></li></ol></section>'+
    '<div class="lab-work-resources"><a href="/systems/" data-one-go="systems">Detailed systems architecture ↗</a><a href="/portfolio/" data-one-go="portfolio">Selected practice and case studies ↗</a><a href="https://github.com/devonalanakins" target="_blank" rel="noopener noreferrer">Verified public GitHub history ↗</a></div>'+
    '<p class="lab-secondary-note">AI compute infrastructure and scientific acceleration remain research directions, not deployed products or established performance benchmarks.</p></div>');
  const systems=view('systems',
    '<div class="lab-secondary lab-systems"><div class="lab-section-intro"><p class="lab-overline">SYSTEMS / ENGINEERING PRACTICE</p>'+
    '<h1>Architecture for <em>independence.</em></h1><svg class="lab-architecture" viewBox="0 0 460 160" role="img" aria-labelledby="lab-architecture-title"><title id="lab-architecture-title">Public data passes from approved sources through a consent and privacy projection to the Worker API and browser. Private data stays outside the public projection.</title><g fill="#102a2e" stroke="#8cbfb1"><rect x="2" y="45" width="130" height="65" rx="4"/><rect x="165" y="45" width="130" height="65" rx="4"/><rect x="328" y="45" width="130" height="65" rx="4"/><path d="M132 77h33m130 0h33"/></g><g fill="#d8ebe4" font-size="12" font-family="sans-serif" text-anchor="middle"><text x="67" y="74">Approved sources</text><text x="230" y="74">Consent projection</text><text x="393" y="74">Worker → Browser</text><text x="230" y="95">Public fields only</text></g></svg><p>I build source-controlled systems with explicit data boundaries, observable behavior, and a path back when a change fails.</p></div>'+
    '<div class="lab-system-grid">'+
    studyCard('01','WEB PLATFORM','An inspectable edge','This website combines static pages with a Worker API. Public signals use narrowly scoped projections rather than exposing owner records.','EXISTING WEBSITE ARCHITECTURE')+
    studyCard('02','PERSONAL INFRASTRUCTURE','DevonStation','Owner-controlled software and private-first knowledge systems. Public descriptions stay separate from private records and services.','IN DEVELOPMENT')+
    studyCard('03','SOURCE INTEGRITY','Evidence before confidence','Versioned changes, automated checks and independent browser review make work inspectable. A passing test is evidence only for what it actually checks.','ENGINEERING PRACTICE')+
    studyCard('04','RESEARCH COMPUTING','Reproducible methods','Numerical correctness and documented assumptions come before performance claims. GPU benchmarks and scientific results remain proposed work.','RESEARCH DIRECTION')+
    '</div></div>');
  const portfolio=view('portfolio',project?renderLaboratoryCaseStudy(project):
    '<div class="lab-secondary lab-systems"><div class="lab-section-intro"><p class="lab-overline">PORTFOLIO / SELECTED PRACTICE</p>'+
    '<h1>Software that supports <em>real work.</em></h1><p>Independent development and practical operations, with public scope and project maturity made explicit.</p></div>'+
    '<div class="lab-system-grid">'+
    '<a class="lab-system-card" href="/work/operations/"><span>01 / NONCLINICAL OPERATIONS</span><h3>Nona Neuropsychology</h3><p>Service coordination, administrative workflows and digital experience. This public overview contains no clinical records or patient information.</p><small>PUBLIC OPERATIONS OVERVIEW ↗</small></a>'+
    '<a class="lab-system-card" href="/work/devonstation/"><span>02 / PERSONAL SOFTWARE</span><h3>DevonStation</h3><p>Independent tools and owner-controlled infrastructure, currently in development.</p><small>PUBLIC PROJECT OVERVIEW ↗</small></a>'+
    '<a class="lab-system-card" href="https://github.com/devonalanakins/devonakins.com" target="_blank" rel="noopener noreferrer"><span>03 / WEB ENGINEERING</span><h3>DevonAkins.com</h3><p>Personal portfolio, research exploration and consent-aware public presence.</p><small>INSPECT PUBLIC SOURCE ↗</small></a>'+
    '<a class="lab-system-card" href="https://github.com/devonalanakins/merit" target="_blank" rel="noopener noreferrer"><span>04 / SOFTWARE INTEGRITY</span><h3>Merit</h3><p>Experimental tools for evidence-based software review.</p><small>EXPERIMENTAL PUBLIC SOURCE ↗</small></a>'+
    '</div></div>');
  const activity=view('activity',listening?renderLaboratoryListening():
    '<div class="lab-secondary lab-activity"><div class="lab-section-intro">'+
      '<p class="lab-overline">ACTIVITY / WORK IN THE OPEN</p>'+
      '<h1>A visible record of <em>making.</em></h1>'+
      '<p>A dated record of public engineering changes. Explore the actual source, then follow the research and systems behind it.</p></div>'+
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
    '<section class="lab-data-panel lab-evidence-guide"><strong>SOURCE / INTEGRITY</strong>'+
    '<h2>Read the work, not a status light.</h2><p>Public commits and pull requests are dated evidence of changes, not proof of activity at this moment. Systems, research and project pages explain scope and maturity.</p>'+
    '<a class="lab-text-link" href="https://github.com/devonalanakins">Inspect the public GitHub profile ↗</a><a class="lab-text-link" href="/research/">Explore the research direction →</a>'+
    '</section></div></div></div>');
  const notes=view('writing',
    '<div class="lab-secondary lab-notes"><div class="lab-section-intro">'+
      '<p class="lab-overline">FIELDNOTES / PUBLIC WRITING</p><h1>Think rigorously.<br><em>Write clearly.</em></h1>'+
      '<p>Technical research notes, mathematical derivations, engineering reports, and original writing. Published results must remain distinguishable from hypotheses.</p></div>'+
    '<div class="lab-notes-grid">'+
    '<article class="lab-study"><span>01 / MATHEMATICAL NOTE</span><h3>A curve is not a measurement</h3><p>The Research instrument evaluates x = sin(a·t), y = sin(b·t + π/2) over 0 ≤ t ≤ 2π. Integer frequencies close the trajectory over that interval. Changing their ratio changes the geometry.</p><details><summary>Read the assumptions</summary><p>Each coordinate is bounded by −1 and 1 before display scaling. The path joins 301 samples with straight segments; it is a visual approximation of an analytic curve. It contains no neural recordings and cannot establish anything about a biological system.</p></details><small>ANALYTIC EXPLANATION · NOT AN EXPERIMENT</small></article>'+
    '<article class="lab-study"><span>02 / ENGINEERING NOTE</span><h3>What public evidence proves</h3><p>A timestamped GitHub event documents a public repository change. It does not establish current activity, research validation or the maturity of a project.</p><details><summary>Read the evidence boundary</summary><p>Unavailable sources remain unavailable. Playback metadata describes approved listening; decorative graphics are illustrations. Project maturity, test results and release status must each have their own evidence.</p></details><small>PUBLIC SOURCE INTERPRETATION</small></article>'+
    studyCard('03','ORIGINAL WRITING','Books & worlds','Long-form creative work remains part of my life, without defining the technical research specialization.','ONGOING CREATIVE WORK')+
    '</div><a class="lab-text-link" href="/work/writing/">Books and manuscripts overview ↗</a></div>');
  const contact=view('contact',
    '<div class="lab-secondary lab-contact"><div class="lab-section-intro">'+
      '<p class="lab-overline">CONTACT / DEVON ALAN AKINS</p><h1>Let’s discuss a <em>real problem.</em></h1>'+
      '<p>For open-source software, scientific computing, infrastructure engineering, technical collaboration or professional operations.</p>'+
      '<a class="lab-contact-email" href="mailto:hello@devonakins.com">hello@devonakins.com <span aria-hidden="true">↗</span></a>'+
      '<p class="lab-secondary-note">Do not send confidential medical, patient, employee or other protected information through this public contact route.</p></div>'+
      '<div class="lab-contact-social">'+renderHomeSocialHub()+
      '<a class="lab-text-link" href="mailto:hello@devonakins.com">Write to Devon ↗</a></div></div>');
  return '<!doctype html><html lang="en" class="one-html lab-html"><head>'+
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
    '<meta name="theme-color" content="#071013"><meta name="color-scheme" content="dark">'+
    '<meta name="description" content="'+escapeHtml(introduction)+'">'+
    '<meta property="og:type" content="website"><meta property="og:title" content="'+escapeHtml(pageTitle)+'">'+
    '<meta property="og:url" content="https://devonakins.com'+escapeHtml(canonicalPath)+'"><meta property="og:description" content="'+escapeHtml(introduction)+'">'+
    '<link rel="canonical" href="https://devonakins.com'+escapeHtml(canonicalPath)+'">'+(notFound?'<meta name="robots" content="noindex">':'')+
    '<link rel="icon" href="/favicon-32.png"><title>'+escapeHtml(pageTitle)+'</title>'+
    '<link rel="stylesheet" href="/src/professional/site.css">'+
    '<link rel="stylesheet" href="/src/professional/one-screen.css">'+
    '<link rel="stylesheet" href="/src/professional/social-presence.css">'+
    '<link rel="stylesheet" href="/src/professional/research-facility.css">'+
    '<link rel="stylesheet" href="/src/professional/research-portfolio.css">'+
    '<link rel="stylesheet" href="/src/professional/research-identity.css">'+
    '<script type="module" src="/src/professional/client.ts"></script>'+
    '<script type="module" src="/src/professional/one-screen.ts"></script>'+
    '<script type="module" src="/src/professional/research-facility.ts"></script>'+
    '<noscript><style>html.lab-html,body.lab-body{height:auto;overflow:auto}.lab-body .lab-stage{height:auto;overflow:visible}.lab-body .lab-stage>.lab-view[hidden]{display:block!important}.lab-body .lab-view{height:auto;min-height:100vh}.lab-body .lab-secondary{height:auto}.lab-tabs,.lab-motion,.lab-menu-toggle,.lab-desktop-menu{display:none!important}</style></noscript>'+
    '</head><body class="p-body one-body lab-body" data-lab-initial="'+initialView+'"'+(project||listening||notFound?' data-lab-native="true"':'')+'>'+
    '<a class="one-skip lab-skip" href="#one-stage">Skip to content</a>'+
    '<div class="lab-background" aria-hidden="true"><div class="lab-background-grid"></div>'+
    '<div class="lab-background-glow"></div></div>'+
    '<header class="lab-header"><a href="/" class="lab-brand" title="Devon Alan Akins home">'+atomMark()+'<span class="lab-brand-caption">DEVONAKINS.COM<small>THE COMPUTATIONAL LABORATORY</small></span></a>'+nav('desktop')+'<div class="lab-header-end"><a class="lab-header-contact" href="mailto:hello@devonakins.com">Contact ↗</a><button type="button" class="lab-desktop-menu" data-lab-menu-open aria-controls="lab-menu" aria-expanded="false" aria-label="DA / 001 — Open contact and motion menu">DA / 001</button></div><button type="button" class="lab-menu-toggle" data-lab-menu-open aria-controls="lab-menu" aria-expanded="false" aria-label="Open navigation menu"><span></span><span></span><span></span></button></header>'+
    '<dialog id="lab-menu" aria-labelledby="lab-menu-title"><div class="lab-menu-heading"><h2 id="lab-menu-title">Explore the laboratory</h2><button data-lab-menu-close aria-label="Close navigation menu">Close <span aria-hidden="true">×</span></button></div>'+nav('mobile')+'<button type="button" class="lab-motion" data-lab-motion aria-pressed="true">MOTION ON</button><a href="mailto:hello@devonakins.com">hello@devonakins.com</a></dialog>'+
    '<main id="one-stage" class="one-stage lab-stage" tabindex="-1">'+
    (notFound?view('home','<div class="lab-secondary"><div class="lab-section-intro"><p class="lab-overline">404 / WAYFINDING</p><h1>That page is <em>not here.</em></h1><p>Explore the public portfolio or return to the laboratory.</p><a class="lab-action" href="/">Return home →</a></div></div>'):home)+research+systems+projects+portfolio+activity+notes+contact+'</main>'+
    '<footer class="lab-footer"><div class="lab-footer-identity"><span>DA / 001</span><small>SCIENCE / SOFTWARE / SYSTEMS / EXPLORATION</small></div>'+renderSocialChannels(true)+'<div class="lab-footer-status"><span aria-hidden="true"></span>LABORATORY ONLINE<small>Website available · decorative research environment</small></div></footer>'+
    '</body></html>';
}

function renderLaboratoryCaseStudy(project){
  const p=project;
  const text=value=>escapeHtml(value||'');
  const source=p.url&&p.publication?.sourceLinkApproved===true?'<a class="lab-action" href="'+text(p.url)+'" target="_blank" rel="noopener noreferrer">Inspect public source →</a>':'';
  return '<article class="lab-secondary lab-case-study"><div class="lab-section-intro"><p class="lab-overline">PORTFOLIO / '+text(p.publication.category)+'</p><h1>'+text(p.title)+'</h1><p>'+text(p.summary)+'</p><div class="lab-portfolio-actions"><a class="lab-action lab-action-primary" href="/projects/">All public projects →</a>'+source+'</div></div><div class="lab-case-sections">'+
    '<section class="lab-study"><span>CONTEXT / PUBLIC SCOPE</span><h2>Purpose & context</h2><p>'+text(p.description)+'</p></section>'+
    '<section class="lab-study"><span>STATUS / '+text(p.publication.stage)+'</span><h2>What exists</h2><p>'+text(p.detail)+'</p><dl><dt>Role</dt><dd>'+text(p.role)+'</dd><dt>Current stage</dt><dd>'+text(p.status)+'</dd></dl></section>'+
    '<section class="lab-study"><span>BOUNDARIES / EVIDENCE</span><h2>What is not claimed</h2><p>'+text(p.boundary)+'</p></section>'+
    '<section class="lab-study"><span>NEXT / NOT A RELEASE CLAIM</span><h2>Next step</h2><p>'+text(p.next)+'</p></section></div></article>';
}
function renderLaboratoryListening(){
  return '<div class="lab-secondary"><div class="lab-section-intro"><p class="lab-overline">LISTENING / CONSENT-QUALIFIED SOURCE</p><h1>A soundtrack for <em>making.</em></h1><p>Only owner-approved playback is shown. Listening is separate from public engineering history; no audio autoplays here.</p></div><section class="lab-study" data-public-spotify data-spotify-presentation="listening"><h2 data-spotify-title>Checking approved playback</h2><p data-spotify-state role="status">Checking source</p><p data-spotify-artist></p><img data-spotify-cover alt="" width="96" height="96" referrerpolicy="no-referrer" loading="lazy" decoding="async" hidden><progress data-spotify-progress aria-label="Track playback progress" hidden></progress><p data-spotify-note></p><a data-spotify-link href="/listening/">Playback source →</a></section>'+listeningCollections()+'</div>';
}
