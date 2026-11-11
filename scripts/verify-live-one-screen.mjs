#!/usr/bin/env node
/**
 * Post-release read-only acceptance for the separately confirmed one-screen
 * professional homepage. Fails closed on wrong commit, old homepage variant,
 * removed privacy headers, unavailable public GitHub source without fallback,
 * or incorrect dated GPT / Spotify contracts. Never changes owner settings.
 */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PROFESSIONAL_ROUTES} from "../src/professional/site.mjs";
import {approvedPublicProjects} from "../src/publication-manifest.mjs";
import {validPublicListening} from "./validate-public-listening.mjs";
import {BROWSER_GITHUB_SOURCE,readBrowserGithubFallback} from "../src/professional/github-browser-fallback.mjs";

const origin=(process.env.VERIFY_ORIGIN||"https://devonakins.com").replace(/\/+$/,"");
const expectedCommit=process.env.EXPECTED_COMMIT||process.env.GITHUB_SHA;
assert.match(origin,/^https:\/\/[a-z0-9.-]+$/i,"HTTPS origin required");
assert.match(expectedCommit||"",/^[a-f0-9]{40}$/,"Exact deployed commit required");
const release=JSON.parse(await readFile(new URL("../.release/release.json",import.meta.url),"utf8"));
assert.equal(release.commit,expectedCommit,"Tested release artifact must match exact production commit");
assert.match(release.version||"",/^\d+\.\d+\.\d+$/);
const get=(path,init={})=>fetch(origin+path,{
  cache:"no-store",redirect:"manual",signal:AbortSignal.timeout(15000),...init,
});

let healthVerified=false;
for(let attempt=0;attempt<10;attempt++){
  try{
    const response=await get("/_health");
    if(response.status===200){
      const body=await response.json();
      if(body.commit===expectedCommit&&body.version===release.version){
        healthVerified=true;break;
      }
    }
  }catch{}
  if(attempt<9)await new Promise(resolve=>setTimeout(resolve,4000));
}
assert.ok(healthVerified,"Serving Worker does not match exact one-screen release");

const root=await get("/");
assert.equal(root.status,200,"One-screen homepage");
assert.match(root.headers.get("content-type")||"",/text\/html/i);
assert.match(root.headers.get("content-security-policy")||"",/frame-ancestors 'none'/);
assert.match(root.headers.get("content-security-policy")||"",
  /connect-src 'self' https:\/\/api\.github\.com;/,
  "Professional GitHub browser-direct fallback must remain permitted");
assert.equal(root.headers.get("x-content-type-options"),"nosniff");
const html=await root.text();
assert.match(html,/<html[^>]*class="one-html"/);
assert.match(html,/class="p-body one-body"/);
assert.match(html,/<main id="one-stage"/);
assert.match(html,/role="tablist"/);
assert.equal((html.match(/role="tabpanel"/g)||[]).length,6,
  "All six one-viewport navigation panels must be present");
