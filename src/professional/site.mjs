import {approvedPublicProjects} from "../publication-manifest.mjs";

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
});
const route = Object.freeze({
  home:"/",experience:"/experience/",work:"/work/",activity:"/activity/",
  writing:"/writing/",about:"/about/",contact:"/contact/",
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
};
const icon = (name) => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (symbol[name] || symbol.arrow) + '</svg>';
const button=(href,label,primary=false,external=false)=>'<a class="p-button'+(primary?' p-button-primary':'')+'" href="'+esc(href)+'"'+(external?' target="_blank" rel="noopener noreferrer"':'')+'>'+esc(label)+' '+icon(external?'external':'arrow')+'</a>';
const heading = (over,title,desc="") => '<div class="p-section-heading"><div><p class="p-eyebrow">'+esc(over)+'</p><h2>'+title+'</h2></div>'+(desc?'<p>'+esc(desc)+'</p>':'')+'</div>';
const intro = (over,title,text,actions="") =>
  '<section class="p-page-hero"><div class="p-page-hero-copy"><p class="p-eyebrow">'+esc(over)+'</p><h1>'+title+'</h1><p class="p-lede">'+esc(text)+'</p><div class="p-actions">'+actions+'</div></div><div class="p-page-portrait" aria-hidden="true"><img src="/v2/crossed-arms.webp" width="550" height="730" alt="" decoding="async"></div></section>';
const card = (iconName,tag,title,body,href,linkLabel="Explore") =>
  '<article class="p-card"><div class="p-card-icon">'+icon(iconName)+'</div><p class="p-card-over">'+esc(tag)+'</p><h3>'+esc(title)+'</h3><p>'+esc(body)+'</p>'+(href?'<a class="p-text-link" href="'+esc(href)+'">'+esc(linkLabel)+icon("arrow")+'</a>':'')+'</article>';
const feed = (id,limit) => '<div class="p-feed" data-public-github-feed data-limit="'+limit+'" id="'+id+'"><div class="p-feed-status" role="status" aria-live="polite" data-feed-status>Checking public GitHub events…</div><ol data-feed-list></ol><p class="p-feed-caption">Public GitHub events only. Provider updates can be delayed or incomplete. No private repositories, commit messages or currently active editing claims.</p></div>';

function home(){
  return '<section class="p-home-hero"><div class="p-home-copy"><p class="p-eyebrow">DEVON ALAN AKINS <span class="p-hero-rule"></span></p><p class="p-role">BUSINESS OPERATIONS · TECHNOLOGY · SOFTWARE</p><h1>I build the systems <em>behind better work.</em></h1><p class="p-lede">I connect business operations and practical engineering—designing, building and improving the systems that make difficult work easier to execute.</p><div class="p-actions">'+button("/experience/","Experience & résumé",true)+button("/work/","Selected work")+button("/activity/","Public activity")+'</div></div><div class="p-home-portrait"><div class="p-portrait-halo"></div><img src="/v2/crossed-arms.webp" alt="Portrait of Devon Alan Akins" width="640" height="730" fetchpriority="high" decoding="async"></div></section>'+
  '<div class="p-live-ribbon"><span class="p-pulse" aria-hidden="true"></span><div><strong>PUBLIC WORK, VERIFIED SOURCES</strong><small>Events from GitHub, not a simulated coding indicator</small></div><div>'+icon("github")+' <span>All public repositories</span></div><div>'+icon("activity")+' <span>Recent history, dated</span></div><a href="/activity/">Explore activity '+icon("arrow")+'</a></div>'+
  '<section class="p-section">'+heading("PROFESSIONAL FOCUS","Operations. Technology. Execution.","A practical intersection of process, people and software.")+
  '<div class="p-card-grid p-three">'+card("network","OPERATIONS","Business systems","Supporting day-to-day operations and improving processes, organization, reliability and follow-through.","/experience/","My experience")+card("code","ENGINEERING","Software & automation","Developing independent tools that reduce repetitive work and make complex tasks more manageable.","/work/","Selected systems")+card("research","RESEARCH","Applied inquiry","Testing ideas across mathematics, engineering and organizational systems, with evidence ahead of claims.","/writing/","Writing & research")+'</div></section>'+
  '<section class="p-section">'+heading("SELECTED WORK","Built with purpose.","A focused selection, not every repository or unfinished experiment.")+
  '<div class="p-feature-grid">'+workCard("Business operations","Professional operations","Active, nonclinical operational and technology work with family businesses. Outcomes will be documented only when verified and approved.","/work/","ops")+workCard("DevonAkins.com","Independent software","A public engineering portfolio backed by GitHub, Cloudflare and first-party source integrations.","/work/","build")+workCard("Merit","Open-source engineering","An experimental toolkit for independent software review and evidence-based engineering integrity.","/work/merit/","research")+'</div></section>'+
  '<section class="p-section p-home-bottom"><div>'+heading("PUBLIC GITHUB","The work continues.","Independent of the selected portfolio: recent public actions across repositories.")+button("/activity/","Full GitHub timeline")+'</div>'+feed("home-github",5)+'</section>'+
  '<section class="p-section p-quiet-grid"><div>'+heading("WRITING & PERSPECTIVE","Ideas worth finishing.")+'<p>Books, systems thinking and technical notes are part of the same practice: investigate carefully, build responsibly and finish useful work.</p>'+button("/writing/","Read more")+'</div><div>'+heading("CONTACT","A useful conversation starts here.")+'<p>Business operations, engineering, writing or thoughtful collaborations.</p>'+button("/contact/","Get in touch",true)+'</div></section>';
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
  return '<article class="p-work-card"><div class="p-work-art p-art-'+visual+'" aria-hidden="true"><span></span><span></span><span></span></div><div class="p-work-body"><p class="p-card-over">'+esc(tag)+'</p><h3>'+esc(name)+'</h3><p>'+esc(description)+'</p><a class="p-text-link" href="'+esc(href)+'">Read more '+icon("arrow")+'</a></div></article>';
}
function work(){
  const selected=approvedPublicProjects;
  const find=slug=>selected.find(p=>p.slug===slug);
  const tool=find("merit"), studio=find("mizvo"), language=find("rhen-language");
  return intro("WORK / 02","Selected <em>work.</em>","A deliberate collection of work that demonstrates operations, engineering and practical execution—not a catalog of every idea.",
    button("/activity/","See all public GitHub activity",true)+button("/contact/","Contact me"))+
  '<section class="p-section">'+heading("FEATURED FOCUS","Operations before optics.","Professional and client-specific outcomes are published only with permission and supporting evidence.")+
  '<article class="p-featured-study"><div class="p-study-art" aria-hidden="true"><span class="p-study-orbit"></span><span class="p-study-orbit"></span><span class="p-study-orbit"></span></div><div><p class="p-eyebrow">ACTIVE · NONCLINICAL OPERATIONS</p><h3>Designing systems for real businesses.</h3><p>My current professional focus is supporting family professional businesses with operational organization, process reliability and technology. This case study is being developed; no private client details, patient records, unverified performance statistics or public management claims are included.</p><div class="p-study-points"><div><strong>Challenge</strong><span>Administrative complexity and disconnected workflows.</span></div><div><strong>Approach</strong><span>Understand current processes, improve systems and test adoption.</span></div><div><strong>Evidence</strong><span>Outcomes to be published after measurement and authorization.</span></div></div></div></article></section>'+
  '<section class="p-section">'+heading("ENGINEERING","Selected technical projects.","Each status reflects the existing public record, not a claim of commercial readiness.")+'<div class="p-feature-grid">'+
  workCard("DevonAkins.com","Public engineering","First-party website, signed GitHub source experiments, live public telemetry and Cloudflare deployment workflows.","/activity/","build")+
  (tool?workCard(tool.title,tool.status,tool.summary,"/work/merit/","research"):"")+
  (studio?workCard(studio.title,studio.status,studio.summary,"/work/mizvo/","ops"):"")+'</div></section>'+
  '<section class="p-section p-quiet-grid"><div>'+heading("RESEARCH","A smaller selection, stronger evidence.")+'<p>'+(language?esc(language.summary):"Independent technical research remains in progress.")+'</p>'+button("/work/rhen-language/","View language research")+'</div><div>'+heading("ACTIVITY","Explore the entire public record.")+'<p>Featured work is selective. The public GitHub timeline is not: it draws qualifying events from all repositories on the public profile.</p>'+button("/activity/","Explore activity",true)+'</div></section>';
}
function activity(){
  return intro("ACTIVITY / 03","Work, <em>observed.</em>","A source-qualified public event stream from GitHub. All public repositories are eligible automatically, regardless of portfolio selection.",
    button("https://github.com/devonalanakins","Open GitHub profile",true,true)+button("/work/","Selected work"))+
  '<section class="p-section"><div class="p-activity-layout"><div><div class="p-section-heading"><div><p class="p-eyebrow">PUBLIC GITHUB</p><h2>Recent event feed.</h2></div></div><div class="p-filter-row" role="group" aria-label="Filter public GitHub events"><button data-github-filter="all" aria-pressed="true">All</button><button data-github-filter="push" aria-pressed="false">Pushes</button><button data-github-filter="pull_request" aria-pressed="false">Pull requests</button><button data-github-filter="release" aria-pressed="false">Releases</button><button data-github-filter="other" aria-pressed="false">Other</button></div>'+feed("activity-github",32)+'</div><aside class="p-activity-aside"><article class="p-aside-panel"><p class="p-eyebrow">SOURCE HEALTH</p><h3>GitHub public events</h3><p data-github-source-state role="status">Checking source availability…</p><p class="p-fine">Public profile events are subject to GitHub API availability, delivery delays, event types and bounded pagination.</p></article><article class="p-aside-panel"><p class="p-eyebrow">DATA CONTRACT</p><h3>Recent is not “coding now.”</h3><p>Pushes, pull requests and releases are historical public actions with source timestamps. Only independently authenticated fresh editor or task signals may assert an active work session.</p></article><article class="p-aside-panel"><p class="p-eyebrow">PORTFOLIO INDEPENDENCE</p><h3>No per-repository setup.</h3><p>The public feed reads GitHub’s user activity across eligible public repositories. Featured case studies are selected independently.</p></article><article class="p-aside-panel"><p class="p-eyebrow">OTHER SIGNALS</p><h3>Separate and optional.</h3><p>Spotify, Threads and GPT usage retain separate authorization and provenance. Unconnected sources do not display simulated updates.</p></article></aside></div></section>';
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
  '</div></section><section class="p-section p-inline-cta"><div><p class="p-eyebrow">ABOUT THE AUTHOR</p><h2>Curiosity, grounded in execution.</h2><p>I'm interested in the ideas behind systems, but even more in whether they help people build useful things.</p></div>'+button("/about/","About Devon",true)+'</section>';
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
export function renderProfessionalPage(key="home") {
  if (!Object.hasOwn(pages,key)) throw new Error("Unknown professional page");
  const [label, description] = pages[key];
  const current = key === "home" ? "home" : key;
  const nav = ["home","experience","work","activity","writing","about"].map(k =>
    '<a'+(k===current?' aria-current="page"':'')+' href="'+route[k]+'">'+
    (k==="activity"?"Activity":k==="experience"?"Experience":k==="work"?"Work":k==="writing"?"Writing":k==="about"?"About":"Home")+'</a>').join("");
  const content = {home,experience,work,activity,writing,about,contact}[key]();
  const canonical = "https://devonakins.com" + route[key];
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
    '<a class="p-header-contact" href="/contact/">'+icon("mail")+' Contact</a>'+
    '<button class="p-mobile-toggle" type="button" aria-expanded="false" aria-controls="p-mobile-nav" aria-label="Open menu">'+
    '<span></span><span></span><span></span></button></div>'+
    '<nav id="p-mobile-nav" class="p-mobile-nav" aria-label="Mobile navigation" hidden>'+nav+'<a href="/contact/">Contact</a></nav></header>'+
    '<main id="main" class="p-shell">'+content+'</main>'+
    '<footer class="p-footer"><div class="p-shell"><p class="p-footer-line">Build something <em>that works.</em></p><p>OPERATIONS · SOFTWARE · SYSTEMS · EXECUTION</p><div class="p-footer-links"><a href="/experience/">Experience</a><a href="/activity/">Public activity</a><a href="/writing/">Writing</a><a href="/contact/">Contact</a></div><small>© Devon Alan Akins · Public information only · Sources and status are independently qualified</small></div></footer>'+
    '</body></html>';
}
