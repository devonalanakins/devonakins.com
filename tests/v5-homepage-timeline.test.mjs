import test from "node:test";
import assert from "node:assert/strict";
import { publicHomepageTimeline } from "../src/v5/homepage-timeline.mjs";
import { renderReferenceHomepage } from "../src/v5/reference-home.mjs";

const now = Date.parse("2026-11-09T07:00:00.000Z");
const iso = delta => new Date(now + delta).toISOString();
const github = { available:true, events:[{
  title:"DevonAkins.com", kind:"Commit", at:iso(-360_000),
  age:"6m ago", href:"https://github.com/devonalanakins/devonakins.com",
}] };
const post = {
  href:"https://www.threads.com/@fixtureDevon/post/CXtzA7JPq5V",
  text:"Documented progress from source, not invented activity",
  publishedAt:iso(-90_000),media:false,
};
const snapshot = {version:4,asOf:iso(-2_000),threads:{
  version:1,state:"connected",checkedAt:iso(-2_000),posts:[post],
}};

test("homepage keeps the approved five source cells and exposes Threads provenance",()=>{
  const html=renderReferenceHomepage();
  assert.equal((html.match(/data-v5-home-source="/g)||[]).length,5);
  assert.match(html,/data-v5-home-threads-status/);
  assert.match(html,/Verified public GitHub and Threads activity/);
  assert.match(html,/data-v5-threads-posts/);
  assert.doesNotMatch(html,/aria-label="Threads profile link pending verification"/);
});

test("Threads and approved GitHub events interleave by publication date without implying live coding",()=>{
  const result=publicHomepageTimeline(github,snapshot,now);
  assert.equal(result.threadsConnected,true);
  assert.equal(result.entries.length,2);
  assert.deepEqual(result.entries.map(x=>x.source),["threads","github"]);
  assert.match(result.entries[0].detail,/Threads · Posted Nov 9, 2026 UTC/);
  assert.equal(result.entries[0].href,post.href);
  assert.equal(result.entries[0].heading,post.text);
  assert.equal(result.entries[1].heading,"GitHub · Commit · DevonAkins.com");
  assert.doesNotMatch(JSON.stringify(result),/editing now|active developer|live coding/i);
});

test("Threads disconnected, stale or unsafe activity vanishes while approved GitHub history remains",()=>{
  const cases=[
    null,
    {...snapshot,threads:{...snapshot.threads,state:"disconnected",posts:[]}},
    {...snapshot,asOf:iso(-100_000)},
    {...snapshot,threads:{...snapshot.threads,posts:[{...post,href:"https://evil.example/post/1234"}]}},
  ];
  for(const input of cases){
    const value=publicHomepageTimeline(github,input,now);
    assert.equal(value.threadsConnected,false);
    assert.deepEqual(value.entries.map(x=>x.source),["github"]);
  }
  const hidden=publicHomepageTimeline({available:false,events:github.events},snapshot,now);
  assert.deepEqual(hidden.entries,[]);
  assert.equal(hidden.threadsConnected,false);
});

test("timeline stays bounded and latest-first when multiple verified posts arrive",()=>{
  const posts=[post,{...post,href:"https://www.threads.com/@fixtureDevon/post/DXtzA7JPq5V",text:"Follow-up",publishedAt:iso(-500)}];
  const timeline=publicHomepageTimeline(github,{...snapshot,threads:{...snapshot.threads,posts}},now);
  assert.deepEqual(timeline.entries.map(x=>x.source),["threads","threads","github"]);
  assert.equal(timeline.entries[0].heading,"Follow-up");
});
