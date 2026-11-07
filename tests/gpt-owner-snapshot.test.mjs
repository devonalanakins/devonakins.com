import test from "node:test";
import assert from "node:assert/strict";
import {
  handleOwnerObservationRequest, handleObservationRequest,
  OBSERVATION_OWNER_PATH, OBSERVATION_READ_PATH,
} from "../src/gpt-observation-bridge.mjs";
import { createHandler } from "../src/worker.mjs";

const now = new Date("2026-11-07T14:00:00.000Z");
const owner = {access:{aud:"test-owner",getIdentity:async()=>({email:"owner@example.test"})}};
const security = {"X-Content-Type-Options":"nosniff"};
function store(){
  let saved=null; const writes=[];
  return {
    get:async()=>saved,
    put:async(k,v,o)=>{saved=v;writes.push({key:k,value:v,options:o});},
    writes,
  };
}
function env(kv){
  return {
    GPT_USAGE_STORE:kv,
    GPT_USAGE_WRITE_ENABLED:"true",
    GPT_USAGE_READ_ENABLED:"false",
    GPT_USAGE_PUBLIC_RELEASE_APPROVED:"false",
    PRESENCE_ENABLED:"true",
    PRESENCE_PUBLIC_RELEASE_APPROVED:"true",
    LISTENING_DB:{prepare:()=>({first:async()=>({public_enabled:1,private_work:0,revision:0})})},
    LISTENING_ACCESS_AUD:"test-owner",
    LISTENING_OWNER_EMAIL:"owner@example.test",
  };
}
function request(path,method="GET",body,origin="https://devonakins.com"){
  return new Request("https://devonakins.com"+path,{
    method,headers:{
      ...(method==="POST"?{"Content-Type":"application/json",Origin:origin}:{}),
      Accept:"application/json",
    },
    ...(body?{body:JSON.stringify(body)}:{}),
  });
}
const body={version:1,metric:"work_codex_credits_remaining",value:12.5,reviewed:true};

test("protected owner endpoint refuses strangers without storage reads or writes",async()=>{
  const kv=store(), e=env(kv);
  assert.equal((await handleOwnerObservationRequest(request(OBSERVATION_OWNER_PATH),e,{},now,security)).status,403);
  assert.equal((await handleOwnerObservationRequest(request(OBSERVATION_OWNER_PATH,"POST",body),e,
    {access:{aud:"wrong",getIdentity:async()=>({email:"owner@example.test"})}},now,security)).status,403);
  assert.equal((await handleOwnerObservationRequest(request(OBSERVATION_OWNER_PATH,"POST",body,"https://attacker.invalid"),e,owner,now,security)).status,403);
  assert.equal(kv.writes.length,0);
});

test("an actual owner can save a bounded dated observation without inventing account refresh time",async()=>{
  const kv=store(),e=env(kv);
  const write=await handleOwnerObservationRequest(request(OBSERVATION_OWNER_PATH,"POST",body),e,owner,now,security);
  assert.equal(write.status,202);
  assert.equal(write.headers.get("Cache-Control"),"no-store");
  assert.equal(kv.writes.length,1);
  assert.equal(kv.writes[0].options.expirationTtl,30*86400);
  assert.doesNotMatch(kv.writes[0].value,/cookie|session|prompt|bearer|token/i);
  const priv=await handleOwnerObservationRequest(request(OBSERVATION_OWNER_PATH),e,owner,now,security);
  const data=await priv.json();
  assert.equal(data.status,"recent");
  assert.equal(data.observation.value,12.5);
  assert.equal(data.observation.source,"owner-reviewed-dashboard");
  assert.equal(data.observation.observedAt,now.toISOString());
  assert.equal(data.observation.sourceUpdatedAt,null);
  assert.equal(data.observation.lastChangedAt,null);
  const publicResult=await handleObservationRequest(request(OBSERVATION_READ_PATH),e,now,security);
  assert.equal(publicResult.status,404,"owner capture must not open public read");
  const worker=createHandler({}, {version:"test"},{now:()=>now,cache:null,githubFetch:async()=>Response.json([])});
  const fromWorker=await worker.fetch(request(OBSERVATION_OWNER_PATH),e,owner);
  assert.equal(fromWorker.status,200);
  assert.equal((await fromWorker.json()).observation.value,12.5);
});

test("unapproved content, origins and out-of-range credits cannot be saved",async()=>{
  const kv=store(),e=env(kv);
  const bad=[
    {...body,reviewed:false}, {...body,value:Infinity},{...body,value:-1},
    {...body,value:1000001},{...body,privateChat:"secret"},
    {...body,metric:"all_chat_lifetime_tokens"},
    {...body,metric:"work_codex_used_percent",value:101},
    {...body,value:"12.5"},
  ];
  for(const candidate of bad){
    const r=await handleOwnerObservationRequest(request(OBSERVATION_OWNER_PATH,"POST",candidate),e,owner,now,security);
    assert.equal(r.status,400,JSON.stringify(candidate));
  }
  assert.equal(kv.writes.length,0);
});

test("writes are throttled, old observations are not silently overwritten and staleness is explicit",async()=>{
  const kv=store(),e=env(kv);
  assert.equal((await handleOwnerObservationRequest(request(OBSERVATION_OWNER_PATH,"POST",body),e,owner,now,security)).status,202);
  const rapid=await handleOwnerObservationRequest(request(OBSERVATION_OWNER_PATH,"POST",{...body,value:10}),e,owner,new Date(now.getTime()+61000),security);
  assert.equal(rapid.status,429);
  assert.equal(kv.writes.length,1);
  const later=new Date(now.getTime()+6*60000);
  assert.equal((await handleOwnerObservationRequest(request(OBSERVATION_OWNER_PATH,"POST",{...body,value:10}),e,owner,later,security)).status,202);
  const stale=new Date(later.getTime()+26*60000);
  const priv=await (await handleOwnerObservationRequest(request(OBSERVATION_OWNER_PATH),e,owner,stale,security)).json();
  assert.equal(priv.status,"stale");
  assert.equal(priv.observation.value,10);
  assert.equal(priv.observation.observedAt,later.toISOString());
});

test("an owner session and write gate remain mandatory even if a future public read is enabled",async()=>{
  const kv=store(),e=env(kv);
  e.GPT_USAGE_WRITE_ENABLED="false";
  assert.equal((await handleOwnerObservationRequest(request(OBSERVATION_OWNER_PATH,"POST",body),e,owner,now,security)).status,404);
  e.GPT_USAGE_WRITE_ENABLED="true";
  e.GPT_USAGE_READ_ENABLED="true";
  assert.equal((await handleObservationRequest(request(OBSERVATION_READ_PATH),e,now,security)).status,404);
  e.GPT_USAGE_PUBLIC_RELEASE_APPROVED="true";
  const read=await handleObservationRequest(request(OBSERVATION_READ_PATH),e,now,security);
  assert.equal(read.status,200);
  assert.equal((await read.json()).status,"no-data");
});
