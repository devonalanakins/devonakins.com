/**
 * The Computational Laboratory — a source-honest, opt-in personal site candidate.
 * Deliberately separate from the production V4 and approved one-screen builds.
 * Mathematical figures are analytic, not measured experiments or live telemetry.
 */
import {FIELDNOTES} from './fieldnotes.mjs';
import {LABORATORY_HOME_TITLE, LABORATORY_ROUTES} from './laboratory-routes.mjs';
import {brandIcon} from './brand-icons.mjs';
import {renderNonaOperatingBrief} from './nona-operating-brief.mjs';
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
    (kind==='desktop'?'Primary navigation':'Mobile primary navigation')+'">'+
    '<div class="one-tablist" role="tablist" aria-label="Primary pages">'+
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
 ['work','Work','The software, responsibilities and original projects I am building.','work','M3 19V5h8l3 4h7v10H3 M7 14h10 M7 10h3'],
 ['experience','Research','Models, machines, independent learning—and the questions behind them.','research','M2 16q5-14 10-2t10-2 M2 20h20 M12 2v20'],
];
function destinationCards(){
 return destinations.map(([key,title,description,art,path],index)=>
 '<a class="lab-destination lab-destination--'+art+'" href="'+LABORATORY_ROUTES[key]+'" data-one-go="'+key+'" data-lab-destination="'+key+'">'+
 '<span class="lab-destination-index" aria-hidden="true">'+String(index+1).padStart(2,'0')+' / 02</span>'+
 '<span class="lab-card-print" aria-hidden="true">'+String(index+1).padStart(2,'0')+'</span>'+
 '<span class="lab-card-rule" aria-hidden="true"></span>'+
 '<svg class="lab-destination-glyph" viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="'+path+'" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>'+
 '<div class="lab-destination-copy"><strong>'+title+'</strong><small>'+description+'</small></div>'+
 '<span class="lab-destination-arrow" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M7 25L25 7M7 7h18v18" stroke="currentColor" stroke-width="1.5"/></svg></span></a>').join('');
}
function compactSignals(){return '<section class="lab-portfolio-signals" aria-label="Selected public sources">'+
 '<div class="lab-signals-label"><span class="lab-source-eyebrow">THE PUBLIC RECORD / 01</span><strong>Elsewhere.</strong><small>Source, changes and the occasional soundtrack.</small></div>'+
 '<div class="lab-portfolio-signal-grid">'+
 '<details class="lab-signal-tile lab-signal-github"><summary>'+brandIcon('github')+'<span><strong>Source &amp; changes</strong><small data-github-compact>Checking dated public history</small></span></summary><div class="lab-signal-expanded">'+feed('one-home-github',3)+'<button data-one-go="activity">Explore public record →</button></div></details>'+
 '<details class="lab-signal-tile lab-signal-apple" data-public-apple-listening><summary><span class="lab-apple-glyph" aria-hidden="true">♫</span><span><strong>Apple Music</strong><small data-apple-listening-title>Listening is private</small></span></summary><div class="lab-signal-expanded lab-apple-detail"><span class="lab-apple-state" data-apple-listening-state role="status">NOT SHARED</span><p data-apple-listening-detail>Only owner-approved reports appear here.</p><p data-apple-listening-note>No audio streams on this site.</p><a data-apple-listening-link hidden>Open in Apple Music ↗</a><a href="/listening/">The listening room →</a></div></details>'+
 '</div></section>'}
/** Render this personal photograph only when its original, owner-approved
 * first-party image is actually packaged. Never invent a portrait or fetch one
 * from a third-party host. */
function portraitIntroduction(){return '<section class="lab-personal" aria-labelledby="lab-personal-title">'+
 '<div class="lab-personal-inner">'+
 '<figure class="lab-personal-portrait"><img src="/professional/devon-portrait.avif" width="420" height="560" alt="Devon outdoors wearing a backward dark cap and a gray graphic hoodie with green trim" loading="lazy" decoding="async">'+
 '<figcaption><span>IN PERSON</span><span>2026</span></figcaption></figure>'+
 '<div class="lab-personal-story"><p class="lab-personal-eyebrow">ABOUT ME</p>'+
 '<h2 id="lab-personal-title">Father. Builder. Writer.</h2>'+
 '<p>I lead nonclinical operations and technology at Nona Neuropsychology. I also develop independent software and study the mathematics and science of complex systems.</p>'+
 '<div class="lab-personal-rule" aria-hidden="true"></div>'+
 '<p>Away from the screen: fatherhood, writing, hands-on projects, and the questions that make lifelong learning worthwhile.</p>'+
 '<div class="lab-personal-links"><a href="https://github.com/devonalanakins" target="_blank" rel="noopener noreferrer">GitHub ↗︎</a><a href="mailto:hello@devonakins.com">Get in touch ↗︎</a></div></div>'+
 '<aside class="lab-personal-aside" aria-label="Professional and personal focus"><div><span>NOW / PRACTICE</span><p>Nonclinical operations &amp; technology</p></div><div><span>ALWAYS / APPROACH</span><p>Curiosity, experimentation, craft</p></div></aside>'+
 '</div></section>'}
