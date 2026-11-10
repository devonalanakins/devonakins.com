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
  now:()=>at,cache:null,
  githubFetch:async()=>new Response(JSON.stringify([event]),{headers:{"Content-Type":"application/json"}}),
});
test("professional site has complete independent pages and accessible main navigation",()=>{
  const keys=new Set(PROFESSIONAL_PAGES);
  for(const key of ["home","experience","work","activity","writing","about","contact"]){
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
test("professional CSS obeys first-party CSP and supplies mobile/reduced motion styles",async()=>{
  const style=await readFile(new URL("../src/professional/site.css",import.meta.url),"utf8");
  const client=await readFile(new URL("../src/professional/client.ts",import.meta.url),"utf8");
  assert.doesNotMatch(style,/@import|https:\/\/fonts\./);
  assert.match(style,/@media \(max-width:530px\)/);
  assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(client,/textContent=event\.label/);
  assert.match(client,/credentials:"omit"/);
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
