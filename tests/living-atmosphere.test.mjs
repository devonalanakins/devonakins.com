import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {gzipSync} from "node:zlib";
import {renderOneScreenHome} from "../src/professional/one-screen.mjs";
import {createHandler} from "../src/worker.mjs";

test("the optional 1080p video and reactive canvas are separate from real public content",()=>{
  const noVideo=renderOneScreenHome();
  const withVideo=renderOneScreenHome({motionAssetAvailable:true});
  assert.doesNotMatch(noVideo,/<video /);
  assert.match(withVideo,/<video class="one-world-video"/);
  assert.match(withVideo,/muted autoplay loop playsinline/);
  assert.match(withVideo,/src="\/professional\/living-atmosphere\.mp4"/);
  assert.match(withVideo,/poster="\/professional\/living-atmosphere\.png"/);
  assert.match(withVideo,/data-living-canvas/);
  assert.match(withVideo,/data-motion-toggle/);
  assert.match(withVideo,/src="\/src\/professional\/living-atmosphere\.ts"/);
  assert.match(withVideo,/data-public-github-feed/);
  assert.match(withVideo,/data-public-spotify/);
  assert.match(withVideo,/data-public-work/);
  assert.match(withVideo,/data-public-gpt/);
  assert.doesNotMatch(withVideo,/fake metrics|rendered dashboard video|live coding confirmed/i);
});
test("video is original source-generated artwork; no vendor or client content",async()=>{
  const source=await readFile(new URL("../scripts/generate-living-atmosphere.mjs",import.meta.url),"utf8");
  assert.match(source,/const W=1920,H=1080,FPS=24,FRAMES=96/);
  assert.match(source,/libx264/);
  assert.match(source,/faststart/);
  // Cinematic detail is built with real fibers, not giant circle silhouettes.
  assert.match(source,/neuralBrain\(\)/);
  assert.doesNotMatch(source,/<ellipse\s/);
  assert.match(source,/ffmpeg unavailable/);
  assert.doesNotMatch(source,/fetch\(|secret|token|clinical/i);
  const pages=await readFile(new URL("../scripts/pages.mjs",import.meta.url),"utf8");
  assert.match(pages,/ONE_SCREEN_SITE_CANDIDATE/);
  assert.match(pages,/generate-living-atmosphere.mjs/);
  const packer=await readFile(new URL("../scripts/build-worker.mjs",import.meta.url),"utf8");
  assert.match(packer,/"\.mp4": "video\/mp4"/);
});
test("motion respects preferences, page visibility and an explicit pause button",async()=>{
  const js=await readFile(new URL("../src/professional/living-atmosphere.ts",import.meta.url),"utf8");
  const css=await readFile(new URL("../src/professional/living-atmosphere.css",import.meta.url),"utf8");
  for(const term of ["prefers-reduced-motion","saveData","visibilitychange","requestAnimationFrame","data-motion-toggle"])
    assert.ok(js.includes(term),"Missing motion control: "+term);
  assert.match(js,/video\.play\(\)\.catch/);
  assert.match(js,/video\?\.pause\(\)/);
  assert.doesNotMatch(js,/createRadialGradient|context\.arc\(/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/\.one-world-video/);
  assert.doesNotMatch(css,/@import|https?:\/\//);
});
test("Cloudflare Worker supports same-origin MP4 range and HEAD requests",async()=>{
  const original=Buffer.from(Array.from({length:40},(_,i)=>i));
  const asset={type:"video/mp4",gzip:gzipSync(original).toString("base64"),etag:'"media-test"'};
  const notFound={type:"text/html; charset=utf-8",gzip:gzipSync(Buffer.from("404")).toString("base64"),etag:'"notfound"'};
  const handler=createHandler({"/professional/living-atmosphere.mp4":asset,"/404/index.html":notFound},
    {version:"test",commit:"test"},{professionalCandidate:true});
  const url="https://devonakins.com/professional/living-atmosphere.mp4";
  let r=await handler.fetch(new Request(url));
  assert.equal(r.status,200);
  assert.equal(r.headers.get("Content-Type"),"video/mp4");
  assert.equal(r.headers.get("Accept-Ranges"),"bytes");
  assert.deepEqual(Buffer.from(await r.arrayBuffer()),original);
  r=await handler.fetch(new Request(url,{headers:{Range:"bytes=5-12"}}));
  assert.equal(r.status,206);
  assert.equal(r.headers.get("Content-Range"),"bytes 5-12/40");
  assert.equal(r.headers.get("Content-Length"),"8");
  assert.deepEqual(Buffer.from(await r.arrayBuffer()),original.subarray(5,13));
  r=await handler.fetch(new Request(url,{headers:{Range:"bytes=-4"}}));
  assert.equal(r.status,206);
  assert.deepEqual(Buffer.from(await r.arrayBuffer()),original.subarray(36));
  r=await handler.fetch(new Request(url,{headers:{Range:"bytes=100-150"}}));
  assert.equal(r.status,416);
  assert.equal(r.headers.get("Content-Range"),"bytes */40");
  r=await handler.fetch(new Request(url,{method:"HEAD"}));
  assert.equal(r.status,200);
  assert.equal(r.headers.get("Content-Length"),"40");
  assert.equal(await r.text(),"");
});
