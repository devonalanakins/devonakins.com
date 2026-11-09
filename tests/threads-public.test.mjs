import test from "node:test";
import assert from "node:assert/strict";
import {
  threadsApproved,publicThreadsPosts,createPublicThreadsReader,disconnectedThreads,probeThreadsAuthorization,
} from "../src/threads-public.mjs";

const now=Date.parse("2026-11-07T20:00:00.000Z");
const env={
  PRESENCE_ENABLED:"true",PRESENCE_PUBLIC_RELEASE_APPROVED:"true",
  THREADS_PUBLIC_RELEASE_APPROVED:"true",THREADS_PUBLIC_FEED_ENABLED:"true",
  THREADS_USER_ACCESS_TOKEN:"x".repeat(40),THREADS_PUBLIC_USERNAME:"fixtureDevon",
};
const row=(id="123456789",text="Build log: shipping a verified project")=>({
  id,username:"fixtureDevon",media_type:"TEXT_POST",text,
  permalink:"https://www.threads.com/@fixtureDevon/post/CXtzA7JPq5V",
  timestamp:"2026-11-07T19:30:00+0000",
});
const payload=(...p)=>({data:p});

test("requires independent public, global and source gates plus server token",()=>{
  assert.equal(threadsApproved(env),true);
  for(const key of ["PRESENCE_ENABLED","PRESENCE_PUBLIC_RELEASE_APPROVED",
    "THREADS_PUBLIC_RELEASE_APPROVED","THREADS_PUBLIC_FEED_ENABLED"]){
    assert.equal(threadsApproved({...env,[key]:"false"}),false);
  }
  assert.equal(threadsApproved({...env,THREADS_USER_ACCESS_TOKEN:null}),false);
  assert.equal(threadsApproved({...env,THREADS_PUBLIC_USERNAME:""}),false);
});
test("project only owner text, original permalink and actual posted date",()=>{
  const raw=payload({...row(),likes:9999,replies:["private"],access_token:"secret"});
  const p=publicThreadsPosts(raw,"fixtureDevon",now);
  assert.deepEqual(p,[{
    href:"https://www.threads.com/@fixtureDevon/post/CXtzA7JPq5V",
    text:"Build log: shipping a verified project",
    publishedAt:"2026-11-07T19:30:00.000Z",media:false,
  }]);
  assert.ok(!JSON.stringify(p).includes("private"));
  assert.ok(!JSON.stringify(p).includes("secret"));
});
test("fail closed on wrong owner, unsafe links, forged media, dates, duplicate or malformed data",()=>{
  for(const broken of [
    {username:"not-the-owner"},
    {permalink:"https://evil.example/@fixtureDevon/post/CXtzA7JPq5V"},
    {permalink:"https://www.threads.com.evil.com/@fixtureDevon/post/CXtzA7JPq5V"},
    {permalink:"https://www.threads.net/@other/post/CXtzA7JPq5V"},
    {permalink:"https://www.threads.com/@fixtureDevon/post/CXtzA7JPq5V?q=1"},
    {permalink:"http://www.threads.com/@fixtureDevon/post/CXtzA7JPq5V"},
    {media_type:"PRIVATE_REPLY"},
    {text:42},{timestamp:"tomorrow"},{timestamp:"2026-11-09T00:00:00Z"},
    {id:"SECRET"},
  ])assert.equal(publicThreadsPosts(payload({...row(),...broken}),"fixtureDevon",now),null);
  assert.equal(publicThreadsPosts(payload(row(),row()),"fixtureDevon",now),null);
  assert.equal(publicThreadsPosts({data:"bad"},"fixtureDevon",now),null);
  assert.equal(publicThreadsPosts({data:Array(11).fill(row())},"fixtureDevon",now),null);
});
test("sanitize untrusted text, truncate bounded, show media-only without fabricated caption",()=>{
  const long="x".repeat(301)+"\u0000";
  const p=publicThreadsPosts(payload({...row(),text:long},
    {...row("987654321",""),media_type:"IMAGE",
      permalink:"https://www.threads.net/@fixtureDevon/post/ABCDefgh"}),"fixtureDevon",now);
  assert.equal(p.length,2);
  assert.equal(Array.from(p[0].text).length,281);
  assert.ok(!p[0].text.includes("\u0000"));
  assert.equal(p[1].text,"Media post on Threads");
  assert.equal(p[1].media,true);
});
test("official fetch is read-only, token stays server-side and 5-minute cache does not forge a new checked date",async()=>{
  let at=now,calls=0,request=null;
  const reader=createPublicThreadsReader({clock:()=>at,fetchImpl:async (url,init)=>{
    calls++;request={url,init};
    return Response.json(payload(row()));
  }});
  const first=await reader(env);
  assert.equal(first.state,"connected");
  assert.equal(first.posts.length,1);
  assert.equal(calls,1);
  assert.match(request.url,/^https:\/\/graph\.threads\.net\/v1\.0\/me\/threads\?/);
  assert.equal(new URL(request.url).searchParams.get("limit"),"5");
  assert.equal(request.init.method,"GET");
  assert.equal(request.init.headers.Authorization,"Bearer "+env.THREADS_USER_ACCESS_TOKEN);
  assert.ok(!JSON.stringify(first).includes("x".repeat(40)));
  at+=180000;
  assert.deepEqual(await reader(env),first);
  assert.equal(calls,1);
  at+=121000;
  const second=await reader(env);
  assert.equal(calls,2);
  assert.notEqual(first.checkedAt,second.checkedAt);
});
test("disconnected or revoked sharing immediately clears cached posts without provider request",async()=>{
  let calls=0;
  const reader=createPublicThreadsReader({clock:()=>now,fetchImpl:async()=>{
    calls++;return Response.json(payload(row()));
  }});
  assert.equal((await reader(env)).posts.length,1);
  assert.deepEqual(await reader({...env,THREADS_PUBLIC_FEED_ENABLED:"false"}),disconnectedThreads());
  assert.equal(calls,1);
  assert.equal((await reader(env)).posts.length,1);
  assert.equal(calls,2,"revocation must flush cached post projection");
});
test("in-flight source revocation cannot return old account posts",async()=>{
 let resume;const entered=new Promise(resolve=>{
  resume=resolve;
 });
 const gate={...env};
 let release;
 const waiting=new Promise(resolve=>{release=resolve;});
 const reader=createPublicThreadsReader({clock:()=>now,fetchImpl:async()=>{
  resume();
  await waiting;
  return Response.json(payload(row()));
 }});
 const request=reader(gate);
 await entered;
 gate.THREADS_PUBLIC_FEED_ENABLED="false";
 release();
 assert.deepEqual(await request,disconnectedThreads());
 assert.deepEqual(await reader(gate),disconnectedThreads());
});
test("invalid API payload, HTTP error, network exception and changed credentials fail closed",async()=>{
  for(const handler of [
    async()=>Response.json({data:[{...row(),username:"bad"}]}),
    async()=>new Response("unavailable",{status:503}),
    async()=>{throw new Error("upstream down")},
    async()=>new Response("a".repeat(32769),{status:200}),
  ]){
    const reader=createPublicThreadsReader({clock:()=>now,fetchImpl:handler});
    assert.deepEqual(await reader(env),disconnectedThreads());
  }
  let calls=0;
  const reader=createPublicThreadsReader({clock:()=>now,fetchImpl:async()=>{calls++;return Response.json(payload(row()))}});
  await reader(env);
  await reader({...env,THREADS_USER_ACCESS_TOKEN:"y".repeat(40)});
  assert.equal(calls,2);
});

