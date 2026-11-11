import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {renderProfessionalPage,renderProfessionalProjectPage,PROFESSIONAL_PAGES,PROFESSIONAL_ROUTES} from "../src/professional/site.mjs";
import {createHandler} from "../src/worker.mjs";
import assets from "../.release/assets.mjs";

const at=new Date("2026-11-10T20:00:00.000Z");
const event={
  id:"100",type:"PushEvent",public:true,
  actor:{login:"devonalanakins"},
  repo:{name:"devonalanakins/unfeatured-public-repo"},
  created_at:"2026-11-10T19:59:00Z",
  payload:{commits:[{message:"private details must not be rendered"}]},
};
const site=createHandler(assets,{version:"test",commit:"test"},{
  professionalCandidate:true, now:()=>at,cache:null,
  githubFetch:async()=>new Response(JSON.stringify([event]),{headers:{"Content-Type":"application/json"}}),
});
test("professional site has complete independent pages and accessible main navigation",()=>{
  const keys=new Set(PROFESSIONAL_PAGES);
  for(const key of ["home","experience","work","activity","writing","about","contact","listening","gpt"]){
    assert.ok(keys.has(key));
    const html=renderProfessionalPage(key);
    assert.match(html,/<main id="main"/);
    assert.match(html,/<h1[ >]/);
    assert.match(html,/aria-label="Primary"/);
    assert.match(html,/href="#main"/);
    assert.match(html,/name="viewport"/);
    assert.match(html,/src="\/src\/professional\/client.ts"/);
    assert.match(html,/href="\/src\/professional\/site.css"/);
    assert.ok(html.includes('href="'+PROFESSIONAL_ROUTES[key]+'"'));
    assert.doesNotMatch(html,/testimonials?|conversion rate|100% team adoption|62% cycle time/i);
  }
  assert.throws(()=>renderProfessionalPage("unknown"),/Unknown professional page/);
});
test("public work is curated and private-client outcome claims are not fabricated",()=>{
  const html=renderProfessionalPage("work");
  assert.match(html,/Selected technical projects/);
  assert.match(html,/permission and supporting evidence/);
  assert.doesNotMatch(html,/patient name|client record|−62%|\+94%/i);
  assert.match(html,/Independent of the selected portfolio|public GitHub timeline is not/i);
});
test("experience does not invent a bachelor's degree, role dates or unverified Nona metrics",()=>{
  const html=renderProfessionalPage("experience");
  assert.match(html,/Associate of Arts degree/);
  assert.match(html,/not represented as an earned bachelor/);
  assert.doesNotMatch(html,/2021 – Present|2015 – 2018|Business & Technology bachelor's/i);
});
test("public GitHub route returns independently discovered public events, not project selections",async()=>{
  const response=await site.fetch(new Request("https://devonakins.com/api/github/public-feed"));
  assert.equal(response.status,200);
  assert.match(response.headers.get("Content-Type"),/application\/json/);
  assert.equal(response.headers.get("Cache-Control"),"no-store");
  const result=await response.json();
  assert.equal(result.status,"available");
  assert.deepEqual(result.events.map(x=>x.repo),["devonalanakins/unfeatured-public-repo"]);
  assert.doesNotMatch(JSON.stringify(result),/private details must not be rendered|payload|actor/);
  const head=await site.fetch(new Request("https://devonakins.com/api/github/public-feed",{method:"HEAD"}));
  assert.equal(head.status,200);
  assert.equal(await head.text(),"");
  const post=await site.fetch(new Request("https://devonakins.com/api/github/public-feed",{method:"POST"}));
  assert.equal(post.status,405);
});
test("V4 default build does not expose opt-in professional GitHub endpoint",async()=>{
  const v4=createHandler(assets,{version:"test",commit:"test"},{now:()=>at,cache:null});
  for(const method of ["GET","HEAD"]){
    const result=await v4.fetch(new Request("https://devonakins.com/api/github/public-feed",{method}));
    assert.equal(result.status,404,"V4 release must not publish professional endpoint");
  }
  assert.equal((await v4.fetch(new Request("https://devonakins.com/_health"))).status,200);
});
test("professional CSS obeys first-party CSP and supplies mobile/reduced motion styles",async()=>{
  const style=await readFile(new URL("../src/professional/site.css",import.meta.url),"utf8");
  const client=await readFile(new URL("../src/professional/client.ts",import.meta.url),"utf8");
  assert.doesNotMatch(style,/@import|https:\/\/fonts\./);
  assert.match(style,/@media \(max-width:530px\)/);
  assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(client,/textContent=event\.label/);
  assert.match(client,/credentials:"omit"/);
  assert.match(style,/concept-art\.webp/);
  assert.match(style,/headshot/);
  assert.match(client,/data-github-highlights/);
  assert.match(client,/data-github-count/);
});

test("existing approved project details use the new shell without exposing unpublished work",()=>{
  for(const name of ["merit","mizvo","rhen-language","operations","anevum"]){
    const html=renderProfessionalProjectPage(name);
    assert.match(html,/<main id="main"/);
    assert.match(html,/p-page-work/);
    assert.match(html,/Project status/);
    assert.match(html,/What is not claimed/);
    assert.match(html,/href="\/activity\/"/);
  }
  assert.throws(()=>renderProfessionalProjectPage("brandicade"),/Unknown or unpublished project/);
});

test("approved cinematic concept assets remain local, non-executable and separate from project data",async()=>{
  const home=renderProfessionalPage("home");
  const activity=renderProfessionalPage("activity");
  assert.match(home,/\/professional\/headshot-concept\.webp/);
  assert.match(activity,/data-github-count="push"/);
  assert.match(activity,/data-github-highlights/);
  assert.doesNotMatch(activity,/Pushed 4 commits|Release v0\.4\.0|Active today|100% team adoption/);
  for(const path of ["/professional/headshot-concept.webp","/professional/concept-art.webp"]){
    const response=await site.fetch(new Request("https://devonakins.com"+path));
    assert.equal(response.status,200,path);
    assert.equal(response.headers.get("Content-Type"),"image/webp");
    const bytes=new Uint8Array(await response.arrayBuffer());
    assert.equal(new TextDecoder().decode(bytes.slice(0,4)),"RIFF");
    assert.equal(new TextDecoder().decode(bytes.slice(8,12)),"WEBP");
  }
});

test("Spotify, GPT, work and Threads appear as explicit consent-gated source panels",()=>{
  const home=renderProfessionalPage("home");
  const activity=renderProfessionalPage("activity");
  const listening=renderProfessionalPage("listening");
  const gpt=renderProfessionalPage("gpt");
  assert.match(home,/SPOTIFY · IN THE ZONE/);
  assert.match(home,/data-public-spotify/);
  assert.match(home,/data-public-gpt/);
  assert.match(home,/data-public-threads/);
  assert.match(home,/data-public-work/);
  assert.match(home,/data-spotify-ribbon/);
  assert.match(activity,/data-public-spotify/);
  assert.match(activity,/data-public-gpt/);
  assert.match(activity,/data-public-threads/);
  assert.match(listening,/data-public-playlists/);
  assert.match(listening,/data-spotify-cover/);
  assert.match(gpt,/not a manufactured live counter/);
  assert.match(gpt,/data-gpt-value/);
  assert.doesNotMatch(home+activity+listening+gpt,
    /Currently playing: [A-Za-z]+|\+94%|−62%|Pushed 4 commits|listening now to/i);
});
test("Spotify public pages reuse existing consented API and load no third-party script or audio element",async()=>{
  const markup=renderProfessionalPage("listening");
  assert.doesNotMatch(markup,/<audio|<iframe|spotify\.com\/embed|spotify-web-playback/i);
  const bundle=await readFile(new URL("../src/professional/signals.ts",import.meta.url),"utf8");
  assert.match(bundle,/\/api\/listening\/now/);
  assert.match(bundle,/\/api\/listening\/collections/);
  assert.match(bundle,/\/api\/activity\/v4/);
  assert.match(bundle,/publicV5Playback/);
  assert.match(bundle,/ownerCodingFromSpotify/);
  assert.match(bundle,/SPOTIFY SIGNAL/);
  assert.match(bundle,/In the Zone — Coding/);
  assert.match(bundle,/publicV5GptCapture/);
  assert.match(bundle,/publicV5Threads/);
  assert.match(bundle,/referrerPolicy="no-referrer"/);
  assert.match(bundle,/credentials:"omit"/);
  assert.doesNotMatch(bundle,/localStorage|sessionStorage|access_token|refresh_token|new Audio/);
});

test("approved concept palette and brand iconography are implemented without simulated statuses",async()=>{
  const activity=renderProfessionalPage("activity");
  const home=renderProfessionalPage("home");
  assert.match(activity,/p-brand-github/);
  assert.match(activity,/p-brand-spotify/);
  assert.match(activity,/data-spotify-source-state/);
  assert.match(home,/p-brand-spotify/);
  const style=await readFile(new URL("../src/professional/site.css",import.meta.url),"utf8");
  for(const color of ["#0b131b","#e8b987","#82d49c","#c4a2ec","#85c2f3","#eac182"]){
    assert.ok(style.includes(color),"Missing approved palette token "+color);
  }
  for(const variant of ["merged","opened","release","issue"]){
    assert.ok(style.includes('data-variant="'+variant+'"'),
      "Missing accessible event variant styles: "+variant);
  }
  const client=await readFile(new URL("../src/professional/client.ts",import.meta.url),"utf8");
  assert.match(client,/EVENT_ICONS/);
  assert.match(client,/EVENT_CHIPS/);
  assert.match(client,/p-event-meta/);
  assert.match(client,/textContent=EVENT_CHIPS\[variant\]/);
  assert.doesNotMatch(activity,/CONNECTED<\/|LISTENING NOW|Active development across public repos/);
  const marks=await readFile(new URL("../src/professional/brand-icons.mjs",import.meta.url),"utf8");
  assert.match(marks,/viewBox="0 0 24 24"/);
  assert.doesNotMatch(marks,/<script|https?:\/\//);
});


test("professional homepage prioritizes four public-safe work areas over experimental projects",()=>{
  const home=renderProfessionalPage("home");
  assert.match(home,/p-feature-grid p-four/);
  const area=home.match(/<div class="p-feature-grid p-four">([\s\S]*?)<\/div><\/section>/)?.[1];
  assert.ok(area,"Four-card selected work section should exist");
  for(const name of ["Professional operations","DevonStation + Knowledge","Professional business technology","DevonAkins.com"]){
    assert.ok(area.includes(name),"Missing curated card "+name);
  }
  assert.ok(area.indexOf("Professional operations")<area.indexOf("DevonStation + Knowledge"));
  assert.doesNotMatch(area,/Merit|Mizvo|Rhen|Nona Neuropsychology/);
  for(const destination of ["/work/operations/","/work/devonstation/","/work/#professional-technology","/work/#website-engineering"]){
    assert.ok(area.includes('href="'+destination+'"'),"Expected case study destination: "+destination);
  }
});

test("selected work preserves real destinations and nonclinical publication boundaries",()=>{
  const work=renderProfessionalPage("work");
  for(const anchor of ["professional-technology","website-engineering"]){
    assert.ok(work.includes('id="'+anchor+'"'));
  }
  for(const href of ["/work/operations/","/work/devonstation/","/work/ideaflow/","/work/merit/","/work/mizvo/","/work/rhen-language/"]){
    assert.ok(work.includes('href="'+href+'"'),"Missing work link: "+href);
  }
  assert.match(work,/Measured outcomes are not yet published or independently verified/);
  assert.match(work,/nonclinical/i);
  assert.doesNotMatch(work,/Nona Neuropsychology|Cristy Russo|CEO of Nona|report turnaround improved by/);
  const operations=renderProfessionalProjectPage("operations");
  assert.match(operations,/Clients, patients, partners, financial records/);
});

test("responsive curated gallery keeps keyboard focus and reduced-motion styles",async()=>{
  const css=await readFile(new URL("../src/professional/site.css",import.meta.url),"utf8");
  assert.ok(css.includes(".p-feature-grid.p-four{grid-template-columns:repeat(4,minmax(0,1fr))}"));
  assert.ok(css.includes(".p-feature-grid.p-four{grid-template-columns:repeat(2,minmax(0,1fr))}"));
  assert.ok(css.includes(".p-feature-grid.p-four,.p-research-links{grid-template-columns:1fr}"));
  assert.match(css,/\.p-research-links a:focus-visible/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
