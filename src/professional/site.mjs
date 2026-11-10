import {approvedPublicProjects} from "../publication-manifest.mjs";
import {spotifyCard,workSignalCard,gptSignalCard,threadsSignalCard,signalDeck,listeningCollections} from "./signal-cards.mjs";
import {brandIcon} from "./brand-icons.mjs";

const esc = value => String(value ?? "").replace(/[&<>"']/g,
  c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pages = Object.freeze({
  home: ["Home", "Business operations, technology and independent software engineering"],
  experience: ["Experience & résumé", "Experience, capabilities, education and current professional focus"],
  work: ["Selected work", "Curated operational and technical work with honest project status"],
  activity: ["GitHub activity", "Recent public GitHub events across repositories, independent of featured projects"],
  writing: ["Writing & perspective", "Books, research and systems thinking"],
  about: ["About", "Background and approach"],
  contact: ["Contact", "Professional contact"],
  listening: ["Listening", "Owner-approved Spotify playback and selected public playlists"],
  gpt: ["GPT usage", "Owner-captured public GPT metrics, with their original dates and units"],
});
const route = Object.freeze({
  home:"/",experience:"/experience/",work:"/work/",activity:"/activity/",
  writing:"/writing/",about:"/about/",contact:"/contact/",
  listening:"/listening/",gpt:"/gpt/",
});
const symbol = {
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 18l9 5 9-5"/>',
  code:'<path d="m8 5-6 7 6 7m8-14 6 7-6 7m-2-17-4 18"/>',
  activity:'<path d="M2 12h4l3-7 5 14 3-7h5"/>',
  github:'<path d="M9 19c-4 1-4-2-6-2m12 4v-3a3 3 0 0 0-1-2c4-.4 7-2 7-7a5 5 0 0 0-1-4c.1-1-.2-2-1-3-2 0-3 1-4 1a13 13 0 0 0-6 0C8 2 7 2 5 2c-.8 1-1.1 2-1 3a5 5 0 0 0-1 4c0 5 3 7 7 7a3 3 0 0 0-1 2v3"/>',
  external:'<path d="M8 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3M13 3h8v8m0-8-10 10"/>',
  briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 12h20"/>',
  book:'<path d="M12 7c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V6c-3-1-6-1-9 1ZM12 7v14"/>',
  mail:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m3 7 9 7 9-7"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  research:'<path d="M9 3h6m-5 0v7L4 20h16l-6-10V3M8 15h8"/>',
  network:'<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5H5v5m7-5h7v5"/>',
  download:'<path d="M12 3v13m-5-5 5 5 5-5M4 19v2h16v-2"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-7 16-7 16 0"/>',
  music:'<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="5" cy="18" rx="4" ry="3"/><ellipse cx="17" cy="16" rx="4" ry="3"/>',
};
const icon = name => name==="github" || name==="spotify" ? brandIcon(name) :
  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (symbol[name] || symbol.arrow) + '</svg>';
const button=(href,label,primary=false,external=false)=>'<a class="p-button'+(primary?' p-button-primary':'')+'" href="'+esc(href)+'"'+(external?' target="_blank" rel="noopener noreferrer"':'')+'>'+esc(label)+' '+icon(external?'external':'arrow')+'</a>';
const heading = (over,title,desc="") => '<div class="p-section-heading"><div><p class="p-eyebrow">'+esc(over)+'</p><h2>'+title+'</h2></div>'+(desc?'<p>'+esc(desc)+'</p>':'')+'</div>';
const intro = (over,title,text,actions="") =>
  '<section class="p-page-hero"><div class="p-page-hero-copy"><p class="p-eyebrow">'+esc(over)+'</p><h1>'+title+'</h1><p class="p-lede">'+esc(text)+'</p><div class="p-actions">'+actions+'</div></div><div class="p-page-portrait" aria-hidden="true"><div class="p-headshot-glow"></div><img src="/professional/headshot-concept.webp" width="320" height="251" alt="" decoding="async"></div></section>';
const card = (iconName,tag,title,body,href,linkLabel="Explore") =>
  '<article class="p-card p-card-'+esc(iconName)+'"><div class="p-card-icon">'+icon(iconName)+'</div><p class="p-card-over">'+esc(tag)+'</p><h3>'+esc(title)+'</h3><p>'+esc(body)+'</p>'+(href?'<a class="p-text-link" href="'+esc(href)+'">'+esc(linkLabel)+icon("arrow")+'</a>':'')+'</article>';
const feed = (id,limit) => '<div class="p-feed" data-public-github-feed data-limit="'+limit+'" id="'+id+'"><div class="p-feed-status" role="status" aria-live="polite" data-feed-status>Checking public GitHub events…</div><ol data-feed-list></ol><p class="p-feed-caption">Public GitHub events only. Provider updates can be delayed or incomplete. No private repositories, commit messages or currently active editing claims.</p></div>';

function home(){
  return '<section class="p-home-hero"><div class="p-home-copy"><p class="p-eyebrow">DEVON ALAN AKINS <span class="p-hero-rule"></span></p><p class="p-role">BUSINESS OPERATIONS · TECHNOLOGY · SOFTWARE</p><h1>I build the systems <em>behind better work.</em></h1><p class="p-lede">I connect business operations and practical engineering—designing, building and improving the systems that make difficult work easier to execute.</p><div class="p-actions">'+button("/experience/","Experience & résumé",true)+button("/work/","Selected work")+button("/activity/","Public activity")+'</div></div><div class="p-home-portrait"><div class="p-portrait-halo"></div><img src="/professional/headshot-concept.webp" alt="Portrait of Devon Alan Akins" width="320" height="251" fetchpriority="high" decoding="async"></div></section>'+
  '<div class="p-live-ribbon"><div class="p-ribbon-cell p-ribbon-lead"><span class="p-pulse" aria-hidden="true"></span><span><strong>RECENT ACTIVITY</strong><small>Source-qualified public updates</small></span></div><div class="p-ribbon-cell">'+icon("github")+'<span><strong>GitHub</strong><small>Automatic public feed</small></span></div><a class="p-ribbon-cell p-ribbon-spotify" href="/listening/">'+icon("music")+'<span><strong>Spotify</strong><small data-spotify-ribbon>Listening source pending</small></span></a><a class="p-ribbon-cell p-ribbon-last" href="/activity/">'+icon("activity")+'<span><strong>Source-qualified</strong><small>View actual events</small></span></a></div>'+
  '<section class="p-section">'+heading("PROFESSIONAL FOCUS","Operations. Technology. Execution.","A practical intersection of process, people and software.")+
  '<div class="p-card-grid p-three">'+card("network","OPERATIONS","Business systems","Supporting day-to-day operations and improving processes, organization, reliability and follow-through.","/experience/","My experience")+card("code","ENGINEERING","Software & automation","Developing independent tools that reduce repetitive work and make complex tasks more manageable.","/work/","Selected systems")+card("research","RESEARCH","Applied inquiry","Testing ideas across mathematics, engineering and organizational systems, with evidence ahead of claims.","/writing/","Writing & research")+'</div></section>'+
  '<section class="p-section">'+heading("SELECTED WORK","Built with purpose.","A focused selection, not every repository or unfinished experiment.")+
  '<div class="p-feature-grid p-four">'+workCard("Professional operations","NONCLINICAL · ACTIVE","Organizing operational responsibilities and practical systems for family professional businesses; outcomes remain unclaimed until verified.","/work/operations/","ops")+workCard("DevonStation + Knowledge","SYSTEMS · IN DEVELOPMENT","A personal operating workspace and independent knowledge infrastructure; owner-only content stays private.","/work/devonstation/","build")+workCard("Professional business technology","WORKFLOW & WEB DEVELOPMENT","Accessible websites, meeting tools and workflow improvements for professional needs; client details are not disclosed.","/work/#professional-technology","ops")+workCard("DevonAkins.com","PUBLIC ENGINEERING","This first-party site demonstrates design, verified source activity and independently qualified integrations.","/work/#website-engineering","research")+'</div></section>'+
  '<section class="p-section p-home-bottom"><div class="p-feed-panel"><div class="p-feed-panel-header"><div class="p-feed-panel-title">'+icon("github")+'<div><h2>Live GitHub Activity</h2><p>Recent public events across my repositories.</p></div></div>'+button("/activity/","View full activity")+'</div>'+feed("home-github",5)+'</div><div class="p-home-signal-stack">'+spotifyCard("compact")+'<div class="p-home-mini-signals">'+workSignalCard()+gptSignalCard()+threadsSignalCard()+'</div></div></section>'+
  '<section class="p-section p-quiet-grid p-home-destinations"><div>'+heading("WRITING & PERSPECTIVE","Ideas worth finishing.")+'<p>Books, systems thinking and technical notes are part of the same practice: investigate carefully, build responsibly and finish useful work.</p>'+button("/writing/","Explore writing")+'</div><div>'+heading("SOCIAL & CONTACT","Beyond the code.")+'<p>Follow public updates or get in touch about professional operations, technology and original work.</p>'+button("https://www.instagram.com/devonalanakins/","Instagram",false,true)+button("/contact/","Contact",true)+'</div></section>'+
  '<section class="p-section p-home-closer"><h2>Let’s build something that <em>works.</em></h2><p>OPERATIONS · TECHNOLOGY · SOFTWARE · EXECUTION</p>'+button("/contact/","Get in touch",true)+'</section>';
}

function experience(){
  const abilities=[
    ["network","Business operations","Planning, workflow design, organization and day-to-day coordination."],
    ["code","Software engineering","Building tools, web applications, automations and source-controlled systems."],
    ["layers","Systems integration","Connecting services, data and processes while preserving reliability."],
    ["check","Verification & delivery","Testing implementation, protecting sensitive information and documenting results."],
    ["research","Technical research","Mathematics, physics, engineering and evidence-driven investigation."],
    ["book","Writing & communication","Explaining complex ideas, developing manuscripts and creating usable documentation."],
  ];
  return intro("EXPERIENCE / 01","Experience & <em>résumé.</em>","Operations, technology and independent engineering—focused on turning complex work into reliable systems.",
      button("/contact/","Professional contact",true)+button("/work/","See selected work"))+
  '<section class="p-section p-wide-copy">'+heading("PROFILE","I work across the seams.")+
  '<p class="p-large">My work connects operations, software and organizational needs. I help support family professional businesses through nonclinical operations and technology while independently designing and maintaining software. I favor clear responsibility, secure systems and work that measurably improves daily execution.</p></section>'+
  '<section class="p-section">'+heading("EXPERIENCE","What I am doing.","Roles and workstreams are described without invented employment dates or unverified titles.")+
  '<div class="p-timeline"><article><span class="p-timeline-marker"></span><div><p class="p-card-over">CURRENT · PROFESSIONAL OPERATIONS</p><h3>Operations & technology support</h3><p>Supporting nonclinical operations, process improvement, technical infrastructure and execution for family professional businesses. Client and patient information remain private.</p></div></article><article><span class="p-timeline-marker"></span><div><p class="p-card-over">CURRENT · INDEPENDENT ENGINEERING</p><h3>Software developer & systems builder</h3><p>Designing and maintaining first-party applications, automation and open-source research across the existing GitHub and Cloudflare workflow.</p></div></article><article><span class="p-timeline-marker"></span><div><p class="p-card-over">ONGOING · WRITING & RESEARCH</p><h3>Author & independent researcher</h3><p>Revising published writing, developing new manuscripts and exploring mathematics, physics, software engineering and complex systems.</p></div></article></div></section>'+
  '<section class="p-section">'+heading("CAPABILITIES","How I contribute.")+'<div class="p-card-grid p-three">'+abilities.map(a=>card(a[0],"CAPABILITY",a[1],a[2])).join("")+'</div></section>'+
  '<section class="p-section">'+heading("EDUCATION","Academic foundation.")+'<div class="p-card-grid p-two">'+card("book","EDUCATION","Valencia College","Associate of Arts degree, completed in 2021. Mathematics and scientific study have informed later technical work.")+card("research","ADDITIONAL STUDY","Mathematics & physics","Subsequent university coursework in mathematics, STEM education and physics. Coursework is not represented as an earned bachelor’s degree.")+'</div></section>'+
  '<section class="p-section p-inline-cta"><div><p class="p-eyebrow">PROFESSIONAL INQUIRIES</p><h2>Interested in working together?</h2><p>Contact me for a current, source-grounded résumé and a discussion of relevant work.</p></div>'+button("/contact/","Get in touch",true)+'</section>';
}
function workCard(name,tag,description,href,visual){
  return '<article class="p-work-card"><div class="p-work-art p-art-'+visual+'" aria-hidden="true"><span></span><span></span><span></span><i></i></div><div class="p-work-body"><p class="p-card-over">'+esc(tag)+'</p><h3>'+esc(name)+'</h3><p>'+esc(description)+'</p><a class="p-text-link" href="'+esc(href)+'">Read more '+icon("arrow")+'</a></div></article>';
}
function work(){
  const selected=approvedPublicProjects;
  const find=slug=>selected.find(p=>p.slug===slug);
  const tool=find("merit"), studio=find("mizvo"), language=find("rhen-language");
  return intro("WORK / 02","Selected <em>work.</em>","A deliberate collection of work that demonstrates operations, engineering and practical execution—not a catalog of every idea.",
    button("/activity/","See all public GitHub activity",true)+button("/contact/","Contact me"))+
  '<section class="p-section" id="professional-operations">'+heading("FEATURED FOCUS","Operations before optics.","Nonclinical responsibilities are described without patient details, unverified outcomes or unapproved management titles.")+
  '<article class="p-featured-study"><div class="p-study-art" aria-hidden="true"><span class="p-study-orbit"></span><span class="p-study-orbit"></span><span class="p-study-orbit"></span></div><div><p class="p-eyebrow">ACTIVE · NONCLINICAL OPERATIONS</p><h3>Designing systems for real businesses.</h3><p>My current professional focus is supporting family professional businesses with operational organization, process reliability and technology. This case study is being developed; professional attribution and results will be published only with permission and supporting evidence.</p><div class="p-study-points"><div><strong>Responsibility</strong><span>Help organize nonclinical administration, coordination and technology.</span></div><div><strong>Approach</strong><span>Study existing workflows, improve systems and verify adoption.</span></div><div><strong>Evidence</strong><span>Measured outcomes are not yet published or independently verified.</span></div></div><div class="p-actions">'+button("/work/operations/","View public operations overview")+'</div></div></article></section>'+
  '<section class="p-section">'+heading("ENGINEERING","Selected technical projects.","Three focused technical examples, each with explicit publication and project-status boundaries.")+'<div class="p-feature-grid p-three">'+
  workCard("DevonStation + Knowledge","INDEPENDENT SYSTEMS · IN DEVELOPMENT","An owner-only operating workspace and separately maintained knowledge infrastructure. Private records and access stay private.","/work/devonstation/","build")+
  workCard("Professional business technology","WORKFLOW & WEB DEVELOPMENT","Purpose-built websites, meeting systems and process tools that support real professional work.","/work/#professional-technology","ops")+
  workCard("DevonAkins.com","PUBLIC ENGINEERING","Source-controlled design, Cloudflare delivery and source-qualified GitHub and Spotify experiences, each with independent status.","/work/#website-engineering","research")+'</div></section>'+
  '<section class="p-section p-quiet-grid p-case-study-grid"><div id="professional-technology">'+heading("PROFESSIONAL TECHNOLOGY","Tools for real workflows.")+
  '<p>My professional technology work focuses on clear information, useful interfaces and reliable processes. IdeaFlow is an in-development meeting and decision-capture system; other professional website and business work is shown only when authorized.</p>'+
  '<p class="p-fine">No clinical records, client documents or private business performance data are published here.</p>'+
  button("/work/ideaflow/","View IdeaFlow work")+'</div><div id="website-engineering">'+heading("PUBLIC WEBSITE ENGINEERING","A portfolio that can be inspected.")+
  '<p>DevonAkins.com is both a professional home and an engineering example. The source contains independent public GitHub discovery and opt-in activity integrations; the protected production release and this professional redesign have separate verification and deployment states.</p>'+
  '<p class="p-fine">A passing source test does not mean a new design or upstream provider feed is live.</p>'+
  button("/activity/","Inspect public GitHub activity",true)+'</div></section>'+
  '<section class="p-section p-research-section">'+heading("FURTHER EXPERIMENTS","Research, not the headline.","Exploratory projects remain discoverable without dominating the professional portfolio.")+
  '<div class="p-research-links">'+
  (tool?'<a href="/work/merit/"><strong>'+esc(tool.title)+'</strong><span>Evidence-based software review · '+esc(tool.status)+'</span>'+icon("arrow")+'</a>':"")+
  (studio?'<a href="/work/mizvo/"><strong>'+esc(studio.title)+'</strong><span>Software studio experiment · '+esc(studio.status)+'</span>'+icon("arrow")+'</a>':"")+
  (language?'<a href="/work/rhen-language/"><strong>'+esc(language.title)+'</strong><span>Language research · '+esc(language.status)+'</span>'+icon("arrow")+'</a>':"")+'</div></section>'+
  '<section class="p-section p-inline-cta"><div><p class="p-eyebrow">THE FULL PUBLIC RECORD</p><h2>More than a selected portfolio.</h2><p>Featured projects are intentionally curated. The public GitHub timeline is not: it automatically discovers qualifying events across owned public repositories, with timestamps and source labels.</p></div>'+
  button("/activity/","Explore GitHub activity",true)+'</section>';
}

function activity(){
  return intro("PUBLIC ACTIVITY / 03","Live <em>Activity.</em>","A readable public GitHub timeline, sourced automatically from my owned public repositories. Events have real timestamps; this is not a claim that I am currently coding.",
    button("https://github.com/devonalanakins","Open GitHub",true,true)+button("/work/","Selected work"))+
  '<div class="p-live-ribbon p-activity-ribbon"><div class="p-ribbon-cell p-ribbon-lead"><span class="p-pulse" aria-hidden="true"></span><span><strong>PUBLIC GITHUB</strong><small>Recent recorded events</small></span></div><div class="p-ribbon-cell">'+icon("github")+'<span><strong>Automatic</strong><small>All owned public repos</small></span></div><div class="p-ribbon-cell">'+icon("layers")+'<span><strong>Source-qualified</strong><small>Verified GitHub response</small></span></div><a class="p-ribbon-cell p-ribbon-last" href="#github-feed">'+icon("activity")+'<span><strong>Explore activity</strong><small>Filter by event type</small></span></a></div>'+
  '<section class="p-section" id="github-feed"><div class="p-activity-layout"><div class="p-activity-main"><div class="p-section-heading"><div><p class="p-eyebrow">GITHUB ACTIVITY</p><h2>GitHub Public Feed.</h2></div><p>A source-qualified history of public pushes, pull requests, releases and other recorded events.</p></div><div class="p-filter-row" role="group" aria-label="Filter public GitHub events"><button data-github-filter="all" aria-pressed="true">All</button><button data-github-filter="push" aria-pressed="false">Pushes</button><button data-github-filter="pull_request" aria-pressed="false">Pull requests</button><button data-github-filter="release" aria-pressed="false">Releases</button><button data-github-filter="other" aria-pressed="false">Other</button></div>'+feed("activity-github",32)+'</div><aside class="p-activity-aside"><article class="p-aside-panel p-work-signals"><p class="p-eyebrow">WORK SIGNALS</p><h3>Observed public work.</h3><p class="p-fine">Counts are from the currently returned sample, not lifetime totals or active sessions.</p><div class="p-signal-row">'+icon("activity")+'<span><strong>Push events</strong><small>Public updates recorded</small></span><b data-github-count="push">—</b></div><div class="p-signal-row">'+icon("layers")+'<span><strong>Pull request events</strong><small>Open, merge or review actions</small></span><b data-github-count="pull_request">—</b></div><div class="p-signal-row">'+icon("check")+'<span><strong>Release events</strong><small>Published repository releases</small></span><b data-github-count="release">—</b></div></article>'+
  '<article class="p-aside-panel"><p class="p-eyebrow">SOURCE STATUS</p><h3>Public sources.</h3><div class="p-source-row p-source-github">'+icon("github")+'<span><strong>GitHub</strong><small data-github-source-state role="status">Checking public source availability…</small></span></div><div class="p-source-row p-source-spotify">'+icon("spotify")+'<span><strong>Spotify</strong><small data-spotify-source-state role="status">Checking playback permission…</small></span></div><div class="p-source-row">'+icon("book")+'<span><strong>Writing</strong><small>Editorial content, not an automatic feed</small></span></div><div class="p-source-row">'+icon("activity")+'<span><strong>Other signals</strong><small>Threads and GPT require independent public sources</small></span></div></article>'+
  '<article class="p-aside-panel"><p class="p-eyebrow">RECENT VERIFIED UPDATES</p><h3>From the same source.</h3><ol class="p-recent-updates" data-github-highlights><li>Awaiting verified public events…</li></ol></article></aside></div></section>'+
  '<section class="p-section p-observatory-section">'+heading("THE COMPLETE SIGNAL","Beyond GitHub.","Listening, work status, GPT captures, and approved public social activity use independent, clearly labeled sources.")+signalDeck("activity")+'</section>'+
  '<section class="p-section p-activity-detail"><div class="p-aside-panel"><p class="p-eyebrow">DATA PROVENANCE</p><h2>Recorded is not live.</h2><p>Public events have GitHub timestamps and may arrive with delay or incomplete history. A new push proves a recent public event, not an ongoing session. Private repositories, raw commit messages and client records stay out of this feed.</p></div><div class="p-aside-panel"><p class="p-eyebrow">CURATED PORTFOLIO</p><h2>Separate from discovery.</h2><p>Featured case studies are selected for professional relevance. The public activity stream needs no per-repository selection: public projects automatically appear when GitHub reports eligible events.</p>'+button("/work/","See selected work")+'</div></section>';
}

function listening(){
  return intro("IN THE ZONE / LISTENING","Music behind <em>the work.</em>","A private-by-default, source-qualified window into the music I choose to share. No audio streams or fabricated listening history.",
    button("/activity/","Live activity",true)+button("/experience/","Professional profile"))+
  '<section class="p-section p-listening-hero">'+spotifyCard("feature")+
  '<aside class="p-listening-notes"><p class="p-eyebrow">A PERSONAL SIGNAL</p><h2>Soundtrack to the process.</h2><p>For me, listening on Spotify means I am coding. When I share playback publicly, the site calls that In the Zone—my owner-defined coding signal, distinct from a verified editor session. Paused, private or stale playback never becomes a simulated track.</p>'+
  '<div class="p-listening-terms"><div><strong>Track & artwork</strong><small>Only when public track-detail sharing is enabled.</small></div><div><strong>Playback progress</strong><small>A visual estimate from a recent provider timestamp, never audio streaming.</small></div><div><strong>Explicit controls</strong><small>Owner-only controls for privacy remain behind the existing protected interface.</small></div></div></aside></section>'+
  '<section class="p-section">'+listeningCollections()+'</section>'+
  '<section class="p-section p-inline-cta"><div><p class="p-eyebrow">WORK & MUSIC</p><h2>Two different signals.</h2><p>My consented Spotify playback signals my personal coding mode. GitHub activity and authenticated editor reports independently document work that actually occurred.</p></div>'+button("/activity/","View activity",true)+'</section>';
}
function gpt(){
  return intro("GPT / OBSERVATIONS","AI in <em>practice.</em>","A dated, owner-approved view of my GPT usage observations, not a manufactured live counter or a claim of access to private ChatGPT account statistics.",
    button("/activity/","All public signals",true)+button("/experience/","Professional profile"))+
  '<section class="p-section p-gpt-editorial"><div>'+heading("CAPTURED USAGE","Numbers with provenance.")+
  '<p class="p-large">I use AI-assisted systems as part of software engineering, research and operations. Public figures on this page are the specific metrics I have authorized and recorded, with source, units and capture date.</p>'+
  '<p>Tokens, messages and Work/Codex credits are different measurements; they are not interchangeable. A historical capture is not a real-time account balance.</p></div>'+
  gptSignalCard()+'</section>'+
  '<section class="p-section p-quiet-grid"><div>'+heading("METHOD","Evidence before display.")+
  '<p>Only consent-filtered records from the existing public telemetry source are displayed. Missing or expired records remain unavailable instead of being estimated.</p></div>'+
  '<div>'+heading("ENGINEERING","The underlying work.")+
  '<p>Real commits, reviewed changes and published releases are independently available through the public GitHub activity feed.</p>'+button("/activity/","Explore GitHub activity",true)+'</div></section>';
}
function writing(){
  return intro("WRITING / 04","Writing & <em>perspective.</em>","Books, research and notes on the connection between systems, software, operations and human decisions.",
    button("/about/","About me",true)+button("/contact/","Get in touch"))+
  '<section class="p-section">'+heading("ORIGINAL WORK","Writing in progress.","Drafts and exploratory topics are identified honestly; a proposed essay is not passed off as published.")+
  '<div class="p-card-grid p-three">'+card("book","BOOKS · REVISION","Fiction & manuscripts","Revising a previously published book and developing new long-form creative work. Publication details will appear when verified.")+
  card("network","TOPIC · IN DEVELOPMENT","The leverage of operational systems","Exploring how clear processes, practical automation and reliable information flow can improve real work.")+
  card("code","TOPIC · IN DEVELOPMENT","Software that lasts","Notes on maintainable engineering, verification and durable independent tools.")+
  card("research","TOPIC · IN DEVELOPMENT","Math, physics & cognition","Research questions and technical learning, with hypotheses distinguished from confirmed results.")+
  card("layers","TOPIC · IN DEVELOPMENT","Independent operating systems","How focused technical systems can support complex responsibilities without unnecessary complexity.")+
  card("book","FICTION · CREATIVE STUDIO","ANEVUM","Long-running fictional worldbuilding and creative work, developed alongside family priorities.","/work/anevum/","View public overview")+
  '</div></section><section class="p-section p-inline-cta"><div><p class="p-eyebrow">ABOUT THE AUTHOR</p><h2>Curiosity, grounded in execution.</h2><p>I am interested in the ideas behind systems, but even more in whether they help people build useful things.</p></div>'+button("/about/","About Devon",true)+'</section>';
}
function about(){
  return intro("ABOUT / 05","A builder. An operator. <em>A writer.</em>","I am Devon Alan Akins—an independent developer, author and father whose work increasingly centers on improving real-world business operations.",
    button("/experience/","Experience & résumé",true)+button("/contact/","Contact"))+
  '<section class="p-section p-wide-copy">'+heading("APPROACH","Practical work, carefully built.")+
  '<p class="p-large">I work across business operations, software engineering, research and writing. I prefer systems that can be understood, maintained and improved rather than elaborate designs that never reach everyday use.</p><p class="p-large">My current priority is helping family professional businesses operate better while continuing a smaller, focused body of independent engineering and creative work.</p></section>'+
  '<section class="p-section">'+heading("VALUES","How I approach decisions.")+'<div class="p-card-grid p-three">'+card("check","01 · EVIDENCE","Make claims you can prove","A prototype, a passing test and a successful production release are distinct facts.")+card("layers","02 · INDEPENDENCE","Own the essential systems","Favor maintainable, open-source and self-hostable technologies when they fit the real need.")+card("network","03 · RESPONSIBILITY","Protect trust and privacy","Keep professional, family and client boundaries clear. Never publish confidential information as portfolio material.")+'</div></section>';
}
function contact(){
  return intro("CONTACT / 06","Let's do <em>useful work.</em>","For professional inquiries, software engineering, systems thinking or writing correspondence, send a message directly.",
    button("mailto:devon@anevum.com","Email Devon",true)+button("https://github.com/devonalanakins","GitHub profile",false,true))+
  '<section class="p-section p-contact-panel"><div><p class="p-eyebrow">DIRECT CONTACT</p><h2>Start a conversation.</h2><p>For now, email is the verified contact path; there is no fictitious inquiry form or message delivery service.</p><a class="p-contact-email" href="mailto:devon@anevum.com">devon@anevum.com '+icon("arrow")+'</a></div><div><p class="p-eyebrow">PUBLIC WORK</p><h2>Review the evidence.</h2><p>Explore selected work or public source history before getting in touch.</p>'+button("/work/","Selected work")+button("/activity/","GitHub activity")+'</div></section>';
}
export const PROFESSIONAL_PAGES = Object.freeze(Object.keys(pages));
export const PROFESSIONAL_ROUTES = route;
function renderShell(key,label,description,publicPath,content) {
  const current = key === "home" ? "home" : key;
  const nav = ["home","experience","work","activity","writing","about"].map(k =>
    '<a'+(k===current?' aria-current="page"':'')+' href="'+route[k]+'">'+
    (k==="activity"?"Activity":k==="experience"?"Experience":k==="work"?"Work":k==="writing"?"Writing":k==="about"?"About":"Home")+'</a>').join("");
  const canonical = "https://devonakins.com" + publicPath;
  return '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+
    '<meta name="theme-color" content="#090e13"><meta name="description" content="'+esc(description)+'">'+
    '<link rel="canonical" href="'+canonical+'">'+
    '<meta property="og:type" content="website"><meta property="og:title" content="'+esc(label)+' — Devon Alan Akins">'+
    '<meta property="og:description" content="'+esc(description)+'">'+
    '<meta name="color-scheme" content="dark"><title>'+esc(label)+' — Devon Alan Akins</title>'+
    '<link rel="icon" href="/favicon-32.png">'+
    '<link rel="stylesheet" href="/src/professional/site.css">'+
    '<script type="module" src="/src/professional/client.ts"></script></head><body class="p-body p-page-'+key+'">'+
    '<a class="p-skip" href="#main">Skip to content</a><div class="p-atmosphere" aria-hidden="true"></div>'+
    '<header class="p-header"><div class="p-shell p-nav"><a class="p-wordmark" href="/">DevonAkins<span>.com</span></a>'+
    '<nav class="p-desktop-nav" aria-label="Primary">'+nav+'</nav>'+
    '<a class="p-header-listen" href="/listening/" aria-label="Spotify listening">'+icon("music")+' <span>Listening</span></a>'+
    '<a class="p-header-contact" href="/contact/">'+icon("mail")+' Contact</a>'+
    '<button class="p-mobile-toggle" type="button" aria-expanded="false" aria-controls="p-mobile-nav" aria-label="Open menu">'+
    '<span></span><span></span><span></span></button></div>'+
    '<nav id="p-mobile-nav" class="p-mobile-nav" aria-label="Mobile navigation" hidden>'+nav+'<a href="/listening/">Listening</a><a href="/gpt/">GPT usage</a><a href="/contact/">Contact</a></nav></header>'+
    '<main id="main" class="p-shell">'+content+'</main>'+
    '<footer class="p-footer"><div class="p-shell"><p class="p-footer-line">Build something <em>that works.</em></p><p>OPERATIONS · SOFTWARE · SYSTEMS · EXECUTION</p><div class="p-footer-links"><a href="/experience/">Experience</a><a href="/activity/">Public activity</a><a href="/writing/">Writing</a><a href="/listening/">Listening</a><a href="/gpt/">GPT observations</a><a href="/contact/">Contact</a></div><small>© Devon Alan Akins · Public information only · Sources and status are independently qualified</small></div></footer>'+
    '</body></html>';
}

export function renderProfessionalPage(key="home") {
  if (!Object.hasOwn(pages,key)) throw new Error("Unknown professional page");
  const [label,description] = pages[key];
  return renderShell(key,label,description,route[key],
    {home,experience,work,activity,writing,about,contact,listening,gpt}[key]());
}

/** All existing published project URLs stay functional within the new design.
 * Publication manifest, not GitHub discovery, authorizes each project page.
 */
export function renderProfessionalProjectPage(slug) {
  const project = approvedPublicProjects.find(entry=>entry.slug===slug);
  if (!project) throw new Error("Unknown or unpublished project");
  const path = "/work/" + encodeURIComponent(project.slug) + "/";
  const lead = esc(project.summary);
  const link = project.url && project.publication?.sourceLinkApproved === true ?
    button(project.url,project.urlLabel || "Inspect public source",false,true) : "";
  const content = intro("SELECTED WORK / " + project.category.toUpperCase(),
    esc(project.title),project.summary,
    button("/work/","All selected work",true)+link) +
    '<section class="p-section p-detail-layout"><div><p class="p-eyebrow">PROJECT OVERVIEW</p><h2>Purpose & context.</h2><p class="p-large">'+esc(project.description)+'</p><p>'+esc(project.detail)+'</p></div>'+
    '<aside class="p-aside-panel"><p class="p-eyebrow">PUBLIC RECORD</p><h3>Project status</h3>'+
    '<dl class="p-project-facts"><div><dt>Stage</dt><dd>'+esc(project.status)+'</dd></div>'+
    '<div><dt>Role</dt><dd>'+esc(project.role)+'</dd></div>'+
    '<div><dt>Category</dt><dd>'+esc(project.publication.category)+'</dd></div></dl>'+
    '<p class="p-fine">Status is editorial and dated only if the underlying project source provides a verification date. It does not imply a production deployment.</p></aside></section>'+
    '<section class="p-section p-quiet-grid"><div>'+heading("WORK COMPLETED","What exists.")+
    '<p>'+esc(project.detail)+'</p></div><div>'+heading("BOUNDARIES","What is not claimed.")+
    '<p>'+esc(project.boundary)+'</p></div></section>'+
    '<section class="p-section p-inline-cta"><div><p class="p-eyebrow">CURRENT NEXT STEP</p><h2>Moving deliberately forward.</h2><p>'+esc(project.next)+'</p></div>'+
    button("/activity/","See public GitHub activity",true)+'</section>';
  return renderShell("work",project.title+" — Selected work",lead,path,content);
}
