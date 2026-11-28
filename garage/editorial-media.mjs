// Review-only editorial source projection. Only exact reviewed derivatives may ship.
// Never read original photos, file-library URLs or arbitrary public directories.
import {readFileSync,existsSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
const reviewed=Object.freeze({
  writing:{file:"writing-book-reveal.webp",sha:"ebfc922e2ad979ad10674395fd883b28575390815d8c8ab3dc7a7c231987dc59",alt:"Owner-supplied black and ivory book reveal artwork",caption:"Book reveal artwork · publication status separate"},
  setup:{file:"workshop-books.webp",sha:"a83c68b43a9d56babcc3bbc8a3ea37f470924627e95da874941f325fd38a231b",alt:"Stacked books on a red tool chest",caption:"Actual workshop detail · work in progress"},
  research:{file:"research-study.webp",sha:"3976ba89caee4d52e4c9df15a540c0ed937582c9cd77f05440fe308dffdb5d48",alt:"Discrete mathematics and calculus study books",caption:"Actual study materials · not a research result"},
  learn:{file:"library-books.webp",sha:"40f423c29636b5553946bb5f8095cd93d786bd2b78cbcda2dc8a1697d206427e",alt:"A tightly cropped bookshelf filled with books",caption:"Actual reading collection"}
});
const items=Object.freeze([
  {key:"podcast",href:"/podcast/",title:"Podcast",desc:"Long-form conversations and interviews.",mark:"01",asset:"/professional/podcast-cover.webp",alt:"",caption:"Show artwork"},
  {key:"work",href:"/work/",title:"Work / Projects",desc:"Software, tools and documented engineering work.",mark:"02"},
  {key:"research",href:"/research/",title:"Research",desc:"Mathematics, science and ongoing exploration.",mark:"03"},
  {key:"writing",href:"/fieldnotes/",title:"Writing / Books",desc:"Essays, manuscripts and creative work.",mark:"04"},
  {key:"learn",href:"/courses/",title:"Learn",desc:"Lessons, reading and practical education.",mark:"05"},
  {key:"setup",href:"/setup/",title:"My Setup",desc:"The tools and workspace behind the show.",mark:"06"}
]);
const portrait="/professional/devon-portrait.avif";
const cover="/professional/podcast-cover.webp";
export function readEditorialAssets(root=process.cwd()){
  const assets={};
  for(const [key,record] of Object.entries(reviewed)){
    const file=resolve(root,"garage/editorial-media",record.file);
    if(!existsSync(file))continue;
    const bytes=readFileSync(file);
    if(bytes.length<100||bytes.length>180000||bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WEBP"||createHash("sha256").update(bytes).digest("hex")!==record.sha)throw Error("Unreviewed editorial photo: "+record.file);
    assets[key]={src:"/garage/editorial-media/"+record.file,alt:record.alt,caption:record.caption};
  }
  if(existsSync(resolve(root,"public",portrait.slice(1))))assets.portrait={src:portrait,alt:"Devon outdoors in a backward dark cap and gray graphic hoodie",caption:"Owner-selected photograph"};
  if(existsSync(resolve(root,"public",cover.slice(1))))assets.podcast={src:cover,alt:"",caption:"Podcast artwork"};
  return assets;
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function replaceRegion(html,key,contents){
  const start="<!-- GARAGE_"+key+"_START -->",end="<!-- GARAGE_"+key+"_END -->";
  const a=html.indexOf(start),b=html.indexOf(end);
  if(a<0||b<a||html.indexOf(start,a+start.length)!==-1||html.indexOf(end,b+end.length)!==-1)throw Error("Invalid Garage editorial region: "+key);
  return html.slice(0,a)+contents+html.slice(b+end.length);
}
export function renderEditorialCollection(assets){
  return '<section class="editorial-collection" aria-labelledby="editorial-title"><header><div><p class="eyebrow">THE WORK BEHIND THE SHOW</p><h2 id="editorial-title">Explore the work.</h2></div><p>Real projects, real learning and recorded conversations. More as it is finished.</p></header><div class="editorial-grid">'+items.map(item=>{
    const a=assets[item.key];
    return '<article class="editorial-card"><div class="editorial-card-media">'+(a?'<img src="'+esc(a.src)+'" alt="'+esc(a.alt)+'" loading="lazy" decoding="async">':'<span class="artmark" aria-hidden="true">'+item.mark+'</span>')+'</div><div class="editorial-card-copy"><h3>'+item.title+'</h3><p>'+item.desc+'</p>'+(a?'<small>'+esc(a.caption)+'</small>':'')+'<a class="editorial-card-link" href="'+item.href+'">Explore '+item.title+' <span aria-hidden="true">↗</span></a></div></article>';
  }).join("")+'</div></section>';
}
export function injectEditorialHome(html,assets){
  const a=assets.portrait;
  html=replaceRegion(html,"PORTRAIT",a?'<figure class="hero-portrait"><img src="'+esc(a.src)+'" alt="'+esc(a.alt)+'" width="630" height="840" decoding="async" fetchpriority="high"><figcaption>'+esc(a.caption)+'</figcaption></figure>':'<div class="hero-portrait-fallback" aria-hidden="true"></div>');
  return replaceRegion(html,"EDITORIAL",renderEditorialCollection(assets));
}
export function injectEditorialTheme(html,assets,route){
  if(!html.includes('lab-html')||!html.includes('</head>'))return html;
  if(!/class="[^"]*\blab-html\b[^"]*"/.test(html))return html;
  html=html.replace(/<html\b([^>]*\bclass="[^"]*\blab-html\b[^"]*"[^>]*)>/, '<html$1 data-garage-editorial="true">');
  html=html.replace('</head>','<link rel="stylesheet" href="/garage/creator-theme.css"></head>');
  // On conventional creator pages use a provenance-qualified supporting image;
  // laboratory panel navigation is retained and its content is not restructured.
  const key={"/setup/":"setup","/courses/":"learn"}[route];
  const a=assets[key];
  if(a&&html.includes('<main id="pc-main"')&&html.includes('</main>')){
    html=html.replace('</main>','<figure class="editorial-photo-note"><img src="'+esc(a.src)+'" alt="'+esc(a.alt)+'" loading="lazy" decoding="async"><figcaption>'+esc(a.caption)+'</figcaption></figure></main>');
  }
  return html;
}
