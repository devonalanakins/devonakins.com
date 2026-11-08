import test from "node:test";
import assert from "node:assert/strict";
import { projectV5Atlas, V5_ATLAS_LAYOUT_VERSION } from "../src/v5/atlas-layout.mjs";
import { replayPublicGraphHistory } from "../src/v5/public-graph-history.mjs";
import { renderV5Atlas } from "../src/v5/atlas-markup.mjs";
import { renderV5Preview, renderV5PublicHomepage } from "../src/v5/shell.mjs";

const DAY="2026-11-07T20:00:00.000Z", NOW=Date.parse(DAY);
const reviewed="https://github.com/devonalanakins/devonakins.com/pull/70";
const source="https://github.com/devonalanakins/mizvo/pull/9";
const rec=(seq,action,value,when=DAY)=>({
  schema:1,sequence:seq,action,value,effectiveAt:when,
  evidenceUrl:source,reviewUrl:reviewed,
});
const child={id:"component:mizvo/rooms",type:"component",label:"Rooms",parent:"project:mizvo"};
const relation={
  id:"relation:rooms-merit",type:"documents",
  from:child.id,to:"project:merit",
};

test("eight public structural roots match the approved R14 screenshot anchors",()=>{
  const model=projectV5Atlas(replayPublicGraphHistory([],NOW));
  assert.equal(model.version,V5_ATLAS_LAYOUT_VERSION);
  assert.equal(model.valid,true);
  assert.equal(model.revision,0);
  assert.equal(model.nodes.length,8);
  assert.equal(model.links.length,0);
  assert.deepEqual(model.nodes.map(n=>n.id),[
    "project:devonstation","project:mizvo","section:knowledge-overview",
    "project:anevum","project:rhen-language","project:merit",
    "project:vesper","project:squelch",
  ]);
  assert.ok(model.nodes.every(n=>n.state==="catalogued" && n.parent===null));
  assert.equal(model.nodes.find(n=>n.id==="section:knowledge-overview").type,"section");
});
test("dated approved child and real typed relation produce only reviewed lines",()=>{
  const frame=replayPublicGraphHistory([
    rec(1,"publish-node",child),
    rec(2,"publish-relation",relation),
  ],NOW);
  const model=projectV5Atlas(frame);
  assert.equal(model.valid,true);
  assert.equal(model.nodes.length,9);
  assert.equal(model.links.length,2);
  assert.deepEqual(model.links.map(l=>l.type),["published-membership","documents"]);
  assert.ok(model.links.every(l=>l.evidence.startsWith("reviewed-public")));
  const added=model.nodes.find(n=>n.id===child.id);
  assert.equal(added.label,"Rooms");
  assert.equal(added.type,"component");
  assert.equal(added.parent,"project:mizvo");
  assert.equal(added.position.length,3);
});
test("replay stability: root positions never shift when a reviewed child is published",()=>{
  const past=projectV5Atlas(replayPublicGraphHistory([],NOW));
  const current=projectV5Atlas(replayPublicGraphHistory([rec(1,"publish-node",child)],NOW));
  for (const r of past.nodes) {
    assert.deepEqual(current.nodes.find(n=>n.id===r.id).position,r.position);
  }
  assert.deepEqual(
    current.nodes.find(n=>n.id===child.id).position,
    projectV5Atlas(replayPublicGraphHistory([rec(1,"publish-node",child)],NOW))
      .nodes.find(n=>n.id===child.id).position,
  );
});
test("expired/absent future milestone never appears in a past atlas",()=>{
  const history=[rec(1,"publish-node",child,"2026-11-07T20:00:00.000Z")];
  const past=projectV5Atlas(replayPublicGraphHistory(history,Date.parse("2026-11-06T23:59:59.999Z")));
  assert.equal(past.revision,0);
  assert.equal(past.nodes.length,8);
  assert.equal(past.links.length,0);
});
test("retired nodes remain historical but their structural links disappear",()=>{
  const history=[
    rec(1,"publish-node",child),
    rec(2,"retire-node",{id:child.id}),
  ];
  const projected=projectV5Atlas(replayPublicGraphHistory(history,NOW));
  assert.equal(projected.valid,true);
  assert.equal(projected.nodes.find(n=>n.id===child.id).state,"retired");
  assert.deepEqual(projected.links,[]);
});
test("nested retired structures remain inspectable without phantom live edges",()=>{
  const feature={id:"feature:mizvo/room-entry",type:"feature",label:"Room Entry",parent:child.id};
  const history=[
    rec(1,"publish-node",child),
    rec(2,"publish-node",feature),
    rec(3,"retire-node",{id:feature.id}),
    rec(4,"retire-node",{id:child.id}),
  ];
  const frame=replayPublicGraphHistory(history,NOW);
  assert.equal(frame.valid,true);
  const graph=projectV5Atlas(frame);
  assert.equal(graph.valid,true);
  assert.equal(graph.nodes.length,10);
  assert.equal(graph.nodes.find(n=>n.id===feature.id).state,"retired");
  assert.deepEqual(graph.links,[]);
});
test("invalid graph input cannot create edges or unknown private nodes",()=>{
  const clean=replayPublicGraphHistory([],NOW);
  const hostile=projectV5Atlas({
    ...clean,valid:false,
    nodes:[...clean.nodes,{
      id:"component:private-client/secret",type:"component",label:"SECRET",
      parent:"project:mizvo",state:"published",
    }],
    relations:[{from:"project:mizvo",to:"component:private-client/secret",
      type:"depends-on",state:"published"}],
  });
  assert.equal(hostile.valid,false);
  assert.equal(hostile.links.length,0);
  assert.equal(hostile.nodes.length,8);
  assert.doesNotMatch(JSON.stringify(hostile),/private-client|SECRET|secret/);
});
test("the date-aware semantic inspector and the visual atlas share one version",()=>{
  const html=renderV5Preview("field",{asOf:"2026-11-06",now:NOW});
  assert.match(html,/data-v5-atlas-version="1"/);
  assert.match(html,/data-v5-atlas-revision="0"/);
  assert.match(html,/data-v5-atlas-at="2026-11-06T23:59:59.999Z"/);
  assert.match(html,/data-v5-graph-revision="0"/);
  assert.equal((html.match(/data-v5-atlas-node-id=/g)||[]).length,8);
  assert.match(html,/data-v5-atlas-node-id="project:merit"/);
  assert.match(html,/No reviewed structural events yet/);
  assert.match(html,/No component milestones have been reviewed/);
});
test("the atlas uses native links and details, never JS-only navigation",()=>{
  const html=renderV5Atlas({now:NOW});
  assert.match(html,/<details data-v5-atlas-node-id="project:mizvo"><summary>Mizvo<\/summary>/);
  assert.match(html,/<a class="v5-text-link" href="\/work\/mizvo\/">/);
  assert.match(html,/section:knowledge-overview/);
  assert.match(html,/href="\/__v5_preview__\/knowledge\/"/);
  assert.doesNotMatch(html,/<script|fetch\(|\/api\/|No live reporter connected|PRIVATE_CLIENT/);
});
test("homepage source is unchanged and keeps the locked screenshot target",()=>{
  const home=renderV5PublicHomepage();
  assert.match(home,/data-v5-exact-reference="2026-11-07"/);
  assert.doesNotMatch(home,/data-v5-atlas|data-v5-graph-revision/);
  assert.doesNotMatch(home,/\/__v5_preview__\//);
  assert.match(home,/data-v5-signal-mode="released-v5"/);
});
