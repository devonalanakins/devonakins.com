import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import assets from "../.release/assets.mjs";
import {createHandler} from "../src/worker.mjs";

const site=createHandler(assets,{version:"one-screen-candidate",commit:"candidate"},{professionalCandidate:true});
const get=path=>site.fetch(new Request("https://devonakins.com"+path));
const home=await (await get("/")).text();
assert.match(home,/class="p-body one-body"/);
assert.match(home,/id="one-stage"/);
assert.match(home,/src="\/assets\/[^"]+\.js"/);
assert.match(home,/href="\/assets\/[^"]+\.css"/);
assert.match(home,/data-public-spotify/);
assert.match(home,/data-public-github-feed/);
assert.match(home,/data-public-gpt/);
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
