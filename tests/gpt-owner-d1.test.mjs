import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createHandler } from "../src/worker.mjs";

const TIME=Date.parse("2026-11-07T14:00:00.000Z");
const ctx={access:{aud:"gpt-owner-test",getIdentity:async()=>({email:"owner@example.test"})}};
function fixture(){
 const sql=new DatabaseSync(":memory:");
 sql.exec(readFileSync(new URL("../migrations/0008_gpt_owner_snapshot.sql",import.meta.url),"utf8"));
 const db={prepare(query){
   const stmt=sql.prepare(query);let args=[];
   return {bind(...values){args=values;return this;},
     async first(){return stmt.get(...args)||null;},
     async run(){return {meta:{changes:Number(stmt.run(...args).changes)}};},
   };
 }};
 let at=TIME;
 const site=createHandler({}, {version:"test"},
   {now:()=>new Date(at),githubFetch:async()=>Response.json([]),cache:null});
 const env={
   LISTENING_DB:db,PRESENCE_ENABLED:"true",
   LISTENING_ACCESS_AUD:"gpt-owner-test",
   LISTENING_OWNER_EMAIL:"owner@example.test",
   GPT_USAGE_READ_ENABLED:"false",
   GPT_USAGE_PUBLIC_RELEASE_APPROVED:"false",
   GPT_USAGE_WRITE_ENABLED:"false",
 };
 const call=(path,method="GET",data,context=ctx,origin="https://devonakins.com")=>
   site.fetch(new Request("https://devonakins.com"+path,{
     method,headers:{
       ...(method!=="GET"?{Origin:origin,"Content-Type":"application/json"}:{}),
       Accept:"application/json",
     },
     ...(data?{body:JSON.stringify(data)}:{}),
   }),env,context);
 return {sql,db,env,call,advance:(ms)=>{at+=ms;}};
}
const path="/api/gpt-observation/owner";
const sample={version:1,metric:"work_codex_credits_remaining",value:84.5,reviewed:true};

test("real additive D1 migration stores exactly one small approved number and no identity",async()=>{
 const f=fixture();
 const empty=await f.call(path);
 assert.equal(empty.status,200);
 assert.equal((await empty.json()).status,"no-data");
 const saved=await f.call(path,"POST",sample);
 assert.equal(saved.status,202);
 const record=f.sql.prepare("SELECT record,received_at FROM gpt_owner_snapshots WHERE id=1").get();
 const row=JSON.parse(record.record);
 assert.equal(row.reading.value,84.5);
 assert.equal(row.reading.source,"owner-reviewed-dashboard");
 assert.equal(row.reading.lastChangedAt,null);
 assert.equal(row.reading.sourceUpdatedAt,null);
 assert.ok(record.record.length<1024);
 assert.doesNotMatch(record.record,/email|cookies|account|prompt|transcript/i);
 assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM gpt_owner_snapshots").get().n,1);
 const privateGet=await f.call(path);
 assert.equal((await privateGet.json()).observation.value,84.5);
 const publicGet=await f.call("/api/gpt-observation/latest");
 assert.equal(publicGet.status,404,"public read must stay off");
 const hidden=await f.call(path,"GET",null,{});
 assert.equal(hidden.status,403,"owner Access session remains mandatory");
});

test("one-row D1 CAS protects the cooldown, date and correction path",async()=>{
 const f=fixture();
 assert.equal((await f.call(path,"POST",sample)).status,202);
 f.advance(60_000);
 assert.equal((await f.call(path,"POST",{...sample,value:83})).status,429);
 f.advance(5*60_000);
 assert.equal((await f.call(path,"POST",{...sample,value:82})).status,202);
 const row=f.sql.prepare("SELECT record FROM gpt_owner_snapshots").get();
 assert.equal(JSON.parse(row.record).reading.value,82);
 assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM gpt_owner_snapshots").get().n,1);
 f.advance(20*60_000);
 const stale=(await (await f.call(path)).json());
 assert.equal(stale.status,"stale");
 assert.equal(stale.observation.value,82);
});

test("owner can clear a private observation, and an untrusted origin cannot delete it",async()=>{
 const f=fixture();
 assert.equal((await f.call(path,"POST",sample)).status,202);
 assert.equal((await f.call(path,"DELETE",undefined,ctx,"https://attacker.invalid")).status,403);
 assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM gpt_owner_snapshots").get().n,1);
 const clean=await f.call(path,"DELETE");
 assert.equal(clean.status,200);
 assert.deepEqual(await clean.json(),{cleared:true});
 assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM gpt_owner_snapshots").get().n,0);
 assert.equal((await (await f.call(path)).json()).status,"no-data");
});

test("after 30 days a private reading becomes unavailable instead of appearing live",async()=>{
 const f=fixture();
 assert.equal((await f.call(path,"POST",sample)).status,202);
 f.advance(31*24*60*60_000);
 assert.equal((await (await f.call(path)).json()).status,"no-data");
 assert.equal(f.sql.prepare("SELECT COUNT(*) AS n FROM gpt_owner_snapshots").get().n,1,
   "expired row is inert and storage remains bounded");
});