function projectCatalog(){
  const categories=[...new Set(approvedPublicProjects.map(project=>project.publication.category))];
  const stages={maintained:'Active / maintained',experimental:'Experimental','reviewed-prototype':'Prototype',research:'Research concept',draft:'Draft',archived:'Archived'};
  return '<div class="lab-project-browser"><label for="lab-project-search">Search public projects</label><input type="search" id="lab-project-search" data-lab-project-search placeholder="Search by name or area">'+
    '<div class="lab-project-filters"><label>Area<select data-lab-project-filter><option value="all">All areas</option>'+
    categories.map(category=>'<option>'+escapeHtml(category)+'</option>').join('')+'</select></label>'+
    '<label>Stage<select data-lab-project-stage><option value="all">All stages</option>'+
    Object.entries(stages).map(([stage,label])=>'<option value="'+stage+'">'+label+'</option>').join('')+'</select></label></div>'+
    '<p role="status" data-lab-project-count>'+approvedPublicProjects.length+' public projects</p><div class="lab-system-grid">'+
    approvedPublicProjects.map(project=>'<a class="lab-system-card" data-lab-project data-category="'+escapeHtml(project.publication.category)+
      '" data-stage="'+escapeHtml(project.publication.stage)+'" href="/work/'+project.slug+'/"><span>'+escapeHtml(project.publication.category)+' / '+
      escapeHtml(stages[project.publication.stage]??project.publication.stage)+'</span><h3>'+escapeHtml(project.title)+'</h3><p>'+escapeHtml(project.summary)+
      '</p><small>'+escapeHtml(project.status)+' · PUBLIC OVERVIEW →</small></a>').join('')+'</div></div>';
}
function renderFieldnote(note){
  return '<article class="lab-secondary lab-reading"><div class="lab-section-intro"><p class="lab-overline">'+escapeHtml(note.kind)+
    ' / <a href="/fieldnotes/">Writing</a></p><h1>'+escapeHtml(note.title)+'</h1><p>'+escapeHtml(note.summary)+'</p></div>'+
    '<div class="lab-reading-body">'+note.body.map(([heading,paragraph])=>'<section><h2>'+escapeHtml(heading)+'</h2><p>'+escapeHtml(paragraph)+'</p></section>').join('')+
    '<nav aria-label="Fieldnote references"><ul>'+note.links.map(([url,label])=>'<li><a href="'+escapeHtml(url)+'">'+escapeHtml(label)+'</a></li>').join('')+'</ul></nav></div></article>';
}
export function renderResearchFacilityHome({initialView='home',canonicalPath='/',project=null,listening=false,notFound=false,portraitAvailable=false}={}){
  if(project&&!approvedPublicProjects.includes(project))throw new Error('Project publication is not approved');
  if(typeof portraitAvailable!=='boolean')throw new TypeError('Portrait publication gate must be a boolean');
  if(!Object.hasOwn(LABORATORY_ROUTES,initialView))throw new Error('Unknown cinematic view');
  const fieldnote=Object.hasOwn(FIELDNOTES,canonicalPath)?FIELDNOTES[canonicalPath]:null;
  const view=(key,content)=>renderView(key,content,initialView);
  const nav=kind=>renderNavigation(kind,initialView);
  const pageTitle=fieldnote?fieldnote.title+' — Devon Alan Akins':project?project.title+' — Devon Alan Akins':notFound?'Page not found — Devon Alan Akins':listening?'Listening — Devon Alan Akins':initialView==='home'?LABORATORY_HOME_TITLE:sections.find(([key])=>key===initialView)[1]+' — Devon Alan Akins';
  const introductions={home:'Devon Alan Akins builds software for the web and Apple platforms, writes, studies mathematics and physics, and is developing a long-form podcast. He also leads nonclinical operations and technology at Nona Neuropsychology.',experience:'Interactive mathematical models, scientific questions, assumptions and citations from Devon Alan Akins.',systems:'Documented software architecture, privacy boundaries and independent infrastructure engineering.',work:'Explore approved public software projects, source links, categories and honest implementation status.',portfolio:'Selected software and nonclinical professional operations, including operational and digital-experience work for Nona Neuropsychology.',activity:'Dated public engineering changes, with source provenance and clear project boundaries.',writing:'Mathematical explanations, engineering notes, original writing and books in development.',contact:'Contact Devon Alan Akins about nonclinical operations, independent software development, and research computing. Do not send protected information.'};
  const introduction=fieldnote?fieldnote.summary:project?project.summary:listening?'Owner-reported Apple Music and Ambient Music updates, with freshness limits, private-source controls and no audio rebroadcast.':notFound?'This page is unavailable. Explore Devon Alan Akins’s public software and research portfolio.':introductions[initialView];
  const home=view('home',
 '<div class="lab-overview lab-portfolio-layout">'+
 '<section class="lab-portfolio-hero" aria-label="Personal introduction and current professional focus">'+
 '<div class="lab-portfolio-hero-content"><p class="lab-hero-name">INDEPENDENT SOFTWARE DEVELOPER · WRITER</p>'+
 '<h1 class="da-name">Devon<br>Alan Akins<span>.</span></h1>'+
 '<p class="lab-hero-deck">I build software, write, learn things, and talk to interesting people.</p>'+
 '<p class="lab-portfolio-statement">I also lead nonclinical operations and technology at Nona Neuropsychology.</p>'+
 '<div class="lab-portfolio-actions">'+goto('work','Explore the work',true)+goto('experience','Explore research')+'<a class="lab-action" href="/podcast/">Podcast <span aria-hidden="true">→</span></a></div></div></section>'+
 (portraitAvailable?portraitIntroduction():'')+
 '<section class="lab-focus" aria-label="Current work"><div class="lab-focus-heading"><span>WHAT I DO</span><p>Professional responsibility. Independent work. Original ideas.</p></div><div class="lab-focus-grid">'+
 '<a class="lab-focus-card lab-focus-card--nona" href="/work/operations/"><span class="lab-focus-number">01 / NONCLINICAL OPERATIONS</span><strong>Nona Neuropsychology</strong><p>I lead nonclinical operations and technology supporting reliable, professional care.</p><span class="lab-focus-bottom">OPERATIONS &amp; TECHNOLOGY <b aria-hidden="true">→</b></span></a>'+
 '<a class="lab-focus-card lab-focus-card--engineering" href="/work/"><span class="lab-focus-number">02 / INDEPENDENT ENGINEERING</span><strong>Software with a purpose</strong><p>Web and Apple platform development, engineering integrity, language experiments and audio.</p><span class="lab-focus-bottom">PROJECTS &amp; SOURCE <b aria-hidden="true">→</b></span></a>'+
 '<a class="lab-focus-card lab-focus-card--research" href="/work/anevum/"><span class="lab-focus-number">03 / OPEN EDUCATION</span><strong>ANEVUM Open Institute</strong><p>Free STEM learning and practical scientific inquiry, beginning with a hands-on engineering curriculum prototype.</p><span class="lab-focus-bottom">EDUCATION &amp; RESEARCH <b aria-hidden="true">→</b></span></a>'+
 '</div></section>'+
 '<section class="lab-portfolio-selected" aria-label="Two primary destinations"><div class="lab-explore-heading"><div><span>KEEP GOING</span><h2>What exists.<br>What comes next.</h2></div><p>The work has a source. The ambition has a direction.</p></div><div class="lab-destinations">'+destinationCards()+'</div></section>'+
 '<nav class="lab-editorial-links" aria-label="More from Devon"><a href="/fieldnotes/"><strong>Writing</strong><span>Essays, books and manuscripts</span></a><a href="/podcast/"><strong>Podcast</strong><span>Interviews and occasional solo episodes</span></a><a href="/courses/"><strong>Courses</strong><span>Mathematical physics and simulation lessons in development</span></a><a href="/setup/"><strong>My Setup</strong><span>Recording, editing and research gear</span></a></nav>'+
 compactSignals()+'</div>');
  const research=view('experience',
    '<div class="lab-secondary lab-research da-research">'+
    '<div class="lab-section-intro"><p class="lab-overline">RESEARCH &amp; DIRECTION</p><h1>Build the means<br>to <em>investigate.</em></h1>'+
    '<p>My interests connect mathematics, physics, intelligence and the machines we use to study them. Here is the direction I am pursuing—and where it connects to work you can inspect.</p></div>'+
    '<section class="da-directions" aria-label="Owner-described research directions">'+
    '<article class="da-direction"><span>01 / MODELS &amp; MACHINES</span><h2>Own the model.<br>Understand the machine.</h2><p>I’m studying how GPU architecture, memory and software affect local model training and inference. The longer-term goal is independent research infrastructure. The Blackwell Lab setup documents the hardware I’m considering.</p><small>Research direction · <a href="/setup/#lab">Blackwell Lab build notes</a></small></article>'+
    '<article class="da-direction"><span>02 / OPEN LEARNING</span><h2>Anevum<br>Open Institute.</h2><p>An independent, free-to-learn STEM initiative spanning AI, computing infrastructure, neuroscience, physics and mathematics. A draft Academy and interactive electronics lessons exist as a source-level preview; the wider institute remains in development.</p><small>Prototype curriculum · not an operating or accredited institution.</small></article>'+
    '<article class="da-direction"><span>03 / MATHEMATICS &amp; PHYSICS</span><h2>Follow the question<br>past the interface.</h2><p>Mathematics, theoretical physics, scientific computing and computational neuroscience are enduring interests. I want the explanations and the underlying mechanisms—not only the output of a tool.</p><small>Study interests · no new scientific discovery or validated biological model is claimed.</small></article>'+
    '</section>'+
    '<section class="da-investigations" aria-label="Research connected to inspectable engineering"><div class="lab-work-heading"><span>QUESTIONS WITH SOURCE</span><h2>Where inquiry meets code.</h2></div>'+
    '<article class="da-investigation"><div><span>RHEN / LANGUAGE RESEARCH</span><h3>Can a small language preserve meaning across targets?</h3><p>The M0 draft contains a narrow parser, a versioned intermediate representation and JavaScript/Python emitters. It is an experiment in explicit language structure, not a universal compiler.</p></div><a href="https://github.com/devonalanakins/rhen/pull/1" target="_blank" rel="noopener noreferrer">Inspect the draft →</a><small>Draft PR #1 · unmerged</small></article>'+
    '<article class="da-investigation"><div><span>MERIT / ENGINEERING INTEGRITY</span><h3>What does a passing check actually prove?</h3><p>Merit checks contracts and review receipts, rejects missing evidence and distinguishes a source claim from a production observation. Its assessment code is public; human release authority remains separate.</p></div><a href="https://github.com/devonalanakins/merit/blob/main/lib/assess.mjs" target="_blank" rel="noopener noreferrer">Read the assessment code →</a><small>Published source · development toolkit</small></article>'+
    '</section>'+
    '<section class="lab-research-journal" aria-label="Earlier mathematical notebook"><div class="lab-work-heading"><span>NOTEBOOK</span><h2>A small mathematical study.</h2><p>An earlier browser demonstration, kept as a sketch—not a substitute for the research above.</p></div>'+
    '<details class="da-sketch"><summary>Open the periodic-signal sketch <span aria-hidden="true">+</span></summary><div class="lab-research-instrument">'+instrument('lab-field-research',true)+
    '<div class="lab-controls"><div class="lab-control"><label for="lab-axis-a">X frequency <output for="lab-axis-a" data-lab-value="a">3</output></label><input id="lab-axis-a" type="range" min="1" max="6" step="1" value="3" data-lab-axis="a"></div>'+
    '<div class="lab-control"><label for="lab-axis-b">Y frequency <output for="lab-axis-b" data-lab-value="b">4</output></label><input id="lab-axis-b" type="range" min="1" max="6" step="1" value="4" data-lab-axis="b"></div>'+
    '<p role="status" data-lab-model-caption>Analytic Lissajous model: a = 3, b = 4, phase = π/2. Calculated locally.</p>'+
    '<p>The plot samples x = sin(at) and y = sin(bt + π/2) at 301 points on 0 ≤ t ≤ 2π. Integer frequencies ensure the curve closes. Try a = b = 1, then hold a fixed and change b. <a href="https://mathworld.wolfram.com/LissajousCurve.html" target="_blank" rel="noopener noreferrer">Definition and equations →</a> · <a href="/fieldnotes/">Read the mathematical note →</a></p></div></div></details></section></div>');
  const projects=view('work',
    '<div class="lab-secondary lab-systems lab-work-hub"><div class="lab-section-intro"><p class="lab-overline">WORK</p><h1>Made for<br><em>real use.</em></h1><p>I lead nonclinical operations and build software, from released systems to focused experiments. Every project has its own scope, constraints and current state.</p></div>'+
    '<section class="lab-work-feature" aria-labelledby="lab-work-feature-title"><div class="lab-work-feature-index">CURRENT PROFESSIONAL FOCUS</div><div><h2 id="lab-work-feature-title">Nona<br>Neuropsychology</h2><p>I lead nonclinical operations and technology, with a focus on improving administrative reliability, referral coordination and digital systems. Clinical decisions remain with licensed professionals.</p><a class="lab-text-link" href="/work/operations/">Explore the public operations overview →</a></div><div class="lab-work-feature-aside"><span>EXECUTIVE / NONCLINICAL</span><span>Operations</span><span>Technology</span><span>Digital experience</span></div></section>'+
    '<section class="da-selected" aria-label="Selected engineering evidence"><div class="lab-work-heading"><span>SELECTED ENGINEERING</span><h2>Different problems.<br>The same ownership.</h2></div>'+
    '<article class="da-feature-project"><div><span>01 / ENGINEERING INTEGRITY</span><h3>Merit</h3><p>Software that challenges the evidence behind a software claim. Contracts, review receipts and a bounded read-only GitHub inspector.</p><small>Source-only toolkit · under development</small><a href="/work/merit/">Project &amp; evidence →</a></div><ol class="da-process" aria-label="Merit assessment structure"><li>Define the contract</li><li>Check the evidence</li><li>Retain human review</li></ol></article>'+
    '<article class="da-feature-project"><div><span>02 / PRODUCTION WEB ENGINEERING</span><h3>DevonAkins.com</h3><p>This portfolio is an inspectable Cloudflare Worker application with protected public/private data boundaries, pinned browser checks and exact-commit releases.</p><small>Live personal website · deployment verified November 2026</small><a href="https://github.com/devonalanakins/devonakins.com/actions/runs/44384435946" target="_blank" rel="noopener noreferrer">Review the successful release →</a></div><ol class="da-process" aria-label="Website release evidence"><li>Build a working product</li><li>Test Chromium and WebKit</li><li>Deploy and verify the exact commit</li></ol></article>'+
    '<article class="da-feature-project" id="apple-development"><div><span>03 / APPLE DEVELOPMENT</span><h3>Native interfaces</h3><p>I build for Apple platforms with an interest in useful, privacy-conscious interfaces. The archived IREN iOS client explores SwiftUI, widgets and Live Activities.</p><small>Historical source · archived client, not a current release</small><a href="https://github.com/devonalanakins/anevum-web/tree/main/native/iren-ios" target="_blank" rel="noopener noreferrer">Inspect the archived source →</a></div><ol class="da-process" aria-label="Apple development approach"><li>Design for the device</li><li>Protect personal data</li><li>Verify before release</li></ol></article></section>'+
    '<section class="lab-work-collection" aria-label="All public project overviews"><div class="lab-work-heading"><span>THE FULL INDEX</span><h2>Work in its own context.</h2><p>Software, professional operations, research prototypes and writing, each with recorded scope and status.</p></div>'+projectCatalog()+'</section>'+
    '<section class="lab-work-method" aria-label="Working approach"><div><span>HOW I WORK</span><h2>Stay close<br>to the problem.</h2></div><ol><li><b>01</b><strong>Understand</strong><span>The person, the problem and the constraints.</span></li><li><b>02</b><strong>Build</strong><span>A useful, inspectable implementation.</span></li><li><b>03</b><strong>Challenge</strong><span>Test the behavior and its failure cases.</span></li><li><b>04</b><strong>Finish</strong><span>Verify the release and keep a way back.</span></li></ol></section></div>');
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
    '<div class="lab-secondary lab-systems"><div class="lab-section-intro"><p class="lab-overline">ABOUT / SELECTED PRACTICE</p>'+
    '<h1>About <em>Devon.</em></h1><p>I’m an independent developer working across the web and Apple platforms, an author, and founder of ANEVUM. At Nona Neuropsychology I lead nonclinical operations and technology. Away from that work, I study mathematics and physics, build software, and write fiction.</p></div>'+
    '<div class="lab-system-grid">'+
    '<a class="lab-system-card" href="/work/operations/"><span>01 / NONCLINICAL OPERATIONS</span><h3>Nona Neuropsychology</h3><p>Service coordination, administrative workflows and digital experience. This public overview contains no clinical records or patient information.</p><small>PUBLIC OPERATIONS OVERVIEW ↗︎</small></a>'+
    '<a class="lab-system-card" href="/work/devonstation/"><span>02 / PERSONAL SOFTWARE</span><h3>DevonStation</h3><p>Independent tools and owner-controlled infrastructure, currently in development.</p><small>PUBLIC PROJECT OVERVIEW ↗︎</small></a>'+
    '<a class="lab-system-card" href="https://github.com/devonalanakins/devonakins.com" target="_blank" rel="noopener noreferrer"><span>03 / WEB ENGINEERING</span><h3>DevonAkins.com</h3><p>Personal portfolio, research exploration and consent-aware public presence.</p><small>INSPECT PUBLIC SOURCE ↗︎</small></a>'+
    '<a class="lab-system-card" href="https://github.com/devonalanakins/merit" target="_blank" rel="noopener noreferrer"><span>04 / SOFTWARE INTEGRITY</span><h3>Merit</h3><p>Experimental tools for evidence-based software review.</p><small>EXPERIMENTAL PUBLIC SOURCE ↗︎</small></a>'+
    '</div></div>');
  const activity=view('activity',listening?renderLaboratoryListening():
    '<div class="lab-secondary lab-activity"><div class="lab-section-intro">'+
      '<p class="lab-overline">ACTIVITY / WORK IN THE OPEN</p>'+
      '<h1>A visible record of <em>making.</em></h1>'+
      '<p>A dated record of public engineering changes. Explore the actual source, then follow the research and systems behind it.</p></div>'+
    '<div class="lab-activity-grid">'+
    '<section class="lab-data-panel"><div class="lab-data-title"><strong>GITHUB / PUBLIC HISTORY</strong>'+
    '<a href="https://github.com/devonalanakins" target="_blank" rel="noopener noreferrer">OPEN GITHUB ↗︎</a></div>'+
    '<div class="lab-activity-filters" role="group" aria-label="Filter GitHub activity">'+
    '<button type="button" data-github-filter="all" aria-pressed="true">All</button>'+
    '<button type="button" data-github-filter="push" aria-pressed="false">Pushes</button>'+
    '<button type="button" data-github-filter="pull_request" aria-pressed="false">PRs</button>'+
    '<button type="button" data-github-refresh>Refresh</button></div>'+
    feed('one-activity-github',6)+'</section>'+
    '<div class="lab-activity-side">'+
    '<section class="lab-data-panel lab-evidence-guide"><strong>SOURCE / INTEGRITY</strong>'+
    '<h2>Read the work, not a status light.</h2><p>Public commits and pull requests are dated evidence of changes, not proof of activity at this moment. Systems, research and project pages explain scope and maturity.</p>'+
    '<a class="lab-text-link" href="https://github.com/devonalanakins">Inspect the public GitHub profile ↗︎</a><a class="lab-text-link" href="/research/">Explore the research direction →</a>'+
    '</section></div></div></div>');
  const notes=view('writing',fieldnote?renderFieldnote(fieldnote):
    '<div class="lab-secondary lab-notes"><div class="lab-section-intro">'+
      '<p class="lab-overline">FIELDNOTES / PUBLIC WRITING</p><h1>Writing.</h1>'+
      '<p>Mathematical notes, engineering essays, and the fiction and manuscripts I’m working on.</p></div>'+
    '<div class="lab-notes-grid">'+
    Object.entries(FIELDNOTES).map(([path,note])=>'<article class="lab-study"><span>'+escapeHtml(note.kind)+'</span><h2>'+escapeHtml(note.title)+
      '</h2><p>'+escapeHtml(note.summary)+'</p><a class="lab-text-link" href="'+path+'">Read the fieldnote →</a></article>').join('')+
    studyCard('03','ORIGINAL WRITING','Books & manuscripts','A previously published book is in revision. New fiction and manuscripts are in development.','REVISION & DRAFTS')+
    '</div><a class="lab-text-link" href="/work/writing/">Books and manuscripts overview ↗︎</a></div>');
  const contact=view('contact',
    '<div class="lab-secondary lab-contact"><div class="lab-section-intro">'+
      '<p class="lab-overline">CONTACT / DEVON ALAN AKINS</p><h1>Get in <em>touch.</em></h1>'+
      '<p>For software and research collaborations, writing, podcast conversations, and business operations.</p>'+
      '<a class="lab-contact-email" href="mailto:hello@devonakins.com">hello@devonakins.com <span aria-hidden="true">↗︎</span></a>'+
      '<p class="lab-secondary-note">For appointments, referrals or clinical questions, contact Nona Neuropsychology through its practice channels. Please keep medical and other confidential information out of this inbox.</p></div>'+
      '<div class="lab-contact-social">'+renderHomeSocialHub()+
      '<a class="lab-text-link" href="mailto:hello@devonakins.com">Write to Devon ↗︎</a></div></div>');
  const appearanceControl='<label class="lab-appearance"><span>Appearance</span><select data-lab-theme-select aria-label="Color theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>';
  return '<!doctype html><html lang="en" class="one-html lab-html"><head>'+
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
    '<meta name="theme-color" content="#f3f1e9"><meta name="color-scheme" content="light dark">'+
     '<script src="/laboratory-theme.js"></script>'+
    '<meta name="description" content="'+escapeHtml(introduction)+'">'+
    '<meta property="og:type" content="website"><meta property="og:title" content="'+escapeHtml(pageTitle)+'">'+
    '<meta property="og:url" content="https://devonakins.com'+escapeHtml(canonicalPath)+'"><meta property="og:description" content="'+escapeHtml(introduction)+'">'+
    '<meta property="og:image" content="https://devonakins.com/social-card.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'+
    '<meta property="og:image:alt" content="Devon Alan Akins, independent software developer and writer">'+
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+escapeHtml(pageTitle)+'">'+
    '<meta name="twitter:description" content="'+escapeHtml(introduction)+'"><meta name="twitter:image" content="https://devonakins.com/social-card.jpg">'+
    '<link rel="canonical" href="https://devonakins.com'+escapeHtml(canonicalPath)+'">'+(notFound?'<meta name="robots" content="noindex">':'')+
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">'+
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/manifest.webmanifest">'+
    '<title>'+escapeHtml(pageTitle)+'</title>'+
    '<link rel="stylesheet" href="/src/professional/site.css">'+
    '<link rel="stylesheet" href="/src/professional/one-screen.css">'+
    '<link rel="stylesheet" href="/src/professional/social-presence.css">'+
    '<link rel="stylesheet" href="/src/professional/research-facility.css">'+
    '<link rel="stylesheet" href="/src/professional/research-portfolio.css">'+
    '<link rel="stylesheet" href="/src/professional/research-studio.css">'+
    '<link rel="stylesheet" href="/src/professional/apple-listening.css">'+
     '<link rel="stylesheet" href="/src/professional/research-theme.css">'+
    '<script type="module" src="/src/professional/client.ts"></script>'+
    '<script type="module" src="/src/professional/one-screen.ts"></script>'+
    '<script type="module" src="/src/professional/research-facility.ts"></script>'+ 
    '<script type="module" src="/src/professional/apple-listening-client.ts"></script>'+
    '<noscript><style>html.lab-html,body.lab-body{height:auto;overflow:auto}.lab-body .lab-stage{height:auto;overflow:visible}.lab-body .lab-stage>.lab-view[hidden]{display:block!important}.lab-body .lab-view{height:auto;min-height:100vh}.lab-body .lab-secondary{height:auto}.lab-tabs,.lab-motion,.lab-menu-toggle,.lab-desktop-menu{display:none!important}</style></noscript>'+
    '</head><body class="p-body one-body lab-body" data-lab-initial="'+initialView+'"'+(project||fieldnote||listening||notFound?' data-lab-native="true"':'')+'>'+
    '<a class="one-skip lab-skip" href="#one-stage">Skip to content</a>'+
    '<div class="lab-background" aria-hidden="true"><div class="lab-background-grid"></div>'+
    '<div class="lab-background-glow"></div></div>'+
    '<header class="lab-header"><a href="/" class="lab-brand" title="Devon Alan Akins home"><span class="da-monogram" aria-hidden="true">da.</span><span class="lab-brand-caption">DEVONAKINS.COM<small>INDEPENDENT / PERSONAL</small></span></a>'+nav('desktop')+'<div class="lab-header-end">'+appearanceControl+'<a class="lab-header-contact" href="/podcast/">Podcast ↗︎</a><a class="lab-header-contact" href="mailto:hello@devonakins.com">Contact ↗︎</a><button type="button" class="lab-desktop-menu" data-lab-menu-open aria-controls="lab-menu" aria-expanded="false" aria-label="Open contact and motion menu">Menu</button></div><button type="button" class="lab-menu-toggle" data-lab-menu-open aria-controls="lab-menu" aria-expanded="false" aria-label="Open navigation menu"><span></span><span></span><span></span></button></header>'+
    '<dialog id="lab-menu" aria-labelledby="lab-menu-title"><div class="lab-menu-heading"><h2 id="lab-menu-title">Explore</h2><button data-lab-menu-close aria-label="Close navigation menu">Close <span aria-hidden="true">×</span></button></div>'+nav('mobile')+'<div class="lab-creator-menu-links"><a href="/fieldnotes/">Writing</a><a href="/podcast/">Podcast</a><a href="/courses/">Courses</a><a href="/setup/">My Setup</a><a href="/about/">About</a><a href="/contact/">Contact</a></div>'+appearanceControl+'<button type="button" class="lab-motion" data-lab-motion aria-pressed="true">MOTION ON</button><a href="mailto:hello@devonakins.com">hello@devonakins.com</a></dialog>'+
    '<main id="one-stage" class="one-stage lab-stage" tabindex="-1">'+
    (notFound?view('home','<div class="lab-secondary"><div class="lab-section-intro"><p class="lab-overline">404 / WAYFINDING</p><h1>That page is <em>not here.</em></h1><p>Explore the work or return to the homepage.</p><a class="lab-action" href="/">Return home →</a></div></div>'):home)+research+systems+projects+portfolio+activity+notes+contact+'</main>'+
    '<footer class="lab-footer"><div class="lab-footer-identity"><span>Devon Alan Akins</span><small>SCIENCE / SOFTWARE / SYSTEMS / EXPLORATION</small></div>'+renderSocialChannels(true)+'<div class="lab-footer-status"><span aria-hidden="true"></span>DEVON ALAN AKINS<small>Independent software, inquiry &amp; original work</small></div></footer>'+
    '</body></html>';
}

