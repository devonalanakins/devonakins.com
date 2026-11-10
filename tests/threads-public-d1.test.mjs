import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {base64url,importEncryptionKey,seal} from "../src/listening-crypto.mjs";
import {createD1PublicThreadsReader,publicThreadsReleaseAllowed} from "../src/threads-public-d1.mjs";
import {disconnectedThreads} from "../src/threads-public.mjs";
import {ownerSourceReadiness} from "../src/owner-source-readiness.mjs";

const start=Date.parse("2026-11-09T21:00:00.000Z");
const token="t".repeat(80);
const handle="fixtureDevon";
const post=at=>({data:[{
  id:"123456789",username:handle,media_type:"TEXT_POST",
  permalink:"https://www.threads.com/@fixtureDevon/post/CXtzA7JPq5V",
  timestamp:new Date(at-60000).toISOString(),text:"A public original Threads post",
  insights:{views:1000},access_token:"PRIVATE_SHOULD_NOT_LEAK",
}]});
function fixture(){
  const sql=new DatabaseSync(":memory:");
  sql.exec(readFileSync(new URL("../migrations/0011_threads_private_oauth.sql",import.meta.url),"utf8"));
  const db={
    prepare(q){
      const stmt=sql.prepare(q);
      let args=[];
      return {
        bind(...v){args=v;return this;},
        async first(){return stmt.get(...args)||null;},
        async run(){return {meta:{changes:Number(stmt.run(...args).changes)}};},
      };
    },
  };
  const env={
    PRESENCE_ENABLED:"true",PRESENCE_PUBLIC_RELEASE_APPROVED:"true",
    THREADS_PUBLIC_RELEASE_APPROVED:"true",THREADS_PUBLIC_FEED_ENABLED:"true",
    LISTENING_DB:db,LISTENING_TOKEN_KEY:base64url(new Uint8Array(32).fill(7)),
  };
  let at=start;
  async function authorize(value=token){
    const key=await importEncryptionKey(env.LISTENING_TOKEN_KEY);
    const cipher=await seal(value,key,"threads-long-lived-access");
    sql.prepare("UPDATE threads_connection SET revision=revision+1, token_cipher=?,"+
      "username=?,connected_at=?,token_expires_at=?,verified_at=? WHERE id=1")
      .run(cipher,handle,at,at+60*24*60*60_000,at);
  }
  const disconnect=()=>sql.prepare(
    "UPDATE threads_connection SET revision=revision+1,token_cipher=NULL,"+
    "username=NULL,token_expires_at=0,verified_at=0 WHERE id=1").run();
  return {sql,env,authorize,disconnect,clock:()=>at,advance:ms=>{at+=ms}};
}

test("D1 public posts require every independent global and source release gate",async()=>{
  const f=fixture();let providerCalls=0;
  const reader=createD1PublicThreadsReader({clock:f.clock,fetchImpl:async()=>{
    providerCalls++;return Response.json(post(f.clock()));
  }});
  assert.equal(publicThreadsReleaseAllowed(f.env),true);
  assert.deepEqual(await reader(f.env),disconnectedThreads(),
    "Release flags alone must not publish without encrypted owner authorization");
  assert.equal(providerCalls,0);
  await f.authorize();
  for(const flag of [
    "PRESENCE_ENABLED","PRESENCE_PUBLIC_RELEASE_APPROVED",
    "THREADS_PUBLIC_RELEASE_APPROVED","THREADS_PUBLIC_FEED_ENABLED",
  ]){
    const denied={...f.env,[flag]:"false"};
    assert.equal(publicThreadsReleaseAllowed(denied),false);
    assert.deepEqual(await reader(denied),disconnectedThreads());
  }
  assert.equal(providerCalls,0);
  const response=await reader(f.env);
  assert.equal(response.state,"connected");
  assert.equal(response.posts.length,1);
  assert.equal(response.posts[0].text,"A public original Threads post");
  assert.equal(providerCalls,1);
  assert.doesNotMatch(JSON.stringify(response),/PRIVATE_SHOULD_NOT_LEAK|t{80}|123456789/);
});

test("D1 owner can disconnect immediately, invalidating cached responses without provider calls",async()=>{
  const f=fixture();await f.authorize();
  let calls=0;
  const reader=createD1PublicThreadsReader({clock:f.clock,fetchImpl:async()=>{
    calls++;return Response.json(post(f.clock()));
  }});
  assert.equal((await reader(f.env)).state,"connected");
  assert.equal((await reader(f.env)).state,"connected");
  assert.equal(calls,1,"bounded provider cache works only while D1 authorization remains valid");
  f.disconnect();
  assert.deepEqual(await reader(f.env),disconnectedThreads());
  assert.equal(calls,1);
  // A separately provisioned old Worker secret must never defeat local
  // revocation of the D1 OAuth connection.
  assert.deepEqual(await reader({...f.env,THREADS_USER_ACCESS_TOKEN:"x".repeat(80),
    THREADS_PUBLIC_USERNAME:handle}),disconnectedThreads());
  assert.equal(calls,1);
});

test("D1 revision, token rotation and Stop All defeat in-flight public provider responses",async()=>{
  for(const action of ["disconnect","rotate","stop-all","expire"]){
    const f=fixture();await f.authorize();
    let enter,release;
    const started=new Promise(resolve=>{enter=resolve;});
    const pending=new Promise(resolve=>{release=resolve;});
    const reader=createD1PublicThreadsReader({clock:f.clock,fetchImpl:async()=>{
      enter();return pending;
    }});
    const request=reader(f.env);await started;
    if(action==="disconnect")f.disconnect();
    if(action==="rotate")await f.authorize("z".repeat(80));
    if(action==="stop-all")f.env.PRESENCE_PUBLIC_RELEASE_APPROVED="false";
    if(action==="expire")f.advance(61*24*60*60_000);
    release(Response.json(post(start)));
    assert.deepEqual(await request,disconnectedThreads(),action);
  }
});

test("owner readiness separates stored private authorization from public consent",async()=>{
  const f=fixture();await f.authorize();
  const allowed=await ownerSourceReadiness(f.env,null,f.clock());
  assert.equal(allowed.threads.privateConnected,true);
  assert.equal(allowed.threads.configured,true);
  assert.equal(allowed.threads.providerObserved,false);
  for(const flag of ["PRESENCE_PUBLIC_RELEASE_APPROVED",
    "THREADS_PUBLIC_RELEASE_APPROVED","THREADS_PUBLIC_FEED_ENABLED"]){
    const off=await ownerSourceReadiness({...f.env,[flag]:"false"},null,f.clock());
    assert.equal(off.threads.privateConnected,true);
    assert.equal(off.threads.configured,false,
      "Private consent cannot silently authorize public social sharing");
  }
  assert.doesNotMatch(JSON.stringify(allowed),/t{80}|fixtureDevon/);
});

test("shipping Worker uses only the encrypted D1 reader and packages its dependency",()=>{
  const worker=readFileSync(new URL("../src/worker.mjs",import.meta.url),"utf8");
  const bundler=readFileSync(new URL("../scripts/build-worker.mjs",import.meta.url),"utf8");
  assert.match(worker,/createD1PublicThreadsReader/);
  assert.doesNotMatch(worker,/createPublicThreadsReader/);
  assert.match(bundler,/"threads-public-d1"/);
});
