import test from "node:test";
import assert from "node:assert/strict";
import { publicV5ProjectEvidence } from "../src/v5/public-evidence.mjs";

const at = Date.parse("2026-11-07T18:00:00.000Z");
const iso = (delta = 0) => new Date(at + delta).toISOString();
const github = (overrides = {}) => ({
  project: "Mizvo",
  projectSlug: "mizvo",
  kind: "Pull request",
  at: iso(-60000),
  url: "https://github.com/devonalanakins/mizvo",
  ...overrides,
});
const publicWork = (overrides = {}) => ({
  visibility: "public", source: "editor-heartbeat", project: "Mizvo",
  state: "developing", asOf: iso(-20000), ...overrides,
});
const remoteTask = (overrides = {}) => ({
  source: "codex", project: "Merit", state: "running",
  checkpoint: null, asOf: iso(-15000), expiresAt: iso(105000),
  ...overrides,
});
const response = (overrides = {}) => ({
  version: 4, asOf: iso(), work: publicWork(),
  remote: {visibility: "public",tasks: [remoteTask()]},
  recent: [github()], ...overrides,
});

test("verified V4 records project editor, independently running task and historic GitHub event", () => {
  const r = publicV5ProjectEvidence(response(),at);
  assert.equal(r.available,true);
  assert.deepEqual(r.nodes.mizvo.active,{kind:"editor",source:"Editor observed",at:iso(-20000)});
  assert.equal(r.nodes.mizvo.lastEvent.kind,"Pull request");
  assert.equal(r.nodes.merit.active.source,"Codex task");
  assert.equal(r.recent.length,1);
  assert.equal(r.recent[0].url,"https://github.com/devonalanakins/mizvo");
});
test("history alone never represents active work", () => {
  const r=publicV5ProjectEvidence(response({
    work: {visibility:"hidden",state:"not-broadcasting"},
    remote: {visibility:"hidden",tasks:[]},
  }),at);
  assert.equal(r.nodes.mizvo.active,null);
  assert.equal(r.nodes.mizvo.lastEvent.kind,"Pull request");
});
test("revoke, version mismatch, and stale aggregate clear all signal nodes", () => {
  for(const v of [
    null, {version:3,asOf:iso()},
    response({version:5}),
    response({asOf:iso(-66000)}),
    response({asOf:iso(15000)}),
    response({asOf:"2026-11-07"}),
  ]){
    const r=publicV5ProjectEvidence(v,at);
    assert.equal(r.available,false);
    assert.equal(Object.keys(r.nodes).length,0);
    assert.equal(r.recent.length,0);
  }
});
test("private, unapproved, future, expired or fake events never enter the public inspector", () => {
  const r=publicV5ProjectEvidence(response({
    work: publicWork({visibility:"hidden"}),
    remote: {visibility:"hidden",tasks:[remoteTask()]},
    recent:[
      github({url:"https://github.com/devonalanakins/private-client"}),
      github({projectSlug:"private-client"}),
      github({at:iso(20000)}),
      github({kind:"Secret event"}),
      github({project:"Secret"}),
      github({url:"https://evil.example/steal?token=secret"}),
    ],
  }),at);
  assert.equal(r.available,true);
  assert.equal(Object.keys(r.nodes).length,0);
  assert.equal(r.recent.length,0);
});
test("only fresh authorized task evidence is active; terminal tasks, private and invented sources fail",()=>{
  const r=publicV5ProjectEvidence(response({
    work: publicWork({source:"owner-declared"}),
    remote:{visibility:"public",tasks:[
      remoteTask({state:"completed"}),
      remoteTask({source:"unverified-agent"}),
      remoteTask({expiresAt:iso(-1000)}),
      remoteTask({project:"Knowledge"}),
      remoteTask({checkpoint:"all systems healthy"}),
      remoteTask({project:"Vesper",source:"github-actions",asOf:iso(-2000),expiresAt:iso(118000)}),
    ]},
    recent:[],
  }),at);
  assert.deepEqual(Object.keys(r.nodes),["vesper"]);
  assert.deepEqual(r.nodes.vesper.active,{
    kind:"remote",source:"Workflow task",at:iso(-2000),
  });
});
test("private Knowledge and unknown project identities are not inferred",()=>{
 const r=publicV5ProjectEvidence(response({
   work:publicWork({project:"Knowledge"}),
   remote:{visibility:"public",tasks:[remoteTask({project:"DevonAkins.com"})]},
   recent:[github({project:"Knowledge",projectSlug:"knowledge",url:"https://github.com/devonalanakins/knowledge"})],
 }),at);
 assert.equal(Object.keys(r.nodes).length,0);
});
