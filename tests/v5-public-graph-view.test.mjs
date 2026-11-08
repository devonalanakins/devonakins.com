import test from "node:test";
import assert from "node:assert/strict";
import { renderPublicGraphHistory, selectPublicGraphDate } from "../src/v5/public-graph-view.mjs";
import { renderV5Preview, renderV5PublicHomepage } from "../src/v5/shell.mjs";
import { v5PreviewPlugin } from "../src/v5/preview-plugin.mjs";

const now=Date.parse("2026-11-07T15:00:00.000Z");
const proof="https://github.com/devonalanakins/mizvo/pull/9";
const review="https://github.com/devonalanakins/devonakins.com/pull/70";
const node={id:"component:mizvo/rooms",type:"component",label:"Rooms",parent:"project:mizvo"};
const record=(sequence,action,value,effectiveAt)=>({schema:1,sequence,action,value,effectiveAt,evidenceUrl:proof,reviewUrl:review});

test("strict UTC date parser clamps current day and rejects future/invalid dates",()=>{
  assert.deepEqual(selectPublicGraphDate(null,now),{
    selected:"2026-11-07",maxDate:"2026-11-07",at:now,invalid:false,
  });
  assert.equal(selectPublicGraphDate("2026-11-06",now).at,Date.parse("2026-11-06T23:59:59.999Z"));
  for(const value of ["2026-11-08","2026-02-30","2026-11-7","<script>","2026-11-07T12:00",{},["2026-11-07"]]){
    const result=selectPublicGraphDate(value,now);
    assert.equal(result.invalid,true);
    assert.equal(result.at,now);
  }
});

test("default public archive contains four verified portfolio sources, not product releases",()=>{
  const html=renderPublicGraphHistory({now});
  assert.match(html,/data-v5-graph-revision="8"/);
  assert.match(html,/Squelch portfolio source/);
  assert.match(html,/Mizvo portfolio source/);
  assert.match(html,/>documents<\/span>/);
  assert.match(html,/Approved directory entry; no connection or historical launch is implied/);
  assert.equal((html.match(/class="v5-graph-node"/g)||[]).length,12);
  assert.match(html,/name="asOf" type="date" required/);
  assert.match(html,/method="get" action="\/__v5_preview__\/field\/"/);
  assert.doesNotMatch(html,/fetch\(|\/api\/|secret|D1|private-client/);
});

test("dated history is displayed as reviewed milestones only when supplied",()=>{
  const records=[
    record(1,"publish-node",node,"2026-11-05T10:00:00.000Z"),
    record(2,"retire-node",{id:node.id},"2026-11-07T10:00:00.000Z"),
  ];
  const earlier=renderPublicGraphHistory({records,now,requestedDate:"2026-11-06"});
  assert.match(earlier,/STRUCTURE REVISION <strong>1<\/strong>/);
  assert.match(earlier,/Reviewed components/);
  assert.match(earlier,/Rooms/);
  assert.doesNotMatch(earlier,/Retired structure/);
  const latest=renderPublicGraphHistory({records,now,requestedDate:"2026-11-07"});
  assert.match(latest,/STRUCTURE REVISION <strong>2<\/strong>/);
  assert.match(latest,/Retired structure/);
  assert.match(latest,/Publication review/);
  assert.match(latest,/Source evidence/);
  assert.match(latest,/Growth timeline/);
  assert.match(latest,/Retired structure/);
});

test("invalid dates and invalid history fail closed without echoing hostile inputs",()=>{
  const hostile=renderPublicGraphHistory({now,requestedDate:"<img src=x>"});
  assert.match(hostile,/Choose a valid UTC date/);
  assert.doesNotMatch(hostile,/<img src=x>/);
  const invalid=renderPublicGraphHistory({now,records:[
    record(1,"publish-node",{...node,label:"<script>PRIVATE</script>"},"2026-11-05T10:00:00.000Z"),
  ]});
  assert.match(invalid,/history could not be validated/);
  assert.doesNotMatch(invalid,/<script>|PRIVATE/);
  assert.equal((invalid.match(/class="v5-graph-node"/g)||[]).length,8);
});

test("field preview has useful static SSR and public homepage remains source-compatible",()=>{
  const field=renderV5Preview("field",{now,asOf:"2026-11-06"});
  assert.match(field,/Public systems atlas/);
  assert.match(field,/value="2026-11-06"/);
  assert.match(field,/max="2026-11-07"/);
  assert.match(field,/noindex,nofollow,noarchive/);
  assert.doesNotMatch(field,/<script[^>]+src="https:/);
  const home=renderV5PublicHomepage();
  assert.match(home,/data-v5-signal-mode="released-v5"/);
  assert.doesNotMatch(home,/v5-graph-history|\/__v5_preview__\//);
});

test("gated middleware forwards UTC date selection with no extra API or cache",async()=>{
 let middleware;
 v5PreviewPlugin({enabled:"1"}).configureServer({
   middlewares:{use:(fn)=>{middleware=fn;}},
   transformIndexHtml:async(_path,html)=>html,
 });
 const response={
   statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},
   end(body){this.body=body;},
 };
 await middleware({url:"/__v5_preview__/field/?asOf=2026-11-06",method:"GET"},response,()=>assert.fail("must match"));
 assert.match(response.body,/value="2026-11-06"/);
 assert.match(response.body,/Public systems atlas/);
 assert.equal(response.headers["Cache-Control"],"no-store");
 assert.match(response.headers["X-Robots-Tag"],/noindex/);
});
