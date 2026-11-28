import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {renderGarageEpisode,injectGarageEpisode} from "../garage/episode-panel.mjs";
import {podcastPublication} from "../src/professional/podcast-publication.mjs";
import {garageBuildMode} from "../garage/build-mode.mjs";
import {injectEditorialHome,renderEditorialCollection,injectEditorialTheme,readEditorialAssets} from "../garage/editorial-media.mjs";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
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
  assert.match(html,/id="studio-fallback-note"/);
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
test("editorial media uses reviewed assets only and honest placeholders",()=>{
  const output=injectEditorialHome(html,{});
  assert.doesNotMatch(output,/<img src="\/garage\/editorial-media\//);
  assert.match(output,/editorial-card/);
  assert.match(output,/hero-portrait-fallback/);
  assert.doesNotMatch(output,/GARAGE_PORTRAIT_START|GARAGE_EDITORIAL_START/);
  const rendered=renderEditorialCollection({writing:{src:"/garage/editorial-media/writing-book-reveal.webp",alt:"A <script>",caption:"Book & art"}});
  assert.match(rendered,/A &lt;script&gt;/);assert.match(rendered,/Book &amp; art/);
  const temp=mkdtempSync(join(tmpdir(),"garage-photo-"));
  try{
    assert.deepEqual(readEditorialAssets(temp),{});
    mkdirSync(join(temp,"garage/editorial-media"),{recursive:true});
    writeFileSync(join(temp,"garage/editorial-media/writing-book-reveal.webp"),"not an approved photo");
    assert.throws(()=>readEditorialAssets(temp),/Unreviewed editorial photo/);
  }finally{rmSync(temp,{recursive:true,force:true});}
  const page='<html class="lab-html"><head></head><body><main id="pc-main"></main></body></html>';
  assert.match(injectEditorialTheme(page,{},"/courses/"),/data-garage-editorial="true"/);
  assert.doesNotMatch(injectEditorialTheme(page,{},"/courses/"),/editorial-photo-note/);
  assert.equal(injectEditorialTheme('<html><head></head></html>',{},"/v2/"),'<html><head></head></html>');
});
test("homepage requires both explicit candidate flags",()=>{
  assert.deepEqual(garageBuildMode({}),{preview:false,home:false});
  assert.deepEqual(garageBuildMode({LABORATORY_SITE_CANDIDATE:"1"}),{preview:false,home:false});
  assert.throws(()=>garageBuildMode({GARAGE_HOME_CANDIDATE:"1"}));
  assert.throws(()=>garageBuildMode({GARAGE_SITE_CANDIDATE:"1"}));
  assert.throws(()=>garageBuildMode({GARAGE_HOME_CANDIDATE:"1",LABORATORY_SITE_CANDIDATE:"1"}));
  assert.deepEqual(garageBuildMode({GARAGE_SITE_CANDIDATE:"1",LABORATORY_SITE_CANDIDATE:"1"}),{preview:true,home:false});
  assert.deepEqual(garageBuildMode({GARAGE_SITE_CANDIDATE:"1",LABORATORY_SITE_CANDIDATE:"1",GARAGE_HOME_CANDIDATE:"1"}),{preview:true,home:true});
});
test("built output is explicitly gated and excluded from sitemap",()=>{
  if(!existsSync("dist/index.html"))return;
  const {preview:enabled,home}=garageBuildMode();
  const root=readFileSync("dist/index.html","utf8");
  assert.equal(root.includes('data-garage-preview="true"'),home);
  if(home){assert.ok(root.includes(renderGarageEpisode(podcastPublication())));assert.match(root,/name="robots" content="noindex,nofollow"/);assert.ok(!root.includes("GARAGE_EPISODE_START"));assert.match(root,/editorial-grid/);assert.match(readFileSync("dist/podcast/index.html","utf8"),/data-garage-editorial="true"/);}
  assert.equal(existsSync("dist/garage/index.html"),enabled);
  assert.doesNotMatch(readFileSync("dist/sitemap.xml","utf8"),/devonakins\.com\/garage\//);
  if(enabled){const built=readFileSync("dist/garage/index.html","utf8");assert.ok(built.includes(renderGarageEpisode(podcastPublication())));assert.ok(!built.includes("GARAGE_EPISODE_START"));}
});
