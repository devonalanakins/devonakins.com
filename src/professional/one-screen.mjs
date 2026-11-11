import {spotifyCard,gptSignalCard} from "./signal-cards.mjs";
import {brandIcon} from "./brand-icons.mjs";
import {renderOneScreenGptSummary} from "./gpt-capture.mjs";
import {renderPrestigeHome} from "./prestige-profile.mjs";
import {renderWorkingStandard} from "./working-standard.mjs";

/**
 * Opt-in one-viewport design candidate. Existing routes and consent-filtered
 * APIs remain the authority for deeper content and public activity.
 * This is a layout, not a new telemetry source.
 */
const navItems = Object.freeze([
  ["home","Profile"],["experience","Career"],["work","Missions"],
  ["activity","Activity"],["writing","Writing"],["contact","Contact"],
]);
const esc = value => String(value ?? "").replace(/[&<>"']/g,
  c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function tabs(kind) {
  return '<nav class="one-tabs one-tabs-'+kind+'" aria-label="'+(kind==="desktop"?"Explore":"Mobile sections")+'">'+
    '<div class="one-tablist" role="tablist" aria-label="Website sections">'+
    navItems.map(([key,label]) => '<button type="button" role="tab" id="one-'+kind+'-'+key+
      '" aria-controls="one-panel-'+key+'" aria-selected="'+(key==="home"?"true":"false")+
      '" tabindex="'+(key==="home"?"0":"-1")+'" data-one-target="'+key+'">'+
      '<span class="one-tab-label">'+esc(label)+'</span></button>').join("")+
    '</div></nav>';
}
function view(key,markup) {
  return '<section class="one-view one-view-'+key+'" data-one-view="'+key+
    '" id="one-panel-'+key+'" aria-labelledby="one-desktop-'+key+
    '" role="tabpanel" tabindex="-1"'+(key==="home"?"":" hidden")+'>'+markup+'</section>';
}
function eyebrow(index,topic) {
  return '<p class="one-eyebrow"><span>'+index+'</span> '+topic+'</p>';
}
function button(key,label,primary=false) {
  return '<button type="button" data-one-go="'+key+'" class="one-button'+(primary?' one-button-primary':'')+'">'+
    esc(label)+' <span aria-hidden="true">↗</span></button>';
}
function publicFeed(id,limit) {
  return '<div class="one-feed" data-public-github-feed data-limit="'+limit+'" id="'+id+'">'+
    '<p role="status" aria-live="polite" data-feed-status>Checking public GitHub events…</p>'+
    '<ol data-feed-list></ol>'+
    '<p class="one-feed-disclosure">Public GitHub events only · timestamped; not a claim of coding now.</p></div>';
}
function project(tag,name,text,link,art) {
  return '<article class="one-project one-project-'+art+'">'+
    '<div class="one-project-art" aria-hidden="true"></div>'+
    '<div class="one-project-copy"><p class="one-project-tag">'+esc(tag)+'</p>'+
    '<h2>'+esc(name)+'</h2><p>'+esc(text)+'</p>'+
    '<a href="'+esc(link)+'" aria-label="Read more about '+esc(name)+'">Explore the work ↗</a></div></article>';
}
const home = view("home",renderPrestigeHome({publicFeed,button,spotifyCard}));

const experience = view("experience",
  '<div class="one-inner-layout career-scene">'+
  '<div class="one-inner-intro career-intro">'+
  eyebrow("002 / CAREER","HOW I WORK")+
  '<p class="career-name">DEVON ALAN AKINS <span> / INDEPENDENT PRACTICE</span></p>'+
  '<h1>Design it well.<br><em>Make it work.</em></h1>'+
  '<p class="one-lede">I’m an independent software developer, systems designer, business operator, and author. I connect the experience people see with the engineering and operations that make it useful.</p>'+
  '<p class="career-declaration">My work starts with understanding what is real, not selecting a technology. It ends only when the result is usable, verified, and maintainable.</p>'+
  '<div class="career-practice" aria-label="Three complementary areas of practice">'+
    '<div><span>01 / BUILD</span><strong>Software and systems</strong><small>First-party applications, infrastructure, connected tools</small></div>'+
    '<div><span>02 / OPERATE</span><strong>Practical operations</strong><small>Professional workflows, communication, reliability</small></div>'+
    '<div><span>03 / CREATE</span><strong>Writing and research</strong><small>Original work, technical inquiry, clear explanations</small></div>'+
  '</div>'+
  '<a class="one-detail-link" href="/experience/">Experience, education and background ↗</a>'+
  '</div>'+renderWorkingStandard()+'</div>');

const work = view("work",
  '<div class="one-view-frame">'+
  '<div class="one-view-top">'+eyebrow("003 / MISSIONS","SELECTED CASE STUDIES")+
  '<h1>Work with <em>purpose.</em></h1>'+
  '<p>Only a focused selection appears here. GitHub activity is discovered separately across public repositories.</p></div>'+
  '<div class="one-projects">'+
  project("NONCLINICAL OPERATIONS · CURRENT","Professional operations","Operational systems, coordination and practical technology for professional services.","/work/operations/","operations")+
  project("INDEPENDENT SYSTEMS · IN DEVELOPMENT","DevonStation + Knowledge","Owner-controlled personal operating and knowledge infrastructure. Protected records remain private.","/work/devonstation/","systems")+
  project("PUBLIC ENGINEERING · LIVE WEBSITE","DevonAkins.com","An inspectable website with source-controlled delivery and public signals qualified by provider and date.","/work/","site")+
  '</div></div>');

const activity = view("activity",
  '<div class="one-inner-layout one-activity-layout"><div class="one-inner-intro">'+
  eyebrow("004 / ACTIVITY","PUBLIC ACTIVITY LOG")+
  '<h1>Proof over<br><em>performance.</em></h1>'+
  '<p class="one-lede">A timestamped view of my public GitHub work across repositories, independent of which projects are featured.</p>'+
  '<a href="https://github.com/devonalanakins" target="_blank" rel="noopener noreferrer" class="one-detail-link">Inspect the public GitHub profile ↗</a>'+
  '<div class="one-activity-gpt">'+gptSignalCard()+'</div></div>'+
  '<section class="one-activity-feed one-panel"><header class="one-panel-head">'+brandIcon("github")+
  '<span><strong>PUBLIC EVENTS</strong><small>GitHub · source-qualified</small></span></header>'+
  '<div class="one-activity-tools" role="group" aria-label="Filter GitHub history"><button type="button" data-github-filter="all" aria-pressed="true">All</button><button type="button" data-github-filter="push" aria-pressed="false">Pushes</button><button type="button" data-github-filter="pull_request" aria-pressed="false">PRs</button><button type="button" data-github-filter="issue" aria-pressed="false">Issues</button><button type="button" data-github-filter="release" aria-pressed="false">Releases</button><button type="button" data-github-refresh aria-label="Check GitHub for new public events">Refresh</button></div>'+
  publicFeed("one-activity-github",6)+
  '<p class="one-activity-note">GitHub events are timestamped history. Playback and editor status use separate sources.</p></section></div>');

const writing = view("writing",
  '<div class="one-inner-layout"><div class="one-inner-intro">'+
  eyebrow("005 / CODEX","IDEAS AND ORIGINAL WORLDS")+
  '<h1>Curiosity,<br><em>in practice.</em></h1>'+
  '<p class="one-lede">Writing, mathematics, physics, and careful systems thinking inform the way I build. Original books and creative work develop alongside professional responsibilities.</p>'+
  '<a href="/writing/" class="one-detail-link">More about writing and research ↗</a></div>'+
  '<div class="one-fact-stack one-writing-stack">'+
  '<article><span>BOOKS · REVISION</span><h2>Long-form fiction</h2><p>Revisiting published writing and developing manuscripts.</p></article>'+
  '<article><span>CREATIVE UNIVERSE</span><h2>ANEVUM</h2><p>Original fictional worlds, mythology and storytelling.</p></article>'+
  '<article><span>ONGOING INQUIRY</span><h2>Research notes</h2><p>Engineering, cognition, mathematics and the study of systems.</p></article>'+
  '</div></div>');

const contact = view("contact",
  '<div class="one-contact-layout"><div class="one-inner-intro">'+
  eyebrow("006 / CONTACT","START A CONVERSATION")+
  '<h1>Let’s make<br><em>things work.</em></h1>'+
  '<p class="one-lede">For professional operations, technical systems, engineering or writing inquiries, email is the direct contact route.</p>'+
  '<a class="one-email" href="mailto:devon@anevum.com">devon@anevum.com <span aria-hidden="true">↗</span></a>'+
  '<div class="one-contact-links"><a href="https://github.com/devonalanakins" target="_blank" rel="noopener noreferrer">GitHub ↗</a>'+
  '<a href="https://www.instagram.com/devonalanakins/" target="_blank" rel="noopener noreferrer">Instagram ↗</a>'+
  '<a href="/contact/">Full contact page ↗</a></div></div>'+
  '<div class="one-contact-art" aria-hidden="true"><span></span><span></span><span></span></div></div>');

export function renderOneScreenHome({datedCapture=null,motionAssetAvailable=false}={}) {
  const homeGpt=datedCapture ? renderOneScreenGptSummary(datedCapture) : gptSignalCard();
  const description="Devon Alan Akins — independent software developer, systems designer, business operator and author.";
  return '<!doctype html><html lang="en" class="one-html"><head>'+
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
    '<meta name="theme-color" content="#080d14"><meta name="color-scheme" content="dark">'+
    '<meta name="description" content="'+esc(description)+'">'+
    '<link rel="canonical" href="https://devonakins.com/">'+
    '<meta property="og:type" content="website"><meta property="og:title" content="Devon Akins — Professional Profile & Live Work Record">'+
    '<meta property="og:description" content="'+esc(description)+'">'+
    '<link rel="icon" href="/favicon-32.png"><title>Devon Akins — Independent Developer & Systems Designer</title>'+
    '<link rel="stylesheet" href="/src/professional/site.css">'+
    '<link rel="stylesheet" href="/src/professional/one-screen.css">'+
    '<link rel="stylesheet" href="/src/professional/prestige-profile.css">'+
    '<link rel="stylesheet" href="/src/professional/living-atmosphere.css">'+
    '<link rel="stylesheet" href="/src/professional/concept-console.css">'+
    '<link rel="stylesheet" href="/src/professional/living-studio.css">'+
    '<link rel="preload" as="image" type="image/svg+xml" href="/professional/mission-operations.svg">'+
    '<link rel="preload" as="image" type="image/svg+xml" href="/professional/mission-systems.svg">'+
    '<link rel="preload" as="image" type="image/svg+xml" href="/professional/mission-site.svg">'+
    '<script type="module" src="/src/professional/client.ts"></script>'+
    '<script type="module" src="/src/professional/one-screen.ts"></script><script type="module" src="/src/professional/working-standard.ts"></script>'+
    '<script type="module" src="/src/professional/living-atmosphere.ts"></script>'+ 
    '<script type="module" src="/src/professional/concept-console.ts"></script>'+
    '</head><body class="p-body one-body">'+
    '<a class="one-skip" href="#one-stage">Skip to the content</a>'+
    '<div class="one-world" data-living-scene aria-hidden="true">'+(motionAssetAvailable?'<video class="one-world-video" data-living-video muted autoplay loop playsinline preload="metadata" poster="/professional/living-atmosphere.png"><source src="/professional/living-atmosphere.mp4" type="video/mp4"></video>':'')+'<canvas class="one-world-canvas" data-living-canvas></canvas><div class="one-world-glow"></div><div class="one-world-grid"></div></div>'+
    '<header class="one-header"><a class="one-brand" href="/" aria-label="Devon Akins home">'+
    '<span class="one-brand-mark">DA</span><span class="one-brand-type">DEVON<span>AKINS</span><small>.COM</small></span></a>'+
    '<p class="one-header-descriptor">INDEPENDENT DEVELOPER <span>—</span> FLORIDA / REMOTE</p>'+
    tabs("desktop")+
    '<div class="one-header-actions"><button type="button" class="one-motion-toggle" data-motion-toggle aria-pressed="true" aria-label="Pause background motion" title="Pause background motion"><span class="one-motion-dot" aria-hidden="true"></span><span data-motion-label>Motion on</span></button><a class="one-header-email" href="mailto:devon@anevum.com">CONTACT <span aria-hidden="true">↗</span></a></div></header>'+
    '<main id="one-stage" class="one-stage" tabindex="-1">'+home.replace('<!--ONE_SCREEN_GPT_SLOT-->',homeGpt)+experience+work+activity+writing+contact+'</main>'+
    tabs("mobile")+
    '<footer class="one-footer"><span>© 2026 DEVON ALAN AKINS</span><span class="one-footer-current">ONE MIND. REAL WORK. SOURCE-QUALIFIED SIGNALS.</span>'+
    '<a href="/experience/">EXTENDED PROFILE ↗</a></footer>'+
    '</body></html>';
}
