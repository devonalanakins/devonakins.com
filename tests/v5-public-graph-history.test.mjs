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

test("starts with exactly eight catalogued public identities and no invented graph/history",()=>{
  const f=replayPublicGraphHistory();
  assert.equal(f.schema,PUBLIC_GRAPH_HISTORY_VERSION);
  assert.equal(f.valid,true);
  assert.equal(f.revision,0);
  assert.equal(f.nodes.length,8);
  assert.equal(f.relations.length,0);
  assert.equal(f.changes.length,0);
  assert.equal(f.nodes.find(x=>x.id==="section:knowledge-overview").type,"section");
  assert.equal(PUBLIC_GRAPH_REVIEWED_RECORDS.length,0);
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
    record(2,"publish-node",{...node2,label:"SECRET_CLIENT"},at),
  ];
  assert.equal(replayPublicGraphHistory(poisoned,Date.parse("2026-11-07T19:00:00.000Z")).valid,false);
  const reversed=[
    record(1,"publish-node",node,at),
    record(2,"publish-node",node2,"2026-11-07T18:00:00.000Z"),
  ];
  assert.equal(replayPublicGraphHistory(reversed,Date.parse(at)).valid,false);
});