function renderLaboratoryCaseStudy(project){
  const p=project;
  const text=value=>escapeHtml(value||'');
  const source=p.url&&p.publication?.sourceLinkApproved===true?'<a class="lab-action" href="'+text(p.url)+'" target="_blank" rel="noopener noreferrer">Inspect public source →</a>':'';
  const nonaBrief=p.slug==='operations'?renderNonaOperatingBrief():'';
  return '<article class="lab-secondary lab-case-study"><div class="lab-section-intro"><p class="lab-overline">PORTFOLIO / '+text(p.publication.category)+'</p><h1>'+text(p.title)+'</h1><p>'+text(p.summary)+'</p><div class="lab-portfolio-actions"><a class="lab-action lab-action-primary" href="/projects/">All public projects →</a>'+source+'</div></div><div class="lab-case-sections">'+
    '<section class="lab-study"><span>CONTEXT / PUBLIC SCOPE</span><h2>Purpose & context</h2><p>'+text(p.description)+'</p></section>'+
    '<section class="lab-study"><span>STATUS / '+text(p.publication.stage)+'</span><h2>What exists</h2><p>'+text(p.detail)+'</p><dl><dt>Role</dt><dd>'+text(p.role)+'</dd><dt>Current stage</dt><dd>'+text(p.status)+'</dd></dl></section>'+
    '<section class="lab-study"><span>BOUNDARIES / EVIDENCE</span><h2>What is not claimed</h2><p>'+text(p.boundary)+'</p></section>'+
    '<section class="lab-study"><span>NEXT / NOT A RELEASE CLAIM</span><h2>Next step</h2><p>'+text(p.next)+'</p></section></div>'+nonaBrief+'</article>';
}
function renderLaboratoryListening(){
  return '<div class="lab-secondary"><div class="lab-section-intro"><p class="lab-overline">LISTENING / OWNER-REPORTED SIGNAL</p><h1>A soundtrack for <em>making.</em></h1><p>Apple Music and Ambient Music on my iPhone. Only the listening updates I choose to share appear here; reports expire quickly and no audio is rebroadcast.</p></div>'+ 
    '<section class="lab-apple-listening-page" data-public-apple-listening aria-labelledby="lab-apple-heading"><div class="lab-apple-header"><span class="lab-apple-glyph" aria-hidden="true">♫</span><h2 id="lab-apple-heading" data-apple-listening-title>Listening is private</h2></div><div class="lab-apple-detail"><span class="lab-apple-state" data-apple-listening-state role="status">NOT SHARED</span><p data-apple-listening-detail>Only approved updates from my iPhone appear here.</p><p data-apple-listening-note>No music audio or listening history is shared.</p><a data-apple-listening-link hidden>Open in Apple Music ↗</a></div><p class="lab-apple-disclosure">This is a recent owner report, not automatic observation of everything playing on an iPhone. Ambient mode is labeled only when I explicitly choose to report it.</p></section></div>';
}
