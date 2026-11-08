import test from "node:test";
import assert from "node:assert/strict";
import {
  PUBLIC_GRAPH_HISTORY_VERSION, PUBLIC_GRAPH_REVIEWED_RECORDS, replayPublicGraphHistory,
} from "../src/v5/public-graph-history.mjs";

const at="2026-11-07T20:00:00.000Z";
const proof="https://github.com/devonalanakins/mizvo/pull/9";
const review="https://github.com/devonalanakins/devonakins.com/pull/70";
const record=(seq,action,value,effectiveAt=at)=>({
  schema:1,sequence:seq,effectiveAt,action,evidenceUrl:proof,reviewUrl:review,value,
});
const node={id:"component:mizvo/rooms",type:"component",label:"Rooms",parent:"project:mizvo"};
const node2={id:"feature:mizvo/review",type:"feature",label:"Review",parent:"project:mizvo"};
const link={id:"relation:mizvo-rooms-review",type:"implements",from:node.id,to:node2.id};
const history=[
  record(1,"publish-node",node),record(2,"publish-node",node2),
  record(3,"publish-relation",link),
];

test("draft V5 history publishes exactly four owner-approved portfolio sources",()=>{
  const f=replayPublicGraphHistory(undefined,Date.parse("2026-11-08T18:00:00.000Z"));
  assert.equal(f.schema,PUBLIC_GRAPH_HISTORY_VERSION);
  assert.equal(f.valid,true);
  assert.equal(f.revision,8);
  assert.equal(f.nodes.length,12);
  assert.equal(f.nodes.filter(n=>n.parent===null).length,8);
  assert.equal(f.nodes.filter(n=>n.type==="publication").length,4);
  assert.equal(f.relations.length,4);
  assert.equal(f.changes.length,8);
  assert.equal(f.nodes.find(x=>x.id==="section:knowledge-overview").type,"section");
  assert.equal(PUBLIC_GRAPH_REVIEWED_RECORDS.length,8);
  assert.ok(f.relations.every(r=>r.type==="documents" && r.from.startsWith("publication:")));
  assert.doesNotMatch(JSON.stringify(f),/private-client|patient|active reporter/i);
});

test("replays reviewed nodes and typed relationship in deterministic revision order",()=>{
  const f=replayPublicGraphHistory(history,Date.parse(at));
  assert.equal(f.valid,true);
  assert.equal(f.revision,3);
  assert.equal(f.nodes.length,10);
  assert.equal(f.relations.length,1);
  assert.deepEqual([f.relations[0].from,f.relations[0].to],[node.id,node2.id]);
  assert.equal(f.relations[0].type,"implements");
  assert.equal(f.nodes.find(x=>x.id===node.id).evidenceUrl,proof);
  assert.deepEqual(f.changes.map(c=>c.sequence),[1,2,3]);
});

test("time travel cannot leak later milestones or edit earlier provenance",()=>{
  const records=[
    record(1,"publish-node",node,"2026-11-07T18:00:00.000Z"),
    record(2,"publish-node",node2,"2026-11-07T20:00:00.000Z"),
  ];
  const past=replayPublicGraphHistory(records,Date.parse("2026-11-07T19:00:00.000Z"));
  assert.equal(past.revision,1);
  assert.equal(past.nodes.length,9);
  assert.equal(past.nodes.some(n=>n.id===node2.id),false);
  assert.equal(replayPublicGraphHistory(records,Date.parse(at)).revision,2);
});

test("retirement marks child provenance and hides incident active relations without erasing history",()=>{
  const h=[...history,record(4,"retire-node",{id:node2.id})];
  const f=replayPublicGraphHistory(h,Date.parse(at));
  assert.equal(f.valid,true);
  assert.equal(f.revision,4);
  assert.equal(f.nodes.find(n=>n.id===node2.id).state,"retired");
  assert.equal(f.nodes.find(n=>n.id===node2.id).retiredAt,at);
  assert.equal(f.relations.length,0);
  assert.equal(replayPublicGraphHistory(h.slice(0,3),Date.parse(at)).relations.length,1);
});

test("explicit relation retirement removes only that edge, not its nodes",()=>{
  const f=replayPublicGraphHistory([...history,record(4,"retire-relation",{id:link.id})],Date.parse(at));
  assert.equal(f.valid,true);
  assert.equal(f.nodes.length,10);
  assert.equal(f.relations.length,0);
});

test("fail closed for malformed, reordered, duplicate, unreviewed, private, unknown data",()=>{
  const bad=[
    [record(2,"publish-node",node)],
    [...history,record(3,"publish-node",node)],
    [record(1,"publish-node",{...node,id:"component:private-client/secret"})],
    [record(1,"publish-node",{...node,label:"<script>alert(1)</script>"})],
    [record(1,"publish-node",{...node,parent:"section:knowledge-overview"})],
    [record(1,"publish-node",{...node,parent:"project:private"})],
    [record(1,"publish-node",{...node,type:"PRIVATE_CLIENT"})],
    [record(1,"publish-node",node,"2026-11-07")],
    [record(1,"publish-node",node),record(2,"publish-node",node)],
    [record(1,"publish-relation",{...link,from:"project:private"})],
    [record(1,"retire-node",{id:"project:mizvo"})],
    [record(1,"publish-node",node),record(2,"retire-node",{id:node.id}),
      record(3,"publish-node",{...node2,parent:node.id})],
    [{...record(1,"publish-node",node),evidenceUrl:
      "https://github.com/devonalanakins/private-client/pull/1"}],
    [{...record(1,"publish-node",node),evidenceUrl:
      "https://github.com/devonalanakins/vesper/pull/1"}],
    [{...record(1,"publish-node",node),reviewUrl:"https://github.com/evil/repo/pull/1"}],
    [{...record(1,"publish-node",node),secret:"private"}],
  ];
  for(const b of bad){
    const f=replayPublicGraphHistory(b,Date.parse(at));
    assert.equal(f.valid,false,JSON.stringify(b));
    assert.equal(f.revision,0);
    assert.equal(f.nodes.length,8);
    assert.equal(f.relations.length,0);
    assert.doesNotMatch(JSON.stringify(f),/private-client|<script>|secret|PRIVATE_CLIENT/);
  }
});

