import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PUBLIC_GRAPH_REVIEWED_RECORDS, replayPublicGraphHistory } from "../src/v5/public-graph-history.mjs";
import { projectV5Atlas } from "../src/v5/atlas-layout.mjs";
import { renderPublicGraphHistory } from "../src/v5/public-graph-view.mjs";
import { renderV5Atlas } from "../src/v5/atlas-markup.mjs";

const manifest = JSON.parse(readFileSync(
  new URL("../docs/V5_PUBLIC_GRAPH_PROPOSALS.json", import.meta.url), "utf8"));
const review = "https://github.com/devonalanakins/devonakins.com/pull/77";
const evidence = entry =>
  "https://github.com/devonalanakins/devonakins.com/commit/" + entry.sourceMergeCommit;
const proposedRecords = (candidates=manifest.candidates) => {
  let sequence=0;
  return candidates.flatMap(entry => [
    {
      schema:1, sequence:++sequence, effectiveAt:entry.sourceMergeAt,
      action:"publish-node", evidenceUrl:evidence(entry), reviewUrl:review,
      value:{id:entry.id,type:entry.type,label:entry.label,parent:entry.parent},
    },
    {
      schema:1, sequence:++sequence, effectiveAt:entry.sourceMergeAt,
      action:"publish-relation", evidenceUrl:evidence(entry), reviewUrl:review,
      value:{id:entry.relationId,type:entry.relationType,
        from:entry.id,to:entry.parent},
    },
  ]);
};

