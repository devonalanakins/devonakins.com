import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {
  BROWSER_GITHUB_SOURCE,readBrowserGithubFallback,
} from "../src/professional/github-browser-fallback.mjs";

const at=new Date("2026-11-11T02:30:00.000Z");
const event=(name="unfeatured-public-work",extra={})=>({
  id:"123456",type:"PushEvent",public:true,
  actor:{login:"devonalanakins"},
  repo:{name:"devonalanakins/"+name},
  created_at:"2026-11-11T02:29:00Z",
  payload:{commits:[{message:"confidential-looking raw provider field"}]},
  ...extra,
});
const json=(body,status=200,headers={})=>new Response(
  JSON.stringify(body),
  {status,headers:{"Content-Type":"application/json",...headers}},
);

test("browser-direct public GitHub projection is bounded and excludes raw/unowned data",async()=>{
  let request;
  const result=await readBrowserGithubFallback({
    clock:()=>at,
    fetcher:async(url,init)=>{
      request={url:String(url),init};
      return json([
        event(),event("private",{public:false}),
        event("other",{actor:{login:"someone-else"}}),
        event("knowledge",{type:"PullRequestEvent"}),
        event("injected",{repo:{name:"evil/other-repo"}}),
      ]);
    },
  });
  assert.equal(result?.source,BROWSER_GITHUB_SOURCE);
  assert.equal(result?.status,"available");
  assert.deepEqual(result?.events.map(x=>x.repo),[
    "devonalanakins/unfeatured-public-work","devonalanakins/knowledge",
  ]);
  assert.deepEqual(Object.keys(result.events[0]).sort(),[
    "at","kind","label","repo","url",
  ]);
  assert.equal(result.events[0].url,"https://github.com/devonalanakins/unfeatured-public-work");
  assert.doesNotMatch(JSON.stringify(result),/confidential-looking|evil\/other-repo/);
  assert.equal(request.url,"https://api.github.com/users/devonalanakins/events/public?per_page=100");
  assert.equal(request.init.credentials,"omit");
  assert.equal(request.init.mode,"cors");
  assert.equal(request.init.referrerPolicy,"no-referrer");
  assert.equal(request.init.redirect,"error");
  assert.equal(request.init.cache,"no-store");
  assert.equal(request.init.method,"GET");
  assert.equal(request.init.headers.Accept,"application/vnd.github+json");
});

test("browser rescue preserves honest empty state when provider has no eligible activity",async()=>{
  const output=await readBrowserGithubFallback({
    clock:()=>at,fetcher:async()=>json([event("not-public",{public:false})]),
  });
  assert.equal(output.status,"empty");
  assert.deepEqual(output.events,[]);
  assert.equal(output.source,BROWSER_GITHUB_SOURCE);
});

test("browser rescue fails closed for rate limits, malformed responses, abuse and network failures",async()=>{
  const outcomes=[
    async()=>json({message:"API rate limit exceeded"},403),
    async()=>new Response("rate limited",{status:429,headers:{"Content-Type":"text/plain"}}),
    async()=>json({error:"unexpected object"}),
    async()=>new Response("not JSON",{status:200,headers:{"Content-Type":"application/json"}}),
    async()=>json([event()],200,{"Content-Length":"2000001"}),
    async()=>new Response(JSON.stringify([event()]),{status:200,headers:{"Content-Type":"text/html"}}),
    async()=>{throw new TypeError("CORS denied");},
  ];
  for(const fetcher of outcomes){
    const result=await readBrowserGithubFallback({clock:()=>at,fetcher});
    assert.equal(result,null,"invalid response must not invent user activity");
  }
  assert.equal(await readBrowserGithubFallback({
    clock:()=>new Date(NaN),fetcher:async()=>json([event()]),
  }),null);
});

test("professional UI source attribution and limited CSP are present in the real source",async()=>{
  const client=await readFile(new URL("../src/professional/client.ts",import.meta.url),"utf8");
  const worker=await readFile(new URL("../src/worker.mjs",import.meta.url),"utf8");
  assert.match(client,/readBrowserGithubFallback\(\)/);
  assert.match(client,/body\.status==="unavailable"/);
  assert.match(client,/GitHub API fetched directly by this browser/);
  assert.match(client,/GitHub API queried directly by this browser/);
  assert.match(client,/BROWSER_GITHUB_SOURCE/);
  assert.match(worker,/connect-src 'self' https:\/\/api\.github\.com;/);
  assert.match(worker,/securityHeaders\["Content-Security-Policy"\]\.replace/);
  assert.match(worker,/options\.professionalCandidate === true && status === 200 && isHtml/);
  assert.doesNotMatch(worker,/connect-src [^;]*https:\/\/github\.com/);
});

test("cross-origin GitHub permission is scoped to professional public HTML, not private V2",async()=>{
  const {createHandler}=await import("../src/worker.mjs");
  const {default:assets}=await import("../.release/assets.mjs");
  const request=path=>new Request("https://devonakins.com"+path);
  const professional=createHandler(assets,{version:"test",commit:"test"},{
    professionalCandidate:true,now:()=>at,cache:null,
  });
  const publicPage=await professional.fetch(request("/"));
  assert.equal(publicPage.status,200);
  assert.match(publicPage.headers.get("content-security-policy")||"",
    /connect-src 'self' https:\/\/api\.github\.com;/);
  const legacy=await professional.fetch(request("/v2/"));
  assert.equal(legacy.status,200);
  assert.match(legacy.headers.get("content-security-policy")||"",
    /connect-src 'self';/);
  assert.doesNotMatch(legacy.headers.get("content-security-policy")||"",/api\.github\.com/);
  const v4=createHandler(assets,{version:"test",commit:"test"},{
    now:()=>at,cache:null,
  });
  const oldHome=await v4.fetch(request("/"));
  assert.equal(oldHome.status,200);
  assert.doesNotMatch(oldHome.headers.get("content-security-policy")||"",/api\.github\.com/);
});
