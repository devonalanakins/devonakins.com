import test from "node:test";
import assert from "node:assert/strict";
import {readPublicAppleListening,ingestAppleListening,validateAppleListeningInput,
  APPLE_LISTENING_FRESH_MS,APPLE_LISTENING_PUBLIC_PATH,APPLE_LISTENING_INGEST_PATH
} from "../src/apple-listening.mjs";
import {createHandler} from "../src/worker.mjs";
import {gzipSync} from "node:zlib";

const now=Date.parse("2026-11-21T21:45:00.000Z");
const token="iPhonePersonalShortcutsOnly!".repeat(2);
const get=()=>new Request("https://devonakins.com"+APPLE_LISTENING_PUBLIC_PATH);
const head=()=>new Request("https://devonakins.com"+APPLE_LISTENING_PUBLIC_PATH,{method:"HEAD"});
const post=(body,auth="Bearer "+token,method="POST")=>new Request(
  "https://devonakins.com"+APPLE_LISTENING_INGEST_PATH,
  {method,headers:{"Content-Type":"application/json",Authorization:auth},body:method==="POST"?JSON.stringify(body):undefined}
);
function database(){
  let current=null,queries=0;
  const api={get row(){return current},get count(){return queries},
    prepare(sql){
      queries++;
      if(sql.startsWith("SELECT"))return{first:async()=>current};
      if(sql.startsWith("INSERT"))return{bind(...args){
        assert.equal(args.length,7);
        return{run:async()=>{
          current={kind:args[0],title:args[1],artist:args[2],album:args[3],
            apple_url:args[4],mood:args[5],reported_at:args[6]};
          return{meta:{changes:1}};
        }};
      }};
      throw Error("Unexpected query");
    }
  };
  return api;
}
const on=db=>({APPLE_LISTENING_PUBLIC_ENABLED:"true",APPLE_LISTENING_INGEST_ENABLED:"true",
  APPLE_LISTENING_INGEST_TOKEN:token,LISTENING_DB:db});

test("Apple source defaults hidden and never reads the database unless owner permits publication",async()=>{
  const db=database();
  const r=await readPublicAppleListening(get(),{LISTENING_DB:db},()=>now);
  assert.deepEqual(await r.json(),{version:1,source:"owner-shortcut",state:"hidden"});
  assert.equal(db.count,0);
  assert.equal(r.headers.get("Cache-Control"),"private, no-store, max-age=0");
  assert.equal((await ingestAppleListening(post({kind:"off"}),{LISTENING_DB:db},()=>now)).status,404);
  assert.equal(db.count,0);
});

test("private ingestion requires a long secret, correct method, and valid JSON",async()=>{
  const db=database(),env=on(db);
  assert.equal((await ingestAppleListening(post({kind:"off"},"Bearer wrong"),env,()=>now)).status,403);
  assert.equal((await ingestAppleListening(post({kind:"off"},""),env,()=>now)).status,403);
  assert.equal((await ingestAppleListening(post(null,"Bearer "+token,"GET"),env,()=>now)).status,405);
  assert.equal((await ingestAppleListening(post({kind:"ambient",mood:"Invented"}),env,()=>now)).status,400);
  assert.equal((await ingestAppleListening(post({kind:"song",title:"Example",artist:"Artist",more:"unsafe"}),env,()=>now)).status,400);
  assert.equal((await ingestAppleListening(post({kind:"song",title:"Example",artist:"Artist",url:"https://music.apple.com.evil.example/"}),env,()=>now)).status,400);
  assert.equal((await ingestAppleListening(post({kind:"off"}),{...env,APPLE_LISTENING_INGEST_TOKEN:"weak"},()=>now)).status,404);
  assert.equal(db.count,0);
  const wrongOrigin=new Request(post({kind:"off"}),{headers:{"Content-Type":"application/json",Authorization:"Bearer "+token,Origin:"https://evil.example"}});
  assert.equal((await ingestAppleListening(wrongOrigin,env,()=>now)).status,403);
  assert.equal(db.count,0);
});

