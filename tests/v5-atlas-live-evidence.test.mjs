import test from "node:test";
import assert from "node:assert/strict";
import { publicV5AtlasSignals } from "../src/v5/atlas-live-evidence.mjs";
const now=Date.parse("2026-11-08T00:00:00.000Z");
const iso=delta=>new Date(now+delta).toISOString();
const current=(kind,source,delta=-10000)=>({active:{kind,source,at:iso(delta)}});

test("approved editor and participating remote evidence appear on fixed atlas roots",()=>{
  const value=publicV5AtlasSignals({available:true,nodes:{
    mizvo:current("editor","Editor observed"),
    merit:current("remote","Codex task",-20000),
    squelch:current("remote","Work task",-30000),
    vesper:current("remote","Workflow task",-40000),
    "knowledge-overview":current("editor","Editor observed"),
    "private-client":current("remote","Codex task"),
  }},now);
  assert.equal(value.available,true);
  assert.deepEqual(value.active.map(v=>[v.id,v.kind]),[
    ["project:mizvo","editor"], ["project:merit","remote"],
    ["project:vesper","remote"], ["project:squelch","remote"],
  ]);
  assert.doesNotMatch(JSON.stringify(value),/private-client|knowledge-overview/);
});
test("GitHub history, absent evidence and unknown source never light a root",()=>{
  const value=publicV5AtlasSignals({available:true,nodes:{
    mizvo:{active:null,lastEvent:{kind:"Pull request",at:iso(-5000)}},
    merit:current("remote","untrusted provider"),
    vesper:current("__proto__","Workflow task"),
  }},now);
  assert.deepEqual(value.active,[]);
});
test("revocation, expiry, future and malformed times clear active signals",()=>{
  for(const projection of [
    null,{available:false,nodes:{mizvo:current("editor","Editor observed")}},
    {available:true,nodes:[]}
  ]){
    assert.equal(publicV5AtlasSignals(projection,now).available,false);
    assert.deepEqual(publicV5AtlasSignals(projection,now).active,[]);
  }
  for(const bad of [iso(-120000),iso(20000),"2026-11-07","invalid"]){
    const result=publicV5AtlasSignals({available:true,nodes:{
      mizvo:{active:{kind:"editor",source:"Editor observed",at:bad}},
    }},now);
    assert.deepEqual(result.active,[]);
  }
});
test("unknown slugs and prototype keys do not inject identities",()=>{
  const nodes=JSON.parse('{"__proto__":{"active":{"kind":"editor","source":"Editor observed","at":"2026-11-08T00:00:00.000Z"}},"rhen-language":{"active":{"kind":"editor","source":"Editor observed","at":"2026-11-07T23:59:59.000Z"}}}');
  const result=publicV5AtlasSignals({available:true,nodes},now);
  assert.deepEqual(result.active.map(item=>item.id),["project:rhen-language"]);
});