assert.match(html,/\/assets\/[^"]+\.css/);
assert.match(html,/\/assets\/[^"]+\.js/);
assert.doesNotMatch(html,/one-portrait|headshot-concept\.webp/,
  "The homepage must be portrait-free");
assert.match(html,/data-public-github-feed/);
assert.match(html,/data-public-spotify/);
assert.match(html,/data-public-gpt/,
  "Activity view retains consent-filtered GPT data");
assert.match(html,/class="one-gpt-record"/,
  "Homepage must present dated owner-recorded GPT statistics");
for(const value of ["≈3.3B","526.3M","308 MESSAGES","190 PLUGINS",
  "126 SKILLS","Nov 10, 2026"]){
  assert.ok(html.includes(value),"Latest owner capture missing from homepage: "+value);
}
assert.doesNotMatch(html,/SYNTHETIC QA FIXTURE|SYNTHETIC TEST DATA|noindex,nofollow|Currently coding now/i);
assert.match(html,/rel="canonical" href="https:\/\/devonakins\.com\/"/);

const routes=[...new Set([...Object.values(PROFESSIONAL_ROUTES),
  ...approvedPublicProjects.map(p=>"/work/"+p.slug+"/")])]
  .filter(path=>path!=="/");
for(const path of routes){
  const response=await get(path);
  assert.equal(response.status,200,"Missing preserved professional route "+path);
  assert.match(response.headers.get("content-type")||"",/text\/html/i,path);
  const body=await response.text();
  assert.match(body,/class="p-body p-page-/,path);
  assert.ok(body.includes('rel="canonical" href="https://devonakins.com'+path+'"'),path);
}
const capturePath="/gpt/snapshots/2026-11-10.json";
const localCapture=JSON.parse(await readFile(
  new URL("../dist/gpt/snapshots/2026-11-10.json",import.meta.url),"utf8"));
const publishedCapture=await get(capturePath);
assert.equal(publishedCapture.status,200,"Dated GPT source not published");
assert.match(publishedCapture.headers.get("content-type")||"",/json/i);
assert.deepEqual(await publishedCapture.json(),localCapture,
  "Production GPT record differs from approved static capture");
const gptPage=await (await get("/gpt/")).text();
for(const value of ["526,339,878","6,795","≈2.7B","621,712,155"]){
  assert.ok(gptPage.includes(value),"GPT detail/historical value missing: "+value);
}
assert.doesNotMatch(html+gptPage,/Showcase Sites|Sites by you/);

const githubResponse=await get("/api/github/public-feed");
assert.equal(githubResponse.status,200,"Public GitHub events endpoint");
assert.match(githubResponse.headers.get("content-type")||"",/json/i);
assert.match(githubResponse.headers.get("cache-control")||"",/no-store/i);
const github=await githubResponse.json();
assert.equal(github.version,1);
assert.ok(["GitHub public events API","GitHub public Atom feed"].includes(github.source));
assert.ok(["available","empty","unavailable"].includes(github.status));
assert.ok(Array.isArray(github.events)&&github.events.length<=32);
if(github.status==="unavailable"){
  let corsAllowed=false;
  const fallback=await readBrowserGithubFallback({fetcher:async(url,opts)=>{
    const response=await fetch(url,{
      ...opts,headers:{...opts.headers,Origin:"https://devonakins.com"},
    });
    corsAllowed=["*","https://devonakins.com"].includes(
      response.headers.get("access-control-allow-origin"));
    return response;
  }});
  assert.ok(corsAllowed&&fallback?.source===BROWSER_GITHUB_SOURCE&&
    ["available","empty"].includes(fallback.status)&&Array.isArray(fallback.events),
  "Public GitHub feed unavailable and real CORS fallback was not verified");
}
for(const event of github.events){
  assert.deepEqual(Object.keys(event).sort(),["at","kind","label","repo","url"]);
  assert.match(event.repo,/^devonalanakins\/[A-Za-z0-9_.-]+$/);
  assert.equal(event.url,"https://github.com/"+event.repo);
}
assert.doesNotMatch(JSON.stringify(github),/access_token|client_secret|commit_message|private_client/i);

const listeningResponse=await get("/api/listening/now");
assert.equal(listeningResponse.status,200);
assert.match(listeningResponse.headers.get("cache-control")||"",/no-store/i);
const listening=await listeningResponse.json();
assert.ok(validPublicListening(listening),"Spotify presence must respect owner sharing");
if(listening.mode==="hidden")assert.equal(listening.detailsVisible,false);
assert.doesNotMatch(JSON.stringify(listening),/access_token|refresh_cipher|client_secret|device_id|user_id/i);
const activityResponse=await get("/api/activity/v4");
assert.equal(activityResponse.status,200);
assert.match(activityResponse.headers.get("cache-control")||"",/no-store/i);
const activity=await activityResponse.json();
assert.equal(activity.version,4);
assert.ok(["hidden","public"].includes(activity.work?.visibility));
assert.ok(["hidden","public"].includes(activity.remote?.visibility));
if(activity.remote?.visibility==="hidden")assert.deepEqual(activity.remote.tasks,[]);

for(const path of ["/source/","/v2/","/studio/"]){
  const response=await get(path);
  assert.equal(response.status,200,"Preserved historical route "+path);
  assert.doesNotMatch(response.headers.get("content-security-policy")||"",
    /api\.github\.com/,"Legacy/owner pages must keep self-only CSP");
}
for(const path of ["/professional/concept-art.webp",
  "/professional/headshot-concept.webp"]){
  // Retain resources for extended pages but do not insert them on Home.
  const response=await get(path);
  assert.equal(response.status,200,"Unrelated professional assets retained: "+path);
}
assert.equal((await get("/__v5_preview__/")).status,404);
assert.equal((await get("/api/github/public-feed",{method:"POST"})).status,405);
const head=await get("/api/github/public-feed",{method:"HEAD"});
assert.equal(head.status,200);
assert.equal(await head.text(),"");
assert.equal((await get("/not-a-real-route/")).status,404);
console.log("Verified one-screen website at exact commit "+expectedCommit+
  ": six-panel portrait-free homepage, dated GPT and history, public GitHub source"+
  " with browser fallback, consent-filtered listening, preserved routes, and privacy checks.");
