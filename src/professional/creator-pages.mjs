/**
 * Personal creator publication. Static copy only: no feed, guest booking,
 * ownership, pricing, or affiliate status is inferred from an equipment plan.
 */
export const CREATOR_ROUTES=Object.freeze({podcast:"/podcast/",setup:"/setup/"});
export const CREATOR_CATEGORIES=Object.freeze([
  {id:"field",ordinal:"01",label:"Field Kit",subtitle:"Record anywhere",description:"Portable audio tools for interviews and travel. Proposed quantities are shared across workflows, not extra purchases."},
  {id:"stage",ordinal:"02",label:"The Stage",subtitle:"The interview room",description:"Video, lighting and stands for a possible two-person studio. Room layout, compatibility and acoustics are not yet verified."},
  {id:"control",ordinal:"03",label:"Control Room",subtitle:"Edit and publish",description:"The computer, storage and software workflow comes after an inventory of existing equipment."},
  {id:"lab",ordinal:"04",label:"Blackwell Lab",subtitle:"Future research computing",description:"Independent AI hardware and scientific computing experiments, not a requirement for recording a podcast."}
]);
export const CREATOR_GEAR=Object.freeze([
  {id:"p4next",category:"field",kind:"recorder",name:"ZOOM PodTrak P4next",use:"Portable multitrack recording and headphone monitoring.",quantity:"1 proposed",status:"candidate",url:"https://zoomcorp.com/en/us/podtrak-recorders/podcast-recorders/podtrak-p4next/",linkLabel:"Official product"},
  {id:"podmic-usb",category:"field",kind:"mic",name:"RØDE PodMic USB · black",use:"Voice microphones for portable and studio recording. Shared with The Stage; do not count twice.",quantity:"2 proposed · shared",status:"candidate",url:"https://rode.com/en-us/products/podmic-usb",linkLabel:"Official product"},
  {id:"mdr7506",category:"field",kind:"headphones",name:"Sony MDR-7506 headphones",use:"Closed-back monitoring for host and guest. Shared with The Stage.",quantity:"2 proposed · shared",status:"candidate",url:"https://electronics.sony.com/audio/headphones/all-headphones/p/mdr7506",linkLabel:"Official product"},
  {id:"fx30",category:"stage",kind:"camera",name:"Sony FX30 · body only",use:"Possible primary studio video camera; one-camera versus multi-camera is still undecided.",quantity:"1 proposed",status:"candidate",url:"https://electronics.sony.com/imaging/interchangeable-lens-cameras/all-interchangeable-lens-cameras/p/ilmefx30b",linkLabel:"Official product"},
  {id:"sigma-18-50",category:"stage",kind:"lens",name:"Sigma 18–50mm F2.8 DC DN · Sony E-mount",use:"APS-C lens candidate for the proposed Sony camera.",quantity:"1 proposed",status:"candidate",url:"https://www.sigma-global.com/en/lenses/c021_18_50_28/",linkLabel:"Official product"},
  {id:"halo-200x",category:"stage",kind:"light",name:"amaran Halo 200x",use:"Bi-color studio lighting candidate; modifiers, spacing and power remain unchecked.",quantity:"2 proposed",status:"candidate",url:"https://amarancreators.com/pages/amaran-halo-200x",linkLabel:"Official product"},
  {id:"km-2109",category:"stage",kind:"stand",name:"K&M 210/9 microphone stand",use:"Boom stands for two seated interview positions.",quantity:"2 proposed",status:"candidate",url:"https://www.sweetwater.com/store/detail/KM21090--k-and-m-210-9-telescoping-boom-microphone-stand",linkLabel:"Retailer reference"},
  {id:"dgx-spark",category:"lab",kind:"compute",name:"NVIDIA DGX Spark",use:"Long-range local AI compute and model experiments; separate from podcast production costs.",quantity:"Not determined",status:"future",url:"https://www.nvidia.com/en-us/products/workstations/dgx-spark/",linkLabel:"Official product"}
]);
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const statusText=Object.freeze({candidate:"Candidate / proposed",future:"Future / exploratory"});
function glyph(kind){
  const shapes={
    recorder:'<rect x="80" y="18" width="120" height="106" rx="8"/><rect x="99" y="35" width="82" height="25" rx="3"/><circle cx="113" cy="85" r="9"/><circle cx="168" cy="85" r="9"/><path d="M100 107h80"/>',
    mic:'<rect x="116" y="14" width="48" height="75" rx="24"/><path d="M101 64a39 39 0 0 0 78 0M140 102v20m-32 0h64M119 38h42m-42 14h42"/>',
    headphones:'<path d="M79 74V64a61 61 0 0 1 122 0v10"/><rect x="71" y="71" width="27" height="44" rx="9"/><rect x="182" y="71" width="27" height="44" rx="9"/><path d="M98 108l16 8m68-8-16 8"/>',
    camera:'<rect x="65" y="43" width="150" height="70" rx="9"/><circle cx="139" cy="78" r="28"/><circle cx="139" cy="78" r="12"/><path d="M87 43l11-20h52l11 20m32 0V33h14v10"/>',
    lens:'<path d="M100 27h70l20 13v68l-20 13h-70l-12-13V40z"/><path d="M106 27v94m20-94v94m36-94v94"/><ellipse cx="174" cy="74" rx="10" ry="26"/>',
    light:'<rect x="92" y="22" width="96" height="54" rx="3"/><path d="M140 76v46m-35 0h70M92 22l-29-13m125 13 29-13M92 76L63 89m125-13 29 13"/>',
    stand:'<path d="M75 47h88l18-12M163 47l15 15M128 47v75m-25 0h50M128 122l-43 13m43-13 43 13M181 35l16-12"/>',
    compute:'<rect x="67" y="20" width="146" height="106" rx="5"/><path d="M90 44h100M90 64h100M90 84h100M90 104h100"/><circle cx="182" cy="112" r="3"/>'
  };
  return '<svg viewBox="0 0 280 150" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'+(shapes[kind]||shapes.compute)+'</svg>';
}
function navLink(path,label,current){
  return '<a href="'+path+'"'+(path===current?' aria-current="page"':'')+'>'+label+'</a>';
}
function shell(key,main){
  if(!Object.hasOwn(CREATOR_ROUTES,key))throw new RangeError("Unknown creator page");
  const path=CREATOR_ROUTES[key];
  const title=key==="podcast"?"The Mark They Make — Devon Alan Akins":"My Setup — Devon Alan Akins";
  const desc=key==="podcast"?
    "The Mark They Make: an unscripted interview podcast in development, created by Devon Alan Akins. No episodes released yet.":
    "A transparent, evolving equipment plan for The Mark They Make and Devon Alan Akins’s personal creative and research work. Gear ownership not yet verified.";
  return '<!doctype html><html lang="en" class="lab-html"><head>'+
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'+
    '<meta name="theme-color" content="#f3f1e9"><meta name="color-scheme" content="light dark">'+
    '<script src="/laboratory-theme.js"></script>'+
    '<meta name="description" content="'+esc(desc)+'"><title>'+esc(title)+'</title>'+
    '<link rel="canonical" href="https://devonakins.com'+path+'">'+
    '<meta property="og:type" content="website"><meta property="og:title" content="'+esc(title)+'">'+
    '<meta property="og:description" content="'+esc(desc)+'"><meta property="og:url" content="https://devonakins.com'+path+'">'+
    '<meta property="og:image" content="https://devonakins.com/social-card.jpg">'+
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+esc(title)+'">'+
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="apple-touch-icon" href="/apple-touch-icon.png">'+
    '<link rel="stylesheet" href="/src/professional/creator-pages.css">'+
    '</head><body class="creator-body"><a class="pc-skip" href="#pc-main">Skip to content</a>'+
    '<header class="pc-header"><div class="pc-wrap pc-header-row">'+
    '<a class="pc-brand" href="/" aria-label="Devon Akins home"><span>da.</span><small>DEVONAKINS.COM</small></a>'+
    '<nav class="pc-nav" aria-label="Primary navigation">'+
      navLink("/","Home",path)+navLink(CREATOR_ROUTES.podcast,"Podcast",path)+
      navLink(CREATOR_ROUTES.setup,"My Setup",path)+navLink("/work/","Work",path)+
    '</nav></div></header>'+
    '<main id="pc-main">'+main+'</main>'+
    '<footer class="pc-footer pc-wrap"><div><a href="/">da.</a><p>Personal conversations, creative work and independent research.</p></div>'+
    '<nav aria-label="Footer navigation"><a href="/podcast/">Podcast</a><a href="/setup/">My Setup</a><a href="/contact/">Contact</a></nav>'+
    '<small>Devon Alan Akins · This project has no clinical services, patient data or business purchasing system.</small></footer>'+
    '</body></html>';
}
function renderPodcast(){
  return '<div class="pc-wrap">'+
  '<section class="pc-hero" aria-labelledby="pc-title"><div class="pc-hero-copy">'+
    '<p class="pc-eyebrow">THE MARK THEY MAKE / ORIGINAL CONVERSATIONS</p>'+
    '<h1 id="pc-title">The Mark<br><em>They Make.</em></h1>'+
    '<p class="pc-lede">Unscripted conversations about the people, decisions and experiences that leave something behind. Less about the polished story. More about what actually happened.</p>'+
    '<p class="pc-state"><span class="pc-state-dot" aria-hidden="true"></span> IN DEVELOPMENT · NO EPISODES RELEASED</p>'+
    '<div class="pc-actions"><a class="pc-button pc-button-primary" href="#pc-format">About the show <span aria-hidden="true">↗</span></a><a class="pc-button" href="/setup/">Explore my setup <span aria-hidden="true">↗</span></a></div>'+
  '</div><div class="pc-hero-art" aria-hidden="true"><svg viewBox="0 0 540 540" fill="none"><circle cx="270" cy="270" r="205"/><circle cx="270" cy="270" r="145"/><circle cx="270" cy="270" r="88"/><path d="M42 286h55l20-83 38 168 39-254 36 326 44-238 31 126 27-62h166"/><path d="M115 75h310M115 465h310"/></svg><span class="pc-visual-label">VOICE / MEMORY / CONSEQUENCE</span><b>01—</b></div></section>'+
  '<section class="pc-two-column pc-section" id="pc-format" aria-labelledby="pc-format-title"><div><p class="pc-eyebrow">01 / THE PREMISE</p><h2 id="pc-format-title">People leave<br><em>an imprint.</em></h2></div><div class="pc-prose"><p>This is a conversation-first show. I want to hear how people got where they are, what changed them, and the things they learned that rarely fit into a résumé.</p><p>The format is deliberately loose: actual conversations, follow-up questions, and room to go somewhere unexpected.</p><p class="pc-small">Guests and release dates will appear only after they are confirmed.</p></div></section>'+
  '<section class="pc-section pc-release" id="episodes" aria-labelledby="pc-episodes-title"><div class="pc-section-heading"><div><p class="pc-eyebrow">02 / EPISODE ARCHIVE</p><h2 id="pc-episodes-title">The conversations.</h2></div><span class="pc-side-index">NO PUBLIC EPISODES YET</span></div>'+
    '<div class="pc-empty"><div><span class="pc-empty-number">000</span><p>NOT YET RECORDED FOR PUBLICATION</p></div><div><h3>First episode is still ahead.</h3><p>There is no episode feed to follow yet. When episodes are published, this will become the listening and viewing archive. No fake trailers, player buttons or guest announcements.</p></div></div></section>'+
  '<section class="pc-section pc-studio-teaser" aria-labelledby="pc-studio-title"><div><p class="pc-eyebrow">03 / BEHIND THE SHOW</p><h2 id="pc-studio-title">The room is<br><em>part of the story.</em></h2><p>I am documenting how the recording kit, studio and editing environment take shape, including what is still just a plan.</p><a class="pc-button pc-button-primary" href="/setup/">See the studio build <span aria-hidden="true">↗</span></a></div><div class="pc-studio-index"><span>FIELD KIT</span><span>THE STAGE</span><span>CONTROL ROOM</span><span>BLACKWELL LAB / FUTURE</span></div></section>'+
  '<section class="pc-section pc-endnote"><p class="pc-eyebrow">STAY IN THE LOOP</p><h2>The next update will be real.</h2><p>Audio and video platform links will be added after an actual show feed exists. For now, this page documents the project as it develops.</p><a href="mailto:hello@devonakins.com?subject=The%20Mark%20They%20Make">Contact about the show <span aria-hidden="true">↗</span></a></section>'+
  '</div>';
}
function gearCard(item,index){
  if(!/^https:\/\//.test(item.url)||/[?&]utm_|[?&]tag=/.test(item.url))throw new Error("Unsafe or tracked gear reference");
  const state=statusText[item.status];
  if(!state)throw new Error("Unknown gear status");
  return '<article class="pc-product" data-gear-id="'+esc(item.id)+'" data-gear-status="'+esc(item.status)+'">'+
    '<div class="pc-product-plate"><span class="pc-product-index">REF / '+String(index+1).padStart(2,"0")+'</span>'+glyph(item.kind)+'<span class="pc-product-kind">'+esc(item.kind.toUpperCase())+'</span></div>'+
    '<div class="pc-product-info"><span class="pc-product-status pc-product-status-'+esc(item.status)+'">'+esc(state)+'</span>'+
    '<h3>'+esc(item.name)+'</h3><p>'+esc(item.use)+'</p>'+
    '<div class="pc-product-meta"><span>'+esc(item.quantity)+'</span><span>Ownership unverified</span></div>'+
    '<a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">'+esc(item.linkLabel)+' <span aria-hidden="true">↗</span></a></div></article>';
}
function category(category){
  const matches=CREATOR_GEAR.filter(item=>item.category===category.id);
  return '<section class="pc-section pc-category" id="'+esc(category.id)+'" aria-labelledby="pc-cat-'+esc(category.id)+'">'+
    '<div class="pc-section-heading"><div><p class="pc-eyebrow">'+esc(category.ordinal)+' / '+esc(category.subtitle.toUpperCase())+'</p>'+
    '<h2 id="pc-cat-'+esc(category.id)+'">'+esc(category.label)+'</h2><p>'+esc(category.description)+'</p></div><span class="pc-side-index">'+
    (matches.length?matches.length+' REFERENCE ITEMS':'INVENTORY PENDING')+'</span></div>'+
    (matches.length?'<div class="pc-products">'+matches.map(gearCard).join('')+'</div>':
    '<div class="pc-control-empty"><strong>Nothing selected for this section yet.</strong><p>First confirm the computer, phone, displays, drives, headphones, software and available recording space. No workstation purchase is implied.</p></div>')+
    '</section>';
}
function renderSetup(){
  return '<div class="pc-wrap pc-setup">'+
  '<section class="pc-setup-hero"><p class="pc-eyebrow">CREATOR STUDIO / A BUILD IN PUBLIC</p><h1>My Setup<span>.</span></h1>'+
    '<div class="pc-setup-intro"><p>The gear I am considering for my podcast, creative work and research. The useful part is seeing what actually exists and what is still on the drawing board.</p>'+
    '<p><strong>This is currently a proposed build, not an owned-gear list.</strong> No purchases, product quantities, installs or affiliate relationships have been verified.</p></div>'+
    '<div class="pc-facts" role="group" aria-label="Equipment verification status"><div><span>OWNED / VERIFIED</span><strong>Not inventoried</strong></div><div><span>GEAR REFERENCES</span><strong>'+CREATOR_GEAR.length+' entries</strong></div><div><span>AFFILIATE LINKS</span><strong>None configured</strong></div></div>'+
  '</section>'+
  '<nav class="pc-jump" aria-label="Setup sections">'+CREATOR_CATEGORIES.map(c=>'<a href="#'+esc(c.id)+'"><span>'+esc(c.ordinal)+'</span> '+esc(c.label)+'</a>').join('')+'</nav>'+
  CREATOR_CATEGORIES.map(category).join('')+
  '<section class="pc-section pc-ethics"><p class="pc-eyebrow">NOTES / TRANSPARENCY</p><div class="pc-two-column"><h2>What the labels mean.</h2><div class="pc-prose"><p><strong>Candidate / proposed:</strong> a product from the early wishlist, not a confirmed selection or purchase. <strong>Future / exploratory:</strong> a longer-range research idea.</p><p>Portable and studio workflows may use the same microphones and headphones. Those are listed once, not counted as duplicate purchases.</p><p>All links go to ordinary manufacturer or retailer references. I am not representing them as affiliate links, and no commissions are configured. If that changes, the disclosures will change before monetized links appear.</p><p>No product prices are presented because they have not been verified for publication.</p></div></div></section>'+
  '<section class="pc-section pc-next"><p class="pc-eyebrow">NEXT / OWNERSHIP AUDIT</p><h2>Start with what is already here.</h2><p>A room photo and an inventory of existing computer, microphone, headphones, camera, lights and storage will turn this wishlist into an accurate build without duplicated purchases.</p><a class="pc-button pc-button-primary" href="/podcast/">Back to the podcast <span aria-hidden="true">↗</span></a></section>'+
  '</div>';
}
export function renderCreatorPage(path){
  if(path===CREATOR_ROUTES.podcast)return shell("podcast",renderPodcast());
  if(path===CREATOR_ROUTES.setup)return shell("setup",renderSetup());
  throw new RangeError("Unknown creator path");
}
