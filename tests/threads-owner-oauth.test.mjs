import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {base64url} from "../src/listening-crypto.mjs";
import {createThreadsOwnerOAuth,storedThreadsCredential,storedThreadsStatus} from "../src/threads-owner-oauth.mjs";
import {createThreadsOwnerProbe} from "../src/threads-owner-probe.mjs";
import {createHandler} from "../src/worker.mjs";

const now=Date.parse("2026-11-09T20:00:00.000Z");
const owner={access:{aud:"owner-test",getIdentity:async()=>({email:"owner@example.test"})}};
const root="https://devonakins.com";
function fixture(migrated=true,providerOverride=null){
  const sql=new DatabaseSync(":memory:");
  if(migrated)sql.exec(readFileSync(
    new URL("../migrations/0011_threads_private_oauth.sql",import.meta.url),"utf8"));
  const db={prepare(text){
    const query=sql.prepare(text);let values=[];
    return {bind(...v){values=v;return this;},
      async first(){return query.get(...values)||null;},
      async run(){return {meta:{changes:Number(query.run(...values).changes)}};}};
  }};
  const env={LISTENING_DB:db,
    LISTENING_TOKEN_KEY:base64url(new Uint8Array(32).fill(7)),
    LISTENING_OWNER_EMAIL:"owner@example.test",LISTENING_ACCESS_AUD:"owner-test",
    THREADS_APP_ID:"123456789012345",
    THREADS_APP_SECRET:"meta-app-secret-synthetic".repeat(2),
    THREADS_PUBLIC_RELEASE_APPROVED:"false",THREADS_PUBLIC_FEED_ENABLED:"false",
  };
  const requests=[];
  const provider=providerOverride||async(url,options)=>{
    requests.push([url,options]);
    if(url==="https://graph.threads.net/oauth/access_token")
      return Response.json({access_token:"s".repeat(96),user_id:"123456789012345"});
    if(new URL(url).pathname==="/access_token")
      return Response.json({access_token:"l".repeat(96),token_type:"bearer",expires_in:5184000});
    if(new URL(url).pathname==="/v1.0/me")
      return Response.json({id:"123456789012345",username:"DevonFixture"});
    throw Error("Unexpected provider URL");
  };
  const api=createThreadsOwnerOAuth({clock:()=>now,fetcher:provider});
  const post=(path,origin=root,ctx=owner)=>api(new Request(root+path,{method:"POST",
    headers:{Origin:origin}}),env,ctx);
  const get=(path,cookie="",ctx=owner)=>api(new Request(root+path,
    {headers:cookie?{Cookie:cookie}:{}}),env,ctx);
  const auth=async()=>{
    const response=await post("/api/threads/auth/start");
    assert.equal(response.status,200);
    const value=await response.json();
    const target=new URL(value.authorizeUrl);
    const cookie=response.headers.get("Set-Cookie").split(";")[0];
    return {target,cookie};
  };
  const callback=(entry,code="fixture_authorization_code")=>
    get("/api/threads/auth/callback?state="+entry.target.searchParams.get("state")+
      "&code="+code,entry.cookie);
  return {sql,db,env,api,post,get,auth,callback,requests,provider};
}

test("owner-only OAuth start uses read-only scope and one-time state without leaking credentials",async()=>{
  const f=fixture();
  assert.equal((await f.get("/api/threads/auth/status","",{})).status,403);
  assert.equal((await f.get("/api/threads/auth/start")).status,405);
  assert.equal((await f.post("/api/threads/auth/start","https://untrusted.example")).status,403);
  const {target,cookie}=await f.auth();
  assert.equal(target.origin,"https://threads.net");
  assert.equal(target.pathname,"/oauth/authorize");
  assert.equal(target.searchParams.get("scope"),"threads_basic");
  assert.equal(target.searchParams.get("response_type"),"code");
  assert.equal(target.searchParams.get("redirect_uri"),
    "https://devonakins.com/api/threads/auth/callback");
  assert.match(cookie,/^__Host-threads_oauth=[A-Za-z0-9_-]{43}$/);
  assert.equal(f.requests.length,0,"no Meta request before user authorization");
  assert.doesNotMatch(target.href,/meta-app-secret|access_token|threads_content_publish/);
  const state=await f.get("/api/threads/auth/status");
  assert.deepEqual(await state.json(),{version:1,appConfigured:true,
    storageReady:true,connected:false,expiresAt:null,verifiedAt:null});
});

