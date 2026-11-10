import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHandler} from "../src/worker.mjs";
import assets from "../.release/assets.mjs";
import {PROFESSIONAL_ROUTES} from "../src/professional/site.mjs";
import {approvedPublicProjects} from "../src/publication-manifest.mjs";

const site=createHandler(assets,{version:"candidate-check",commit:"candidate"});
const get=async (path,options={})=>site.fetch(new Request("https://devonakins.com"+path,options));
let checked=0;
for(const [key,path] of Object.entries(PROFESSIONAL_ROUTES)){
  const response=await get(path);
  assert.equal(response.status,200,path);
  const html=await response.text();
  assert.match(html,/class="p-body p-page-/);
  assert.match(html,/<main id="main"/);
  assert.match(html,/src="\/assets\/[^"]+\.js"/);
  assert.match(html,/href="\/assets\/[^"]+\.css"/);
  assert.ok(html.includes('href="'+path+'"'));
  for(const match of html.matchAll(/(?:href|src)="(\/[^"#]*)"/g)){
    const link=await get(match[1]);
    assert.ok([200,308].includes(link.status),key+" missing "+match[1]+": "+link.status);
  }
  checked++;
}
for(const project of approvedPublicProjects){
  const url="/work/"+project.slug+"/";
  const response=await get(url);
  assert.equal(response.status,200,url);
  const body=await response.text();
  assert.match(body,/p-page-work/);
  assert.match(body,/What is not claimed/);
  assert.ok(body.includes('rel="canonical" href="https://devonakins.com'+url+'"'));
}
const root=await (await get("/")).text();
assert.match(root,/I build the systems/);
assert.match(root,/Automatic public feed/);
assert.match(root,/\/professional\/headshot-concept\.webp/);
const activity=await (await get("/activity/")).text();
assert.match(activity,/no per-repository selection/i);
assert.match(activity,/data-github-highlights/);
assert.match(activity,/data-github-count/);
assert.match(activity,/data-public-github-feed/);
assert.doesNotMatch(activity,/Pushed 4 commits|Merged pull request #27|Released v0\.4\.0/);
assert.equal((await get("/api/github/public-feed",{method:"HEAD"})).status,200);
for(const visual of ["/professional/headshot-concept.webp","/professional/concept-art.webp"]){
  const response=await get(visual);
  assert.equal(response.status,200,visual);
  assert.match(response.headers.get("Content-Type"),/image\/webp/);
  assert.ok((await response.arrayBuffer()).byteLength>2000,visual+" too small or missing");
}
const css=Object.keys(assets).filter(p=>p.startsWith("/assets/")&&p.endsWith(".css"));
assert.ok(css.length>0);
const base=await readFile("index.html","utf8");
assert.match(base,/p-page-home/);
console.log("Professional candidate: "+checked+" public pages, all same-origin assets resolved and no synthetic feed events.");
