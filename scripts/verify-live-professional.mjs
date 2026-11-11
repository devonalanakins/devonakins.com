#!/usr/bin/env node
/**
 * Read-only production acceptance for the explicitly approved professional
 * website variant. Never grants publication consent or changes runtime gates.
 */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PROFESSIONAL_ROUTES} from "../src/professional/site.mjs";
import {approvedPublicProjects} from "../src/publication-manifest.mjs";
import {validPublicListening} from "./validate-public-listening.mjs";

const origin=(process.env.VERIFY_ORIGIN||"https://devonakins.com").replace(/\/+$/,"");
const expectedCommit=process.env.EXPECTED_COMMIT||process.env.GITHUB_SHA;
assert.match(origin,/^https:\/\/[a-z0-9.-]+$/i,"HTTPS origin required");
assert.match(expectedCommit||"",/^[a-f0-9]{40}$/,"Exact commit required");
const release=JSON.parse(await readFile(new URL("../.release/release.json",import.meta.url),"utf8"));
assert.equal(release.commit,expectedCommit,"Built release commit mismatch");
assert.match(release.version||"",/^\d+\.\d+\.\d+$/);
const get=(path,init={})=>fetch(origin+path,{
  cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(15000),...init,
});
let healthVerified=false;
for(let attempt=0;attempt<10;attempt++){
  try {
    const res=await get("/_health");
    if(res.status===200){
      const v=await res.json();
      if(v.commit===expectedCommit&&v.version===release.version){
        healthVerified=true;break;
      }
    }
  } catch {}
  if(attempt<9)await new Promise(resolve=>setTimeout(resolve,4000));
}
assert.ok(healthVerified,"Worker does not serve the exact professional release");
const all=[...new Set([...Object.values(PROFESSIONAL_ROUTES),
  ...approvedPublicProjects.map(x=>"/work/"+x.slug+"/")])];
for(const path of all){
  const res=await get(path);
  assert.equal(res.status,200,"Missing professional route "+path);
  assert.match(res.headers.get("content-type")||"",/text\/html/i,path);
  assert.match(res.headers.get("content-security-policy")||"",/frame-ancestors 'none'/i,path);
  assert.equal(res.headers.get("x-content-type-options"),"nosniff",path);
  const html=await res.text();
  assert.match(html,/class="p-body p-page-/,path+" must use professional shell");
  assert.match(html,/<main id="main"/,path);
  assert.match(html,/<h1\b/,path);
  assert.ok(html.includes('rel="canonical" href="https://devonakins.com'+path+'"'),path+" canonical");
  assert.doesNotMatch(html,/__v5_preview__|SYNTHETIC QA FIXTURE|SYNTHETIC TEST DATA|noindex,nofollow/i);
  if(path==="/"){
    assert.match(html,/I build the systems/);
    assert.match(html,/p-feature-grid p-four/);
    assert.match(html,/DevonStation \+ Knowledge/);
    assert.match(html,/data-public-github-feed/);
    assert.match(html,/data-public-spotify/);
  }
  if(path==="/work/"){
    assert.match(html,/Measured outcomes are not yet published or independently verified/);
    assert.doesNotMatch(html,/Nona Neuropsychology|Cristy Russo|CEO of Nona/);
  }
}
for(const path of ["/professional/headshot-concept.webp","/professional/concept-art.webp"]){
  const res=await get(path);
  assert.equal(res.status,200,"Missing professional art "+path);
  assert.match(res.headers.get("content-type")||"",/image\/webp/i,path);
}
const feedRes=await get("/api/github/public-feed");
assert.equal(feedRes.status,200,"GitHub public feed endpoint");
assert.match(feedRes.headers.get("content-type")||"",/application\/json/i);
assert.match(feedRes.headers.get("cache-control")||"",/no-store/i);
const feed=await feedRes.json();
assert.equal(feed.version,1);
assert.ok(["GitHub public events API","GitHub public Atom feed"].includes(feed.source),"GitHub feed must name actual verified public source");
assert.ok(["available","empty","unavailable"].includes(feed.status));
assert.ok(Array.isArray(feed.events)&&feed.events.length<=32);
for(const event of feed.events){
  assert.deepEqual(Object.keys(event).sort(),["at","kind","label","repo","url"]);
  assert.match(event.repo,/^devonalanakins\/[A-Za-z0-9_.-]+$/);
  assert.equal(event.url,"https://github.com/"+event.repo);
}
assert.doesNotMatch(JSON.stringify(feed),/access_token|client_secret|commit_message|private_client/i);
const listeningRes=await get("/api/listening/now");
assert.equal(listeningRes.status,200,"Public Spotify presence endpoint");
assert.match(listeningRes.headers.get("content-type")||"",/application\/json/i);
assert.match(listeningRes.headers.get("cache-control")||"",/no-store/i);
assert.match(listeningRes.headers.get("cdn-cache-control")||"",/no-store/i);
const listening=await listeningRes.json();
assert.ok(validPublicListening(listening),"Spotify playback must be consent-filtered with bounded allowlisted fields");
if(listening.mode==="hidden")assert.equal(listening.detailsVisible,false);
assert.doesNotMatch(JSON.stringify(listening),/access_token|refresh_cipher|client_secret|device_id|user_id/i);
const activity=await get("/api/activity/v4");
assert.equal(activity.status,200,"Previously approved consent-filtered signals must remain available");
assert.match(activity.headers.get("cache-control")||"",/no-store/i);
const snapshot=await activity.json();
assert.equal(snapshot.version,4);
assert.ok(["hidden","public"].includes(snapshot.work?.visibility));
assert.ok(["hidden","public"].includes(snapshot.remote?.visibility));
if(snapshot.remote?.visibility==="hidden")assert.deepEqual(snapshot.remote.tasks,[]);
for(const path of ["/source/","/v2/","/studio/"]){
  assert.equal((await get(path)).status,200,"Legacy route lost: "+path);
}
assert.equal((await get("/__v5_preview__/")).status,404,"V5 preview must remain unavailable");
assert.equal((await get("/api/github/public-feed",{method:"POST"})).status,405);
const head=await get("/api/github/public-feed",{method:"HEAD"});
assert.equal(head.status,200);assert.equal(await head.text(),"");
assert.equal((await get("/not-a-real-route/")).status,404);
console.log("Verified professional site at "+expectedCommit+": "+all.length+
  " reviewed routes, exact Worker, public GitHub contract, consent-gated signals, legacy paths and privacy checks.");