test("owner callback binds Meta account identity and encrypts long token at rest without public sharing",async()=>{
  const f=fixture();
  const entry=await f.auth(),callback=await f.callback(entry);
  assert.equal(callback.status,303);
  assert.equal(callback.headers.get("Location"),"/owner/presence/?threads=connected");
  assert.match(callback.headers.get("Set-Cookie"),/Max-Age=0/);
  assert.equal(f.requests.length,3);
  const [short,long,profile]=f.requests;
  assert.equal(short[0],"https://graph.threads.net/oauth/access_token");
  const body=new URLSearchParams(short[1].body);
  assert.equal(body.get("grant_type"),"authorization_code");
  assert.equal(body.get("redirect_uri"),entry.target.searchParams.get("redirect_uri"));
  assert.equal(body.get("client_secret"),f.env.THREADS_APP_SECRET);
  assert.equal(short[1].redirect,"error");
  assert.equal(new URL(long[0]).origin,"https://graph.threads.net");
  assert.equal(new URL(long[0]).searchParams.get("grant_type"),"th_exchange_token");
  assert.equal(long[1].redirect,"error");
  assert.equal(new URL(profile[0]).searchParams.get("fields"),"id,username");
  assert.equal(profile[1].headers.Authorization,"Bearer "+"l".repeat(96));
  const row=f.sql.prepare("SELECT * FROM threads_connection WHERE id=1").get();
  assert.notEqual(row.token_cipher,"l".repeat(96));
  assert.doesNotMatch(JSON.stringify(row),/"l{96}"/);
  assert.equal(row.username,"DevonFixture");
  assert.equal(row.token_expires_at,now+5184000*1000);
  const stored=await storedThreadsCredential(f.env,now);
  assert.equal(stored.token,"l".repeat(96));
  const status=await storedThreadsStatus(f.env,now);
  assert.equal(status.connected,true);
  assert.equal(status.verifiedAt,new Date(now).toISOString());
  assert.equal(f.env.THREADS_PUBLIC_RELEASE_APPROVED,"false");
  assert.equal(f.env.THREADS_PUBLIC_FEED_ENABLED,"false");
  const replay=await f.callback(entry);
  assert.equal(replay.status,303);
  assert.notEqual(replay.headers.get("Location"),"/owner/presence/?threads=connected");
  assert.equal(f.requests.length,3,"consumed OAuth authorization code cannot be replayed");
});

test("OAuth refuses wrong accounts, invalid provider payload and preexisting conflicting handle",async()=>{
  for(const value of [
    {short:{access_token:"s".repeat(80),user_id:"9999999999"}},
    {profile:{id:"123456789012345",username:"not valid @handle"}},
    {long:{access_token:"l".repeat(80),token_type:"bearer",expires_in:0}},
  ]){
    const f=fixture(true,async(url)=>{
      const path=new URL(url).pathname;
      if(path==="/oauth/access_token")
        return Response.json(value.short||{access_token:"s".repeat(80),user_id:"123456789012345"});
      if(path==="/access_token")
        return Response.json(value.long||{access_token:"l".repeat(80),token_type:"bearer",expires_in:5184000});
      return Response.json(value.profile||{id:"123456789012345",username:"DevonFixture"});
    });
    const out=await f.callback(await f.auth());
    assert.equal(out.headers.get("Location"),"/owner/presence/?threads=authorization");
    assert.equal(f.sql.prepare("SELECT token_cipher FROM threads_connection").get().token_cipher,null);
  }
  const f=fixture();
  f.env.THREADS_PUBLIC_USERNAME="AnotherAccount";
  const out=await f.callback(await f.auth());
  assert.equal(out.headers.get("Location"),"/owner/presence/?threads=authorization");
  assert.equal(f.sql.prepare("SELECT token_cipher FROM threads_connection").get().token_cipher,null);
});

test("owner disconnect revokes pending grants and stored tokens, including delayed in-flight callbacks",async()=>{
  let release;let entered;
  const atProvider=new Promise(resolve=>{entered=resolve;});
  const paused=new Promise(resolve=>{release=resolve;});
  const f=fixture(true,async(url)=>{
    if(new URL(url).pathname==="/oauth/access_token"){
      entered();
      await paused;
      return Response.json({access_token:"s".repeat(80),user_id:"123456789012345"});
    }
    if(new URL(url).pathname==="/access_token")
      return Response.json({access_token:"l".repeat(80),token_type:"bearer",expires_in:5184000});
    return Response.json({id:"123456789012345",username:"DevonFixture"});
  });
  const entry=await f.auth();
  const callback=f.callback(entry);
  await atProvider;
  const revoked=await f.post("/api/threads/auth/disconnect");
  assert.deepEqual(await revoked.json(),{version:1,connected:false});
  release();
  const late=await callback;
  assert.notEqual(late.headers.get("Location"),"/owner/presence/?threads=connected");
  assert.equal(f.sql.prepare("SELECT token_cipher FROM threads_connection").get().token_cipher,null);
  assert.equal((await storedThreadsStatus(f.env,now)).connected,false);
});

test("missing private migration or app settings fail closed and no OAuth attempt starts",async()=>{
  const absent=fixture(false);
  assert.equal((await absent.get("/api/threads/auth/status")).status,200);
  assert.equal((await (await absent.get("/api/threads/auth/status")).json()).storageReady,false);
  assert.equal((await absent.post("/api/threads/auth/start")).status,503);
  const noApp=fixture();
  delete noApp.env.THREADS_APP_SECRET;
  assert.equal((await noApp.post("/api/threads/auth/start")).status,409);
  assert.equal((await noApp.get("/api/threads/auth/status")).status,200);
});

test("private connection verification reads encrypted D1, rejects wrong audience and never returns a token",async()=>{
  const f=fixture();
  await f.callback(await f.auth());
  const calls=[];
  const check=createThreadsOwnerProbe({clock:()=>now,fetchImpl:async(url,init)=>{
    calls.push({url,init});
    return Response.json({id:"123456789012345",username:"DevonFixture",secret:"DO_NOT_RETURN"});
  }});
  const endpoint=new Request(root+"/api/presence/owner?channel=threads",{
    method:"POST",headers:{Origin:root},
  });
  assert.equal((await check(endpoint,f.env,{})).status,403);
  const verified=await check(endpoint,f.env,owner);
  assert.equal(verified.status,200);
  assert.equal((await verified.json()).connection,"verified");
  assert.equal(calls.length,1);
  assert.equal(calls[0].init.headers.Authorization,"Bearer "+"l".repeat(96));
  assert.doesNotMatch(await (await check(endpoint,f.env,owner)).text(),/DO_NOT_RETURN|l{96}/);
});