test("private Threads probe verifies server-side token without public opt-in or post retrieval",async()=>{
  let calls=0,req;
  const privateEnv={...env,THREADS_PUBLIC_RELEASE_APPROVED:"false",
    THREADS_PUBLIC_FEED_ENABLED:"false"};
  const result=await probeThreadsAuthorization(privateEnv,{
    clock:()=>now,
    fetchImpl:async(url,init)=>{
      calls++;req={url,init};
      return Response.json({id:"278695012345",username:"fixtureDevon",
        access_token:"NEVER_EXPOSE_THIS",private_profile:"NEVER_EXPOSE_THIS"});
    },
  });
  assert.deepEqual(result,{version:1,connection:"verified",
    checkedAt:new Date(now).toISOString()});
  assert.equal(calls,1);
  assert.equal(new URL(req.url).origin,"https://graph.threads.net");
  assert.equal(new URL(req.url).pathname,"/v1.0/me");
  assert.equal(new URL(req.url).searchParams.get("fields"),"id,username");
  assert.equal(new URL(req.url).searchParams.has("access_token"),false);
  assert.equal(req.init.headers.Authorization,"Bearer "+privateEnv.THREADS_USER_ACCESS_TOKEN);
  assert.equal(req.init.method,"GET");
  assert.equal(req.init.redirect,"error");
  assert.doesNotMatch(JSON.stringify(result),/fixtureDevon|NEVER_EXPOSE_THIS|2786950|access_token/);
});
test("private Threads probe fails closed without credentials or with wrong owner identity",async()=>{
  const never=async()=>{throw Error("must not contact provider")};
  for(const missing of [
    {THREADS_PUBLIC_USERNAME:null},
    {THREADS_USER_ACCESS_TOKEN:null},
  ])assert.deepEqual(await probeThreadsAuthorization({...env,...missing},
    {fetchImpl:never}),{version:1,connection:"not-configured",checkedAt:null});
  const mismatch=await probeThreadsAuthorization(env,{
    fetchImpl:async()=>Response.json({id:"278695012345",username:"differentPerson"}),
    clock:()=>now,
  });
  assert.equal(mismatch.connection,"account-mismatch");
  assert.equal(mismatch.checkedAt,new Date(now).toISOString());
});
test("private Threads probe never discloses provider error body or accepts malformed provider proof",async()=>{
  const cases=[
    [async()=>new Response('token=NEVER_EXPOSE',{status:401}),"denied"],
    [async()=>new Response('token=NEVER_EXPOSE',{status:403}),"denied"],
    [async()=>new Response('token=NEVER_EXPOSE',{status:502}),"unavailable"],
    [async()=>new Response('not json'),"unavailable"],
    [async()=>new Response('a'.repeat(2049)),"unavailable"],
    [async()=>Response.json({id:"BAD_ID",username:"fixtureDevon"}),"unavailable"],
    [async()=>Response.json({id:"278695012345",username:"fixtureDevon"},
      {headers:{"Content-Length":"99999"}}),"unavailable"],
    [async()=>{throw Error("SECRET_PROVIDER_FAILURE")},"unavailable"],
  ];
  for(const [fetchImpl,expected] of cases){
    const result=await probeThreadsAuthorization(env,{fetchImpl,clock:()=>now});
    assert.equal(result.connection,expected);
    assert.equal(result.version,1);
    assert.doesNotMatch(JSON.stringify(result),/NEVER_EXPOSE|SECRET_PROVIDER_FAILURE/);
  }
});
test("Threads probe cannot affirm a credential changed during the provider request",async()=>{
  const mutable={...env};let complete;
  const entered=new Promise(resolve=>{
    complete=resolve;
  });
  let release;
  const delay=new Promise(resolve=>{release=resolve;});
  const pending=probeThreadsAuthorization(mutable,{
    clock:()=>now,fetchImpl:async()=>{
      complete();await delay;
      return Response.json({id:"278695012345",username:"fixtureDevon"});
    },
  });
  await entered;
  mutable.THREADS_USER_ACCESS_TOKEN="z".repeat(40);
  release();
  const result=await pending;
  assert.equal(result.connection,"unavailable");
});
