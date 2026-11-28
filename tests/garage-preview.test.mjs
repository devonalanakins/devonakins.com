import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const html=readFileSync(new URL("../garage/index.html",import.meta.url),"utf8");
const scene=readFileSync(new URL("../garage/scene.mjs",import.meta.url),"utf8");
test("garage preview is noindex and honest about capture and accounts",()=>{
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(html,/No camera connected/);
  assert.match(html,/Not a live feed/);
  assert.match(html,/No visitor accounts or chat enabled/);
  assert.doesNotMatch(html+scene,/getUserMedia|getDisplayMedia|RTCPeerConnection|requestAnimationFrame|<iframe|<video/i);
});
test("six named perspectives and ordinary link fallbacks",()=>{
  assert.deepEqual([...html.matchAll(/data-zone="([a-z]+)"/g)].map(x=>x[1]),["control","podcast","research","workshop","library","recreation"]);
  for(const path of ["/live/","/podcast/","/research/","/work/","/fieldnotes/","/watch/","/courses/","/about/"])assert.ok(html.includes('href="'+path+'"'));
  assert.match(html,/<noscript>/);
  assert.match(scene,/import\("three"\)/);
  assert.match(scene,/webglcontextlost/);
});
test("built output is explicitly gated and excluded from sitemap",()=>{
  if(!existsSync("dist/index.html"))return;
  const enabled=process.env.GARAGE_SITE_CANDIDATE==="1"&&process.env.LABORATORY_SITE_CANDIDATE==="1";
  assert.equal(existsSync("dist/garage/index.html"),enabled);
  assert.doesNotMatch(readFileSync("dist/sitemap.xml","utf8"),/devonakins\.com\/garage\//);
});
