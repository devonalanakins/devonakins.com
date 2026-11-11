import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import assets from "../.release/assets.mjs";
import {createHandler} from "../src/worker.mjs";

const site=createHandler(assets,{version:"one-screen-candidate",commit:"candidate"},{professionalCandidate:true});
const get=path=>site.fetch(new Request("https://devonakins.com"+path));
const home=await (await get("/")).text();
assert.match(home,/class="p-body one-body"/);
assert.match(home,/id="one-stage"/);
assert.doesNotMatch(home,/headshot-concept\.webp|one-portrait/);
assert.match(home,/src="\/assets\/[^"]+\.js"/);
assert.match(home,/href="\/assets\/[^"]+\.css"/);
assert.match(home,/data-public-spotify/);
assert.match(home,/data-public-github-feed/);
assert.match(home,/data-public-gpt/);
assert.match(home,/data-living-canvas/);
assert.match(home,/data-motion-toggle/);
if(home.includes('class="one-world-video"')){
  const mp4="/professional/living-atmosphere.mp4";
  const first=await get(mp4);
  assert.equal(first.status,200);
  assert.equal(first.headers.get("Content-Type"),"video/mp4");
  assert.equal(first.headers.get("Accept-Ranges"),"bytes");
  const bytes=new Uint8Array(await first.arrayBuffer());
  assert.ok(bytes.length>1000 && bytes.length<=2_500_000);
  const range=await site.fetch(new Request("https://devonakins.com"+mp4,{headers:{Range:"bytes=0-3"}}));
  assert.equal(range.status,206);
  assert.equal(range.headers.get("Content-Range"),"bytes 0-3/"+bytes.length);
  assert.equal((await range.arrayBuffer()).byteLength,4);
  const poster=await get("/professional/living-atmosphere.png");
  assert.equal(poster.status,200);
  assert.equal(poster.headers.get("Content-Type"),"image/png");
}
for(const value of ["≈3.3B","526.3M","308 MESSAGES","190 PLUGINS","126 SKILLS","Nov 10, 2026"]){
  assert.ok(home.includes(value),"Missing recorded GPT metric "+value);
}
const gptPage=await (await get("/gpt/")).text();
for(const value of ["526,339,878","6,795","≈2.7B","621,712,155"]){
  assert.ok(gptPage.includes(value),"Missing detailed GPT or historical value "+value);
}
assert.doesNotMatch(home+gptPage,/Showcase Sites|Sites by you/);
assert.doesNotMatch(home,/real-time ChatGPT account feed|Active editor session/i);
for(const [,path] of [...home.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)]){
  assert.equal((await get(path)).status,200,"Missing compiled asset "+path);
}
for(const path of ["/experience/","/work/","/activity/","/writing/","/contact/","/listening/","/gpt/","/work/operations/"]){
  const response=await get(path);
  assert.equal(response.status,200,path);
  assert.match(await response.text(),/p-body p-page-/);
}
for(const path of ["/professional/headshot-concept.webp","/professional/concept-art.webp"]){
  assert.equal((await get(path)).status,200,path);
}
assert.equal((await get("/api/github/public-feed")).status,200);
const worker=await readFile(".release/worker.mjs","utf8");
assert.match(worker,/professionalCandidate:true/);
console.log("One-screen candidate: compiled assets, professional deep links, and public API routes verified.");
