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
  if(migrated){
    sql.exec(readFileSync(new URL("../migrations/0011_threads_private_oauth.sql",import.meta.url),"utf8"));
    sql.exec(readFileSync(new URL("../migrations/0012_threads_meta_lifecycle.sql",import.meta.url),"utf8"));
  }
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
  const provider=providerOverride || (async (url,options)=>{
    requests.push([url,options]);
    if(url==="https://graph.threads.net/oauth/access_token")
      return Response.json({access_token:"s".repeat(96),user_id:"123456789012345"});
    if(new URL(url).pathname==="/refresh_access_token")
      return Response.json({access_token:"r".repeat(96),token_type:"bearer",expires_in:5184000});
    if(new URL(url).pathname==="/access_token")
      return Response.json({access_token:"l".repeat(96),token_type:"bearer",expires_in:5184000});
    if(new URL(url).pathname==="/v1.0/me")
      return Response.json({id:"123456789012345",username:"DevonFixture"});
    throw Error("Unexpected provider URL");
  });
  let clockTime=now;
  const api=createThreadsOwnerOAuth({clock:()=>clockTime,fetcher:provider});
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
  return {sql,db,env,api,post,get,auth,callback,requests,provider,
    advance(ms){clockTime+=ms;},clock:()=>clockTime};
}

test("owner-only OAuth start uses read-only scope and one-time state without leaking credentials",async()=>{
  const f=fixture();
  assert.equal((await f.get("/api/threads/auth/status","",{})).status,403);
  assert.equal((await f.get("/api/threads/auth/start")).status,405);
  assert.equal((await f.post("/api/threads/auth/start","https://untrusted.example")).status,403);
  const {target,cookie}=await f.auth();
  assert.equal(target.origin,"https://threads.com");
  assert.equal(target.searchParams.getAll("client_id").length,1);
  assert.equal(target.searchParams.get("client_id"),f.env.THREADS_APP_ID);
  assert.equal(target.pathname,"/oauth/authorize");
  assert.equal(target.searchParams.get("scope"),"threads_basic");
  assert.equal(target.searchParams.get("response_type"),"code");
  assert.equal(target.searchParams.get("redirect_uri"),
    "https://devonakins.com/api/threads/auth/callback");
  assert.equal(target.searchParams.getAll("state").length,1);
  assert.match(target.searchParams.get("state"),/^[A-Za-z0-9_-]{43}$/);
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
  assert.equal(row.threads_user_id,"123456789012345");
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
    {short:{access_token:"s".repeat(80),user_id:"9999999999"},stage:"profile"},
    {profile:{id:"123456789012345",username:"not valid @handle"},stage:"profile"},
    {long:{access_token:"l".repeat(80),token_type:"bearer",expires_in:0},stage:"extend"},
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
    assert.equal(out.headers.get("Location"),"/owner/presence/?threads="+value.stage);
    assert.equal(f.sql.prepare("SELECT token_cipher FROM threads_connection").get().token_cipher,null);
  }
  const f=fixture();
  f.env.THREADS_PUBLIC_USERNAME="AnotherAccount";
  const out=await f.callback(await f.auth());
  assert.equal(out.headers.get("Location"),"/owner/presence/?threads=profile");
  assert.equal(f.sql.prepare("SELECT token_cipher FROM threads_connection").get().token_cipher,null);
});


test("OAuth safely identifies a provider exchange failure without reflecting provider secrets",async()=>{
  const f=fixture(true,async()=>new Response('SENSITIVE_META_PROVIDER_ERROR',{status:400}));
  const result=await f.callback(await f.auth());
  assert.equal(result.headers.get("Location"),"/owner/presence/?threads=exchange");
  assert.doesNotMatch(await result.text(),/SENSITIVE_META_PROVIDER_ERROR/);
  assert.equal(f.sql.prepare("SELECT token_cipher FROM threads_connection").get().token_cipher,null);
});

