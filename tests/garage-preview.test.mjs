import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {renderGarageEpisode,injectGarageEpisode} from "../garage/episode-panel.mjs";
import {podcastPublication} from "../src/professional/podcast-publication.mjs";
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
  assert.deepEqual([...html.matchAll(/data-zone="([a-z]+)"/g)].map(x=>x[1]),["podcast","control","research","workshop","library","recreation"]);
  for(const path of ["/live/","/podcast/","/research/","/work/","/fieldnotes/","/watch/","/courses/","/about/"])assert.ok(html.includes('href="'+path+'"'));
  assert.match(html,/<noscript>/);
  assert.match(scene,/import\("three"\)/);
  assert.match(scene,/webglcontextlost/);
});
test("podcast is primary, personal interests are subordinate",()=>{
  assert.match(html,/<h1 id="title">The Devon Alan Akins <span>Podcast\.<\/span><\/h1>/);
  assert.match(html,/<a class="button primary" href="\/podcast\/"/);
  assert.match(html,/data-zone="podcast" aria-pressed="true"/);
  assert.match(scene,/let selected="podcast"/);
  assert.match(html,/Personal interests/);
});
test("Garage episode projection follows canonical approvals and escapes title and summary",()=>{
  const fixture={approved:true,slug:"first-episode",title:"A <script> test",summary:"Ideas & details",date:"2026-01-01",durationSeconds:61,format:"solo",audio:"/podcast-media/first.mp3"};
  const pub=podcastPublication([{...fixture,approved:false,slug:"draft"},{...fixture,date:"2028-01-01",slug:"future"},fixture],{},"2026-11-27");
  assert.equal(pub.episodes.length,1);
  const projected=renderGarageEpisode(pub);
  assert.match(projected,/A &lt;script&gt; test/);assert.match(projected,/Ideas &amp; details/);
  assert.match(projected,/href="\/podcast\/first-episode\/"/);
  assert.doesNotMatch(projected,/<script>|draft|future|\.mp3/);
  assert.match(renderGarageEpisode({episodes:[]}),/No published episodes yet/);
  assert.throws(()=>renderGarageEpisode({episodes:[{route:"javascript:alert(1)"}]}));
  const result=injectGarageEpisode(html,pub);assert.ok(result.includes(projected));assert.ok(!result.includes("GARAGE_EPISODE_START"));
  assert.throws(()=>injectGarageEpisode("missing",{episodes:[]}));
});
test("built output is explicitly gated and excluded from sitemap",()=>{
  if(!existsSync("dist/index.html"))return;
  const enabled=process.env.GARAGE_SITE_CANDIDATE==="1"&&process.env.LABORATORY_SITE_CANDIDATE==="1";
  assert.equal(existsSync("dist/garage/index.html"),enabled);
  assert.doesNotMatch(readFileSync("dist/sitemap.xml","utf8"),/devonakins\.com\/garage\//);
  if(enabled){const built=readFileSync("dist/garage/index.html","utf8");assert.ok(built.includes(renderGarageEpisode(podcastPublication())));assert.ok(!built.includes("GARAGE_EPISODE_START"));}
});
