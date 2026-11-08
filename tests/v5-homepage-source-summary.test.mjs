import test from "node:test";
import assert from "node:assert/strict";
import { renderReferenceHomepage } from "../src/v5/reference-home.mjs";
import { publicV5ProjectEvidence } from "../src/v5/public-evidence.mjs";
import { publicHomepageSourceSummary } from "../src/v5/homepage-source-summary.mjs";

const now = Date.parse("2026-11-08T18:00:00.000Z");
const iso = offset => new Date(now + offset).toISOString();

test("the approved homepage contains exactly five independent source cells and a readable feed/focus", () => {
  const html=renderReferenceHomepage();
  for (const source of ["github","tasks","spotify","gpt","coding"])
    assert.ok(html.includes('data-v5-home-source="' + source + '"'), source);
  assert.equal((html.match(/data-v5-home-source="/g)||[]).length,5);
  assert.match(html, /data-v5-home-activity-list/);
  assert.match(html, /data-v5-home-activity-empty/);
  assert.match(html, /data-v5-home-focus-detail/);
  assert.match(html, /No current public work observed/);
  assert.match(html, /Source unavailable/);
  assert.doesNotMatch(html,/Active · \d+ repos|\d+ in progress|Now playing:.*Hans Zimmer/);
});

test("fresh, specifically shared task and editor observations remain separate from GitHub history", () => {
  const value = {
    version:4, asOf:iso(-1000),
    recent:[{project:"Mizvo",projectSlug:"mizvo",kind:"Commit",
      at:iso(-300_000),url:"https://github.com/devonalanakins/mizvo"}],
    work:{visibility:"public",source:"editor-heartbeat",
      project:"Mizvo",state:"developing",asOf:iso(-1_000)},
    remote:{visibility:"public",tasks:[{
      project:"Merit",source:"chatgpt-work",state:"running",
      checkpoint:null,asOf:iso(-2_000),expiresAt:iso(100_000)
    }]}
  };
  const projection=publicV5ProjectEvidence(value,now);
  const state=publicHomepageSourceSummary(projection,now);
  assert.equal(state.available,true);
  assert.match(state.github,/Commit · Mizvo/);
  assert.match(state.tasks,/Work task · Merit/);
  assert.match(state.coding,/Editor observed · Mizvo/);
  assert.equal(state.focus?.title,"Mizvo");
  assert.equal(state.focus?.kind,"editor");
  assert.equal(state.events.length,1);
  assert.equal(state.events[0].href,"https://github.com/devonalanakins/mizvo");
});

test("dated commits alone never imply a current coding session or running task",()=>{
  const value={version:4,asOf:iso(-1000),recent:[{
    project:"Mizvo",projectSlug:"mizvo",kind:"Commit",at:iso(-300_000),
    url:"https://github.com/devonalanakins/mizvo"
  }]};
  const state=publicHomepageSourceSummary(publicV5ProjectEvidence(value,now),now);
  assert.equal(state.events.length,1);
  assert.equal(state.focus,null);
  assert.equal(state.tasks,"No current shared tasks");
  assert.equal(state.coding,"No current coding observation");
});

test("missing, expired and revoked public sources fail closed",()=>{
  const before=publicHomepageSourceSummary(null,now);
  assert.equal(before.available,false);
  assert.equal(before.events.length,0);
  const stale=publicHomepageSourceSummary(publicV5ProjectEvidence({
    version:4,asOf:iso(-70_000),recent:[]
  },now),now);
  assert.equal(stale.available,false);
  const hidden=publicHomepageSourceSummary(publicV5ProjectEvidence({
    version:4,asOf:iso(-1_000),recent:[],
    work:{visibility:"hidden",source:"editor-heartbeat",project:"Mizvo",
      state:"developing",asOf:iso(-1_000)},
    remote:{visibility:"private",tasks:[{
      project:"Merit",source:"chatgpt-work",state:"running",
      checkpoint:null,asOf:iso(-1_000),expiresAt:iso(100_000)
    }]}
  },now),now);
  assert.equal(hidden.focus,null);
  assert.equal(hidden.events.length,0);
  assert.equal(hidden.coding,"No current coding observation");
  assert.equal(hidden.tasks,"No current shared tasks");
});

test("foreign or unapproved link properties never enter the displayed feed",()=>{
  const state=publicHomepageSourceSummary({
    available:true,nodes:{},recent:[
      {slug:"mizvo",kind:"Commit",at:iso(-1000),
        url:"https://example.com/impersonate"},
      {slug:"private-unapproved",kind:"Commit",at:iso(-1000),
        url:"https://github.com/devonalanakins/mizvo"}
    ]
  },now);
  assert.equal(state.events.length,0);
  assert.equal(state.github,"No recent approved events");
});