test("Meta long numeric account IDs retain exact decimal digits through OAuth and encrypted D1",async()=>{
  const id="17841400000001235";
  const f=fixture(true,async(url)=>{
    const pathname=new URL(url).pathname;
    const json=value=>new Response(value,{headers:{"Content-Type":"application/json"}});
    if(pathname==="/oauth/access_token")
      return json('{"access_token":"'+ "s".repeat(96) +'","user_id":'+id+'}');
    if(pathname==="/access_token")
      return Response.json({access_token:"l".repeat(96),token_type:"bearer",expires_in:5184000});
    return json('{"id":'+id+',"username":"DevonFixture"}');
  });
  const result=await f.callback(await f.auth());
  assert.equal(result.headers.get("Location"),"/owner/presence/?threads=connected");
  assert.equal(f.sql.prepare("SELECT threads_user_id FROM threads_connection").get().threads_user_id,id);
  assert.equal((await storedThreadsStatus(f.env,now)).connected,true);
  assert.equal((await storedThreadsCredential(f.env,now)).userId,id);
});

test("Meta numeric account IDs in exponent notation fail closed rather than rounding",async()=>{
  const f=fixture(true,async(url)=>{
    const pathname=new URL(url).pathname;
    const json=value=>new Response(value,{headers:{"Content-Type":"application/json"}});
    if(pathname==="/oauth/access_token")
      return json('{"access_token":"'+ "s".repeat(96) +'","user_id":1.78414e16}');
    if(pathname==="/access_token")
      return Response.json({access_token:"l".repeat(96),token_type:"bearer",expires_in:5184000});
    return Response.json({id:"17841400000001235",username:"DevonFixture"});
  });
  const result=await f.callback(await f.auth());
  assert.equal(result.headers.get("Location"),"/owner/presence/?threads=exchange");
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

test("real Worker dispatch enforces owner authentication and keeps new routes private",async()=>{
  const f=fixture();
  const worker=createHandler({}, {version:"test"}, {now:()=>new Date(now)});
  const url=root+"/api/threads/auth/status";
  assert.equal((await worker.fetch(new Request(url),f.env,{})).status,403);
  const status=await worker.fetch(new Request(url),f.env,owner);
  assert.equal(status.status,200);
  assert.equal((await status.json()).connected,false);
  const crossSite=await worker.fetch(new Request(root+"/api/threads/auth/start",{
    method:"POST",headers:{Origin:"https://attacker.example"}
  }),f.env,owner);
  assert.equal(crossSite.status,403);
  const unknown=await worker.fetch(new Request(root+"/api/threads/auth/unrecognized"),f.env,owner);
  assert.equal(unknown.status,404);
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

test("owner renews a mature unexpired private Threads token without public sharing",async()=>{
  const f=fixture();
  await f.callback(await f.auth());
  const route="/api/threads/auth/renew";
  assert.equal((await f.post(route,root,{})).status,403);
  assert.equal((await f.post(route,"https://cross-site.example")).status,403);
  assert.equal((await f.get(route)).status,405);
  assert.equal((await f.post(route)).status,429,"Meta requires an older long-lived token");
  const initial=f.sql.prepare("SELECT revision,token_cipher FROM threads_connection").get();
  f.advance(25*60*60_000);
  const before=f.requests.length;
  const response=await f.post(route);
  assert.equal(response.status,200);
  const payload=await response.json();
  assert.equal(payload.connection,"renewed");
  assert.equal(payload.version,1);
  assert.equal(payload.checkedAt,new Date(f.clock()).toISOString());
  assert.equal(payload.expiresAt,new Date(f.clock()+5184000*1000).toISOString());
  assert.doesNotMatch(JSON.stringify(payload),/l{96}|r{96}|DevonFixture/);
  const calls=f.requests.slice(before);
  assert.equal(calls.length,2);
  const endpoint=new URL(calls[0][0]);
  assert.equal(endpoint.origin,"https://graph.threads.net");
  assert.equal(endpoint.pathname,"/refresh_access_token");
  assert.equal(endpoint.searchParams.get("grant_type"),"th_refresh_token");
  assert.equal(endpoint.searchParams.get("access_token"),"l".repeat(96));
  assert.equal(calls[0][1].redirect,"error");
  assert.equal(new URL(calls[1][0]).pathname,"/v1.0/me");
  assert.equal(calls[1][1].headers.Authorization,"Bearer "+"r".repeat(96));
  const row=f.sql.prepare("SELECT revision,token_cipher,verified_at,token_expires_at FROM threads_connection").get();
  assert.equal(row.revision,initial.revision+1);
  assert.notEqual(row.token_cipher,initial.token_cipher);
  assert.equal(row.verified_at,f.clock());
  assert.equal((await storedThreadsCredential(f.env,f.clock())).token,"r".repeat(96));
  assert.equal(f.env.THREADS_PUBLIC_FEED_ENABLED,"false");
  assert.equal(f.env.THREADS_PUBLIC_RELEASE_APPROVED,"false");
  assert.equal((await f.post(route)).status,429,"repeat refresh within 24 hours denied");
  assert.equal(f.requests.length,before+2);
});

test("renewal rejects expired credentials, malformed provider results and wrong account",async()=>{
  const expired=fixture();
  await expired.callback(await expired.auth());
  expired.advance(61*24*60*60_000);
  const start=expired.requests.length;
  assert.equal((await expired.post("/api/threads/auth/renew")).status,409);
  assert.equal(expired.requests.length,start,"must not contact Meta for expired token");

  for(const errorCase of ["wrong-account","wrong-id","malformed","provider-error"]){
    let refreshing=false;
    const f=fixture(true,async(url)=>{
      const pathname=new URL(url).pathname;
      if(pathname==="/oauth/access_token")
        return Response.json({access_token:"s".repeat(96),user_id:"123456789012345"});
      if(pathname==="/access_token")
        return Response.json({access_token:"l".repeat(96),token_type:"bearer",expires_in:5184000});
      if(pathname==="/refresh_access_token"){
        refreshing=true;
        if(errorCase==="malformed")return Response.json({access_token:"r".repeat(96),expires_in:5184000});
        if(errorCase==="provider-error")return new Response("SENSITIVE_PROVIDER_TOKEN",{status:503});
        return Response.json({access_token:"r".repeat(96),token_type:"bearer",expires_in:5184000});
      }
      if(pathname==="/v1.0/me")
        return Response.json({id:refreshing&&errorCase==="wrong-id"?"999999999999999":"123456789012345",
          username:refreshing&&errorCase==="wrong-account"?"DifferentOwner":"DevonFixture"});
      throw Error("Unexpected provider request");
    });
    await f.callback(await f.auth());
    const before=f.sql.prepare("SELECT revision,token_cipher,verified_at FROM threads_connection").get();
    f.advance(25*60*60_000);
    const renewed=await f.post("/api/threads/auth/renew");
    assert.ok(renewed.status>=400);
    assert.doesNotMatch(await renewed.text(),/SENSITIVE_PROVIDER_TOKEN|r{96}/);
    assert.deepEqual(f.sql.prepare("SELECT revision,token_cipher,verified_at FROM threads_connection").get(),before,
      "failed refresh cannot replace the credential");
  }
});

test("disconnect and replacement grants cannot be undone by in-flight renewal",async()=>{
  for(const action of ["disconnect","reconnect"]){
    let enter,release;
    const entered=new Promise(resolve=>{enter=resolve;});
    const wait=new Promise(resolve=>{release=resolve;});
    let blocked=false;
    const f=fixture(true,async(url)=>{
      const pathname=new URL(url).pathname;
      if(pathname==="/oauth/access_token")
        return Response.json({access_token:"s".repeat(96),user_id:"123456789012345"});
      if(pathname==="/access_token")
        return Response.json({access_token:"l".repeat(96),token_type:"bearer",expires_in:5184000});
      if(pathname==="/refresh_access_token"){
        if(!blocked){blocked=true;enter();await wait;}
        return Response.json({access_token:"r".repeat(96),token_type:"bearer",expires_in:5184000});
      }
      if(pathname==="/v1.0/me")
        return Response.json({id:"123456789012345",username:"DevonFixture"});
      throw Error("Unexpected provider request");
    });
    await f.callback(await f.auth());
    f.advance(25*60*60_000);
    const pending=f.post("/api/threads/auth/renew");
    await entered;
    if(action==="disconnect"){
      assert.equal((await f.post("/api/threads/auth/disconnect")).status,200);
    }else{
      const entry=await f.auth();
      assert.equal((await f.callback(entry)).status,303);
    }
    const expected=f.sql.prepare("SELECT revision,token_cipher FROM threads_connection").get();
    release();
    const response=await pending;
    assert.equal(response.status,409);
    assert.deepEqual(f.sql.prepare("SELECT revision,token_cipher FROM threads_connection").get(),expected);
  }
});