test("caps unbounded event lists and rejects malformed replay times",()=>{
  assert.equal(replayPublicGraphHistory(Array(129).fill(record(1,"publish-node",node))).valid,false);
  assert.equal(replayPublicGraphHistory(history,NaN).valid,false);
  assert.equal(replayPublicGraphHistory(history,-1).valid,false);
});

test("explicit relationship requires existing public nonretired endpoints",()=>{
  const f=replayPublicGraphHistory([record(1,"publish-relation",{
    id:"relation:knowledge-client",type:"depends-on",
    from:"section:knowledge-overview",to:"project:private",
  })],Date.parse(at));
  assert.equal(f.valid,false);
  const impossible=replayPublicGraphHistory([
    record(1,"publish-node",node),record(2,"retire-node",{id:node.id}),
    record(3,"publish-relation",{...link,to:"project:mizvo"}),
  ],Date.parse(at));
  assert.equal(impossible.valid,false);
});

test("a late invalid record invalidates earlier snapshots, never leaks future edits",()=>{
  const poisoned=[
    record(1,"publish-node",node,"2026-11-07T18:00:00.000Z"),
    record(2,"publish-node",{...node2,label:"<script>SECRET_CLIENT</script>"},at),
  ];
  assert.equal(replayPublicGraphHistory(poisoned,Date.parse("2026-11-07T19:00:00.000Z")).valid,false);
  const reversed=[
    record(1,"publish-node",node,at),
    record(2,"publish-node",node2,"2026-11-07T18:00:00.000Z"),
  ];
  assert.equal(replayPublicGraphHistory(reversed,Date.parse(at)).valid,false);
});

test("explicit reinstatement preserves identity and earlier retirement in historical replay",()=>{
  const later="2026-11-08T02:00:00.000Z";
  const h=[...history,record(4,"retire-node",{id:node2.id}),
    record(5,"reinstate-node",{id:node2.id},later)];
  const past=replayPublicGraphHistory(h,Date.parse(at));
  assert.equal(past.nodes.find(n=>n.id===node2.id).state,"retired");
  assert.equal(past.relations.length,0);
  const present=replayPublicGraphHistory(h,Date.parse(later));
  assert.equal(present.valid,true);
  const restored=present.nodes.find(n=>n.id===node2.id);
  assert.equal(restored.state,"published");
  assert.equal(restored.retiredAt,at);
  assert.equal(restored.reinstatedAt,later);
  assert.equal(restored.evidenceUrl,proof);
  assert.equal(present.relations.length,1);
});
test("retired edges require their own explicit reinstatement",()=>{
  const h=[...history,record(4,"retire-relation",{id:link.id}),
    record(5,"retire-node",{id:node2.id}),record(6,"reinstate-node",{id:node2.id})];
  assert.equal(replayPublicGraphHistory(h,Date.parse(at)).relations.length,0);
  const restored=replayPublicGraphHistory([...h,record(7,"reinstate-relation",{id:link.id})],Date.parse(at));
  assert.equal(restored.valid,true);
  assert.equal(restored.relations.length,1);
});
test("reinstatement cannot create unknown identities, bypass retired parents or duplicate relations",()=>{
  for(const h of [
    [record(1,"reinstate-node",{id:node.id})],
    [...history,record(4,"reinstate-node",{id:node.id})],
    [...history,record(4,"reinstate-relation",{id:link.id})],
    [...history,record(4,"retire-relation",{id:link.id}),record(5,"retire-node",{id:node.id}),record(6,"reinstate-relation",{id:link.id})],
    [record(1,"publish-node",node),record(2,"publish-node",{...node2,parent:node.id}),
      record(3,"retire-node",{id:node2.id}),record(4,"retire-node",{id:node.id}),record(5,"reinstate-node",{id:node2.id})],
    [...history,record(4,"retire-relation",{id:link.id}),record(5,"publish-relation",{...link,id:"relation:mizvo-replacement"}),record(6,"reinstate-relation",{id:link.id})],
  ]) assert.equal(replayPublicGraphHistory(h,Date.parse(at)).valid,false);
});
test("graph manifest rejects coercible evidence and labels instead of executing their conversion",()=>{
  for(const field of ['evidenceUrl','reviewUrl']) {
    let called=false;
    const r=record(1,'publish-node',node);
    const text=r[field];r[field]={toString(){called=true;return text;}};
    assert.equal(replayPublicGraphHistory([r],Date.parse(at)).valid,false);
    assert.equal(called,false);
  }
  assert.equal(replayPublicGraphHistory([record(1,'publish-node',{...node,label:{toString:()=>"Rooms"}})],Date.parse(at)).valid,false);
});