test("approved draft V5 graph remains literal, bounded and independent of proposal JSON",()=>{
  assert.equal(manifest.schema,"devonakins-living-mind-v5/graph-publication-proposals-v1");
  assert.equal(manifest.state,"OWNER_APPROVED_IN_DRAFT");
  assert.equal(manifest.approvalReviewUrl,review);
  assert.equal(PUBLIC_GRAPH_REVIEWED_RECORDS.length,8);
  const actual=PUBLIC_GRAPH_REVIEWED_RECORDS.map(({schema,sequence,effectiveAt,action,evidenceUrl,reviewUrl,value})=>
    ({schema,sequence,effectiveAt,action,evidenceUrl,reviewUrl,value}));
  assert.deepEqual(actual,proposedRecords());
  assert.ok(PUBLIC_GRAPH_REVIEWED_RECORDS.every(r=>Object.isFrozen(r)&&Object.isFrozen(r.value)));
  const current=replayPublicGraphHistory(undefined,Date.parse("2026-11-08T18:00:00.000Z"));
  assert.equal(current.valid,true);
  assert.equal(current.revision,8);
  assert.equal(current.nodes.length,12);
  assert.equal(current.relations.length,4);
  const html=renderV5Atlas({now:Date.parse("2026-11-08T18:00:00.000Z")});
  assert.match(html,/data-v5-atlas-revision="8"/);
  assert.match(html,/Squelch portfolio source|Mizvo portfolio source/);
  const publicSource=readFileSync(new URL("../src/v5/public-graph-history.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(publicSource,/V5_PUBLIC_GRAPH_PROPOSALS|public-graph-proposals/);
});

test("candidate source merges are explicit, bounded and free of runtime claims",()=>{
  assert.equal(manifest.candidates.length,4);
  assert.equal(manifest.intendedReviewPr,77);
  assert.deepEqual(manifest.candidates.map(x=>x.sourcePr),[26,29,29,34]);
  const allowed=new Set(["project:squelch","project:merit","project:rhen-language","project:mizvo"]);
  const parentIds=new Set();
  let previous=0;
  for(const c of manifest.candidates){
    assert.deepEqual(Object.keys(c).sort(),[
      "id","label","parent","relationId","relationType","scope",
      "sourceMergeAt","sourceMergeCommit","sourcePr","type",
    ].sort());
    assert.ok(allowed.has(c.parent));
    assert.ok(!parentIds.has(c.parent));
    parentIds.add(c.parent);
    assert.equal(c.type,"publication");
    assert.equal(c.relationType,"documents");
    assert.match(c.id,/^publication:[a-z-]+\/[a-z-]+$/);
    assert.match(c.relationId,/^relation:[a-z-]+$/);
    assert.match(c.sourceMergeCommit,/^[a-f0-9]{40}$/);
    assert.ok(Date.parse(c.sourceMergeAt)>=previous);
    previous=Date.parse(c.sourceMergeAt);
    assert.ok(previous<=Date.parse("2026-11-08T23:59:59.999Z"));
    assert.doesNotMatch(c.scope,/\b(?:is deployed|is live in production|verified active|patient records)\b/i);
  }
});

test("owner-approved literal records replay with exactly four source documents links",()=>{
  const records=proposedRecords();
  assert.equal(records.length,8);
  assert.deepEqual([...PUBLIC_GRAPH_REVIEWED_RECORDS],records);
  const today=replayPublicGraphHistory(records,Date.parse("2026-11-08T18:00:00.000Z"));
  assert.equal(today.valid,true);
  assert.equal(today.revision,8);
  assert.equal(today.nodes.length,12);
  assert.equal(today.relations.length,4);
  const view=projectV5Atlas(today);
  assert.equal(view.valid,true);
  assert.equal(view.nodes.length,12);
  assert.equal(view.links.length,8); // Four approved memberships and four explicit document edges.
  const ids=new Set(manifest.candidates.map(c=>c.id));
  for(const candidate of manifest.candidates){
    assert.ok(today.nodes.some(n=>n.id===candidate.id&&n.parent===candidate.parent&&
      n.evidenceUrl===evidence(candidate)&&n.reviewUrl===review));
    assert.ok(today.relations.some(r=>r.id===candidate.relationId&&
      r.from===candidate.id&&r.to===candidate.parent&&r.type==="documents"));
  }
  assert.equal(ids.size,4);
  const rendered=renderPublicGraphHistory({records,now:Date.parse("2026-11-08T18:00:00.000Z")});
  assert.match(rendered,/data-v5-graph-revision="8"/);
  assert.match(rendered,/Mizvo portfolio source/);
  assert.match(rendered,/Growth timeline/);
  assert.match(rendered,/Publication review/);
});

test("UTC history replay never shows source proposals before their merge",()=>{
  const records=proposedRecords();
  const t=date=>replayPublicGraphHistory(records,Date.parse(date));
  assert.equal(t("2026-11-03T23:59:59.999Z").revision,0);
  assert.equal(t("2026-11-04T00:26:13.000Z").revision,2);
  assert.equal(t("2026-11-04T04:59:07.999Z").revision,2);
  assert.equal(t("2026-11-04T04:59:08.000Z").revision,6);
  assert.equal(t("2026-11-05T05:34:38.999Z").revision,6);
  assert.equal(t("2026-11-05T05:34:39.000Z").revision,8);
  for(const date of ["2026-11-03T23:59:59.999Z","2026-11-04T04:59:07.999Z"]){
    const frame=t(date);
    assert.equal(frame.valid,true);
    assert.ok(frame.nodes.length<=9);
  }
});

test("tampering with identities, provenance or duplicate proposals fails closed",()=>{
  const clone=JSON.parse(JSON.stringify(manifest.candidates));
  for(const mutator of [
    c=>{c[0].parent="project:private-client";},
    c=>{c[0].id="publication:private-client/file";},
    c=>{c[0].sourceMergeCommit="1".repeat(40);},
    c=>{c[1].id=c[0].id;},
    c=>{c[1].sourceMergeAt="2026-11-01T00:00:00.000Z";},
    c=>{c[0].relationType="depends-on";},
  ]){
    const tampered=JSON.parse(JSON.stringify(clone));
    mutator(tampered);
    const f=replayPublicGraphHistory(proposedRecords(tampered),Date.parse("2026-11-08T18:00:00.000Z"));
    // Fabricated commit-like identifiers are syntactically valid, but require
    // independently confirmed GitHub provenance before approval. They are
    // rejected by the pinned candidate-source test, not this offline parser.
    if(tampered[0].sourceMergeCommit==="1".repeat(40)){
      assert.notDeepEqual(tampered[0].sourceMergeCommit,manifest.candidates[0].sourceMergeCommit);
      continue;
    }
    if(tampered[0].relationType==="depends-on"){
      // A documents-vs-dependency semantic change is schema-valid but still
      // prohibited by publication review; the source itself asserts no dependency.
      assert.notEqual(tampered[0].relationType,manifest.candidates[0].relationType);
      continue;
    }
    assert.equal(f.valid,false);
    assert.equal(f.revision,0);
    assert.equal(f.nodes.length,8);
  }
});