test("one song report overwrites the row; public metadata remains private unless explicitly approved",async()=>{
  const db=database(),env=on(db);
  const accepted=await ingestAppleListening(post({kind:"song",title:"A Track",artist:"An Artist",
    album:"An Album",url:"https://music.apple.com/us/album/example/123456?i=1234567890"}),env,()=>now);
  assert.equal(accepted.status,200);
  assert.deepEqual(await accepted.json(),{accepted:true});
  assert.equal(db.row.title,"A Track");
  let r=await readPublicAppleListening(get(),env,()=>now+50_000);
  let obj=await r.json();
  assert.equal(obj.state,"reported");
  assert.equal(obj.kind,"song");
  assert.equal(obj.detailsVisible,false);
  assert.equal(obj.reportedAt,new Date(now).toISOString());
  assert.doesNotMatch(JSON.stringify(obj),/A Track|An Artist|An Album|music\.apple\.com|iPhonePersonal/);
  r=await readPublicAppleListening(get(),{...env,APPLE_LISTENING_TRACK_DETAILS_PUBLIC:"true"},()=>now+50_000);
  obj=await r.json();
  assert.equal(obj.title,"A Track");
  assert.equal(obj.artist,"An Artist");
  assert.equal(obj.url,"https://music.apple.com/us/album/example/123456?i=1234567890");
  assert.equal(db.count,3);
  assert.deepEqual(await(await readPublicAppleListening(get(),env,()=>now+APPLE_LISTENING_FRESH_MS+1)).json(),
    {version:1,source:"owner-shortcut",state:"stale"});
});

test("manual ambient mode is not inferred from song and expires on schedule",async()=>{
  const db=database(),env=on(db);
  let reply=await ingestAppleListening(post({kind:"ambient",mood:"Chill"}),env,()=>now);
  assert.equal(reply.status,200);
  let state=await(await readPublicAppleListening(get(),env,()=>now+10_000)).json();
  assert.deepEqual(state,{version:1,source:"owner-shortcut",state:"reported",kind:"ambient",
    mood:"Chill",reportedAt:new Date(now).toISOString()});
  reply=await ingestAppleListening(post({kind:"off"}),env,()=>now+12_000);
  assert.equal(reply.status,200);
  state=await(await readPublicAppleListening(get(),env,()=>now+20_000)).json();
  assert.equal(state.state,"off");
  assert.equal(db.row.kind,"off");
  assert.equal(db.row.title,null);
  assert.equal(db.row.mood,null);
  assert.equal((await readPublicAppleListening(head(),env,()=>now+20_000)).status,200);
  assert.equal(await (await readPublicAppleListening(head(),env,()=>now+20_000)).text(),"");
});

test("single report input rejects ambient guesses, oversized text and non-Apple links",()=>{
  for(const candidate of [
    {kind:"ambient",mood:"sleep"},{kind:"ambient",mood:"Productivity",title:"song"},
    {kind:"song",title:"Name",artist:"Person",url:"javascript:alert(1)"},
    {kind:"song",title:"T".repeat(161),artist:"Person"},
    {kind:"song",title:"Name",artist:"Person",url:"https://music.apple.com@evil.example/song"},
    {kind:"off",artist:"should not retain"},[]
  ]) assert.equal(validateAppleListeningInput(candidate),null);
  assert.deepEqual(validateAppleListeningInput({kind:"ambient",mood:"Wellbeing"}),{
    kind:"ambient",title:null,artist:null,album:null,appleUrl:null,mood:"Wellbeing"});
});

test("real Worker routes POST before readonly gate and exposes only safe public data",async()=>{
  const db=database();
  const asset=s=>({type:"text/html; charset=utf-8",gzip:gzipSync(s).toString("base64"),etag:'"test"'});
  const worker=createHandler({"/index.html":asset("<html>Home</html>"),"/404/index.html":asset("Not found")},
    {commit:"synthetic",version:"test"},{laboratoryCandidate:true,githubFetch:async()=>new Response("[]")});
  const env=on(db);
  let r=await worker.fetch(post({kind:"ambient",mood:"Productivity"}),env);
  assert.equal(r.status,200);
  assert.equal((await r.json()).accepted,true);
  r=await worker.fetch(get(),env);
  assert.equal(r.status,200);
  const body=await r.json();
  assert.equal(body.kind,"ambient");
  assert.equal(body.mood,"Productivity");
  assert.ok(r.headers.get("Content-Security-Policy").includes("frame-ancestors 'none'"));
  const blocked=await worker.fetch(get(),{...env,APPLE_LISTENING_PUBLIC_ENABLED:"false"});
  assert.equal((await blocked.json()).state,"hidden");
});
