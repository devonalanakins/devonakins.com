import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PUBLIC_PRESENCE_PROJECTS } from "../src/presence-model.mjs";
import { PUBLIC_REPOSITORIES } from "../src/activity-history.mjs";
import { publicV5AtlasSignals } from "../src/v5/atlas-live-evidence.mjs";
import { publicV5TerrainStates } from "../src/v5/field-terrain-state.mjs";
import { publicV5ProjectEvidence } from "../src/v5/public-evidence.mjs";

const now = Date.parse("2026-11-08T20:00:00.000Z");
const observedAt = new Date(now-6000).toISOString();

test("private-source public concept is excluded from all automatic server and browser signal identities",()=>{
  assert.equal(Object.hasOwn(PUBLIC_PRESENCE_PROJECTS,"vesper"),false);
  assert.equal(Object.hasOwn(PUBLIC_REPOSITORIES,"vesper"),false);
  for(const path of [
    "../src/live-signal-client.ts",
    "../src/presence-client.ts",
    "../src/cloud-presence-client.ts",
  ]){
    const code=readFileSync(new URL(path,import.meta.url),"utf8");
    assert.doesNotMatch(code,/"Vesper"/,path+" must not accept private source identity");
  }
});

test("a forged fresh V4 Vesper task cannot light V5 project, atlas, terrain or focus",()=>{
  const payload={
    version:4,asOf:new Date(now).toISOString(),
    recent:[],work:{visibility:"public",source:"editor-heartbeat",state:"developing",
      project:"Vesper",asOf:observedAt},
    remote:{visibility:"public",tasks:[{project:"Vesper",source:"github-actions",
      state:"running",checkpoint:"testing",asOf:observedAt,
      expiresAt:new Date(now+114000).toISOString()}]},
  };
  const read=publicV5ProjectEvidence(payload,now);
  assert.equal(read.available,true);
  assert.equal(Object.hasOwn(read.nodes,"vesper"),false);
  const hostile={available:true,nodes:{
    vesper:{active:{kind:"remote",source:"Workflow task",at:observedAt}},
  }};
  assert.deepEqual(publicV5AtlasSignals(hostile,now).active,[]);
  assert.equal(Object.hasOwn(publicV5TerrainStates(hostile),"vesper"),false);
});
