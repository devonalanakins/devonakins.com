import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHandler } from '../src/worker.mjs';
import { createLiveSignal } from '../src/live-signal.mjs';
import {
  GPT_OWNER_METRICS,
  createGptSnapshotOwnerApi,
  readPublicGptSnapshot,
} from '../src/gpt-snapshots.mjs';

const START=Date.parse('2026-11-07T14:00:00.000Z');
const identity={access:{aud:'fixture',getIdentity:async()=>({email:'owner@example.test'})}};

function fixture() {
  const sql=new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../migrations/0002_presence.sql',import.meta.url),'utf8'));
  sql.exec(readFileSync(new URL('../migrations/0008_gpt_owner_metrics.sql',import.meta.url),'utf8'));
  sql.exec(readFileSync(new URL('../migrations/0009_gpt_capture_revision.sql',import.meta.url),'utf8'));
  let time=START, hook=()=>{};
  const db={prepare(q) {
    const stmt=sql.prepare(q);
    let values=[];
    return {
      bind(...v){values=v;return this;},
      execute(){const result=stmt.all(...values);return {results:result,meta:{changes:Number(sql.prepare('SELECT changes() AS n').get().n)}};},
      async first(){const result=stmt.get(...values)||null;await hook(q);return result;},
      async all(){const result={results:stmt.all(...values)};await hook(q);return result;},
      async run(){const result=stmt.run(...values);return {meta:{changes:Number(result.changes)}};},
    };
  },async batch(statements){
    sql.exec('BEGIN IMMEDIATE');
    try{const result=statements.map(s=>s.execute());sql.exec('COMMIT');return result;}
    catch(error){sql.exec('ROLLBACK');throw error;}
  }};
  const env={
    LISTENING_DB:db,
    PRESENCE_ENABLED:'true',
    PRESENCE_PUBLIC_RELEASE_APPROVED:'false',
    GPT_SNAPSHOT_PUBLIC_RELEASE_APPROVED:'false',
    LISTENING_OWNER_EMAIL:'owner@example.test',
    LISTENING_ACCESS_AUD:'fixture',
  };
  const api=createGptSnapshotOwnerApi({clock:()=>time});
  function req(method='GET', data, origin='https://devonakins.com',path='/api/presence/owner?channel=gpt') {
    return new Request('https://devonakins.com'+path,{
      method,
      headers:{Origin:origin,'Content-Type':'application/json','Accept':'application/json'},
      ...(data===undefined?{}:{body:JSON.stringify(data)}),
    });
  }
  const owner=(method='GET',data,ctx=identity,origin)=>{
    if(data?.action==='sharing'||method==='DELETE'){
      data={...data,captureRevision:data.captureRevision??sql.prepare('SELECT revision FROM gpt_capture_state WHERE id=1').get().revision};
      if(method==='DELETE'&&data.revision===undefined)data.revision=sql.prepare('SELECT revision FROM gpt_owner_metrics WHERE metric=?').get(data.metric)?.revision??0;
    }
    return api(req(method,data,origin),env,ctx);
  };
  const save=(metric,value)=>owner('POST',{action:'record',metric,value});
  const grant=()=>{env.GPT_SNAPSHOT_PUBLIC_RELEASE_APPROVED='true';env.PRESENCE_PUBLIC_RELEASE_APPROVED='true';sql.exec('UPDATE presence_state SET public_enabled=1,revision=revision+1')};
  const now=()=>time;
  return {sql,db,env,api,req,owner,save,grant,now,advance:ms=>{time+=ms;},hook:fn=>{hook=fn;}};
}
test('additive metric table starts empty without mutating existing owner privacy state',async()=>{
  const f=fixture();
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM gpt_owner_metrics').get().n,0);
  assert.deepEqual({...f.sql.prepare('SELECT id,public_enabled,private_work FROM presence_state').get()},{id:1,public_enabled:0,private_work:0});
  const data=await (await f.owner()).json();
  assert.deepEqual(data.observations,[]);
  assert.equal(data.publishingAllowed,false);
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,null);
});
test('unconfigured and unauthenticated owner paths fail closed without opening the database',async()=>{
  const f=fixture();
  const noDb={...f.env,LISTENING_DB:undefined};
  assert.equal((await f.api(f.req(),noDb,identity)).status,503);
  for(const bad of [
    {},{access:{...identity.access,aud:'wrong'}},
    {access:{aud:'fixture',getIdentity:async()=>({email:'other@example.test'})}},
  ]){
    assert.equal((await f.owner('GET',undefined,bad)).status,403);
    assert.equal((await f.owner('POST',{action:'record',metric:'profile_7d_tokens',value:1},bad)).status,403);
  }
  for(const origin of ['https://attacker.invalid','null','https://devonakins.com.attacker.invalid']){
    assert.equal((await f.owner('POST',{action:'record',metric:'profile_7d_tokens',value:1},identity,origin)).status,403);
  }
  assert.equal((await f.api(f.req('GET',undefined,undefined,'/api/presence/owner?channel=tasks'),f.env,identity)).status,404);
  assert.equal((await f.api(f.req('GET',undefined,undefined,'/owner/gpt/'),f.env,identity)).status,200);
});
test('valid records derive source/server capture time, no free text or account identifiers',async()=>{
  const f=fixture();
  const saved=await f.save('profile_7d_tokens',621712155);
  assert.equal(saved.status,200);
  const row=f.sql.prepare('SELECT * FROM gpt_owner_metrics').get();
  assert.equal(row.metric,'profile_7d_tokens');
  assert.equal(row.value,621712155);
  assert.equal(row.source,'owner-profile-capture');
  assert.equal(row.recorded_at,START);
  assert.equal(row.shared,0);
  const output=await (await f.owner()).json();
  assert.equal(output.observations[0].value,621712155);
  assert.equal(output.observations[0].sourceUpdatedAt,null);
  assert.equal(output.observations[0].scope,'owner-profile');
  assert.equal(JSON.stringify(output).includes('owner@example.test'),false);
  for(const extra of [
    {action:'record',metric:'profile_7d_tokens',value:1,rawText:'PRIVATE'},
    {action:'record',metric:'profile_7d_tokens',value:'19'},
    {action:'record',metric:'profile_7d_tokens',value:-1},
    {action:'record',metric:'profile_7d_tokens',value:1.2},
    {action:'record',metric:'profile_7d_tokens',value:1e15},
    {action:'record',metric:'private-client',value:1},
    {action:'record',metric:'work_codex_credits_used',value:1,source:'owner-profile-capture'},
    {action:'record',metric:'profile_7d_tokens',value:1,accountId:'PRIVATE'},
  ]) assert.equal((await f.owner('POST',extra)).status,400,JSON.stringify(extra));
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM gpt_owner_metrics').get().n,1);
});
test('private record cannot become public until both release flags, individual opt-in and presence are on',async()=>{
  const f=fixture();
  await f.save('profile_7d_tokens',400);
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,null);
  assert.equal((await f.owner('POST',{action:'sharing',metric:'profile_7d_tokens',enabled:true,revision:0})).status,403);
  f.env.GPT_SNAPSHOT_PUBLIC_RELEASE_APPROVED='true';
  assert.equal((await f.owner('POST',{action:'sharing',metric:'profile_7d_tokens',enabled:true,revision:0})).status,403);
  f.grant();
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,null);
  assert.equal((await f.owner('POST',{action:'sharing',metric:'profile_7d_tokens',enabled:true,revision:0})).status,200);
  const published=await readPublicGptSnapshot(f.env,f.now());
  assert.equal(published.count,400);
  assert.equal(published.label,'7-day tokens');
  assert.equal(published.asOf,new Date(START).toISOString());
  assert.equal(published.sourceUpdatedAt,null);
  assert.equal(published.freshness,'recent');
  assert.equal((await f.owner('POST',{action:'sharing',metric:'profile_7d_tokens',enabled:false,revision:0})).status,409);
  f.sql.exec('UPDATE presence_state SET private_work=1,revision=revision+1');
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,null);
  f.sql.exec('UPDATE presence_state SET private_work=0,public_enabled=0,revision=revision+1');
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,null);
  f.sql.exec('UPDATE presence_state SET private_work=0,public_enabled=1,revision=revision+1');
  f.env.PRESENCE_ENABLED='false';
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,null, 'master presence switch must fail closed');
});
test('record correction is observed after five minutes but does not pretend source updated automatically',async()=>{
  const f=fixture();
  f.grant();
  await f.save('profile_7d_tokens',2700000000);
  const one=await (await f.owner()).json();
  await f.owner('POST',{action:'sharing',metric:'profile_7d_tokens',enabled:true,revision:0});
  f.advance(5*60_000);
  const old=await readPublicGptSnapshot(f.env,f.now());
  assert.equal(old.count,2700000000);
  assert.equal(old.asOf,one.observations[0].asOf);
  f.advance(21*60*60_000);
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).freshness,'recent');
  f.advance(4*60*60_000);
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).freshness,'historical');
  assert.equal((await f.save('profile_7d_tokens',2800000000)).status,200);
  const newer=await readPublicGptSnapshot(f.env,f.now());
  assert.equal(newer.count,2800000000);
  assert.equal(newer.freshness,'recent');
  assert.equal(newer.source,'owner-profile-capture');
  assert.equal(newer.sourceUpdatedAt,null);
});
test('revocation, deletion and source failures never leave a published snapshot behind',async()=>{
  const f=fixture();f.grant();
  await f.save('profile_7d_tokens',50);
  assert.equal((await f.owner('POST',{action:'sharing',metric:'profile_7d_tokens',enabled:true,revision:0})).status,200);
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,50);
  assert.equal((await f.owner('POST',{action:'sharing',metric:'profile_7d_tokens',enabled:false,revision:1})).status,200);
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,null);
  await f.owner('POST',{action:'sharing',metric:'profile_7d_tokens',enabled:true,revision:2});
  assert.equal((await f.owner('DELETE',{metric:'profile_7d_tokens'})).status,200);
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,null);
  f.env.GPT_SNAPSHOT_PUBLIC_RELEASE_APPROVED='false';
  f.env.LISTENING_DB={prepare(){throw Error('database should not be read without public gate');}};
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,null);
});
test('different analytics scopes remain separate; featured seven-day tokens are stable',async()=>{
  const f=fixture();f.grant();
  for(const [metric,value] of [
    ['profile_7d_tokens',2],['work_codex_credits_remaining',4.5],
    ['business_7d_messages',11],['profile_streak_days',3],
  ]){
    assert.equal((await f.save(metric,value)).status,200);
    const revision=0;
    assert.equal((await f.owner('POST',{action:'sharing',metric,enabled:true,revision})).status,200);
    f.advance(1000);
  }
  const latest=await readPublicGptSnapshot(f.env,f.now());
  assert.equal(latest.metric,'profile_7d_tokens');
  assert.equal(latest.count,2);
  assert.equal(latest.observations.length,4);
  assert.equal(latest.scope,'owner-profile');
  const all=await (await f.owner()).json();
  assert.equal(all.observations.length,4);
  assert.equal(Object.keys(GPT_OWNER_METRICS).length,8);
  assert.ok(!JSON.stringify(latest).includes('2700000000'));
});
test('independently rechecks revoked row and global pause during async projection',async()=>{
  const f=fixture();f.grant();
  await f.save('profile_7d_tokens',10);
  await f.owner('POST',{action:'sharing',metric:'profile_7d_tokens',enabled:true,revision:0});
  let did=false;
  f.hook(q=>{
    if(!did && q.startsWith('SELECT metric,value,source,recorded_at,revision,shared FROM gpt_owner_metrics ORDER BY')){
      did=true;
      f.sql.exec("UPDATE gpt_owner_metrics SET shared=0,revision=revision+1 WHERE metric='profile_7d_tokens'");
    }
  });
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,null);
  f.hook(()=>{});
});
test('Worker protects GPT owner route and serves only after Access identity validation',async()=>{
  const f=fixture();
  const site=createHandler({}, {version:'test'}, {now:()=>new Date(f.now())});
  const url='https://devonakins.com/api/presence/owner?channel=gpt';
  const no=await site.fetch(new Request(url),f.env,{});
  assert.equal(no.status,403);
  const yes=await site.fetch(new Request(url),f.env,identity);
  assert.equal(yes.status,200);
  assert.equal((await yes.json()).observations.length,0);
  const page=await site.fetch(new Request('https://devonakins.com/owner/gpt/'),f.env,identity);
  assert.equal(page.status,200);
  assert.match(await page.text(),/Recorded usage/);
  assert.equal(page.headers.get('Cache-Control'),'private, no-store');
  assert.equal((await site.fetch(new Request('https://devonakins.com/owner/gpt/'),f.env,{})).status,403);
});

const batch=(f,revision,measurements)=>f.owner('POST',{action:'record-batch',revision,measurements});
const currentRevision=async f=>(await (await f.owner()).json()).revision;
test('batch stores all eight in one transaction without sharing; omitted values retain capture time',async()=>{
  const f=fixture();
  const all=Object.keys(GPT_OWNER_METRICS).map((metric,i)=>({metric,value:i+1}));
  const saved=await batch(f,0,all);
  assert.equal(saved.status,200);
  assert.equal((await saved.json()).count,8);
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM gpt_owner_metrics WHERE shared=0 AND recorded_at=?').get(START).n,8);
  const before=f.sql.prepare('SELECT * FROM gpt_owner_metrics WHERE metric=?').get('profile_7d_messages');
  f.advance(1000);
  const revision=await currentRevision(f);
  assert.equal((await batch(f,revision,[{metric:'profile_7d_tokens',value:0}])).status,200);
  assert.deepEqual(f.sql.prepare('SELECT * FROM gpt_owner_metrics WHERE metric=?').get('profile_7d_messages'),before);
  assert.equal(f.sql.prepare('SELECT recorded_at FROM gpt_owner_metrics WHERE metric=?').get('profile_7d_tokens').recorded_at,START+1000);
});
test('invalid or duplicate batch measurements reject the whole request before writes',async()=>{
  const f=fixture();
  for(const measurements of [[],[{metric:'profile_7d_tokens',value:1},{metric:'profile_streak_days',value:1.1}],
    [{metric:'profile_7d_tokens',value:1},{metric:'profile_7d_tokens',value:2}],
    [{metric:'profile_7d_tokens',value:'12'}],[{metric:'profile_7d_tokens',value:1,shared:true}],
    [{metric:'not-approved',value:1}],Array.from({length:9},()=>({metric:'profile_7d_tokens',value:1}))]){
    assert.equal((await batch(f,0,measurements)).status,400);
    assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM gpt_owner_metrics').get().n,0);
    assert.equal(await currentRevision(f),0);
  }
});
test('database failure on later measurement rolls back earlier measurements and revision',async()=>{
  const f=fixture();
  f.sql.exec("CREATE TRIGGER inject_failure BEFORE INSERT ON gpt_owner_metrics WHEN NEW.metric='profile_streak_days' BEGIN SELECT RAISE(ABORT,'injected'); END;");
  const result=await batch(f,0,[{metric:'profile_7d_tokens',value:10},{metric:'profile_streak_days',value:5}]);
  assert.equal(result.status,503);
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM gpt_owner_metrics').get().n,0);
  assert.equal(await currentRevision(f),0);
});
test('two editors with the same revision produce one winner and no partial loser writes',async()=>{
  const f=fixture();
  const results=await Promise.all([
    batch(f,0,[{metric:'profile_7d_tokens',value:100},{metric:'profile_streak_days',value:3}]),
    batch(f,0,[{metric:'profile_7d_tokens',value:999},{metric:'business_7d_messages',value:20}]),
  ]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const rows=f.sql.prepare('SELECT metric,value FROM gpt_owner_metrics ORDER BY metric').all();
  assert.deepEqual(rows.map(r=>r.metric),['profile_7d_tokens','profile_streak_days']);
  assert.equal(rows[0].value,100);
});
test('sharing, deletion/recreation, older clock and legacy writes invalidate stale batches',async()=>{
  const f=fixture();f.grant();await f.save('profile_7d_tokens',10);
  let revision=await currentRevision(f);
  await f.owner('POST',{action:'sharing',metric:'profile_7d_tokens',enabled:true,revision:0});
  assert.equal((await batch(f,revision,[{metric:'profile_streak_days',value:3}])).status,409);
  revision=await currentRevision(f);
  assert.equal((await batch(f,revision,[{metric:'profile_7d_tokens',value:11}])).status,200);
  assert.equal(f.sql.prepare('SELECT shared FROM gpt_owner_metrics').get().shared,1,'existing consent preserved');
  revision=await currentRevision(f);
  await f.owner('DELETE',{metric:'profile_7d_tokens',revision:2});
  await f.save('profile_7d_tokens',12);
  assert.equal((await batch(f,revision,[{metric:'profile_7d_tokens',value:13}])).status,409);
  revision=await currentRevision(f);f.advance(-1000);
  assert.equal((await batch(f,revision,[{metric:'profile_streak_days',value:1}])).status,409);
  assert.equal(f.sql.prepare('SELECT value,shared FROM gpt_owner_metrics').get().value,12);
  assert.equal(f.sql.prepare('SELECT shared FROM gpt_owner_metrics').get().shared,0,'recreated metric private');
});
test('nonfeatured approved metrics never replace missing seven-day tokens or reveal private metrics',async()=>{
  const f=fixture();f.grant();
  await f.save('profile_7d_tokens',1);await f.save('business_7d_messages',2);
  await f.owner('POST',{action:'sharing',metric:'business_7d_messages',enabled:true,revision:0});
  const publicData=await readPublicGptSnapshot(f.env,f.now());
  assert.equal(publicData.count,null);assert.equal(publicData.state,'disconnected');
  assert.equal(publicData.observations.length,1);assert.equal(publicData.observations[0].metric,'business_7d_messages');
  f.sql.exec('UPDATE presence_state SET public_enabled=0,revision=revision+1');
  assert.deepEqual((await readPublicGptSnapshot(f.env,f.now())).observations,[]);
});

test('stale sharing and delete cannot act on a deleted and recreated private reading',async()=>{
  const f=fixture();f.grant();await f.save('profile_7d_tokens',10);
  const captureRevision=await currentRevision(f);
  assert.equal((await f.owner('DELETE',{metric:'profile_7d_tokens',revision:0,captureRevision})).status,200);
  await f.save('profile_7d_tokens',999);
  assert.equal(f.sql.prepare('SELECT revision FROM gpt_owner_metrics').get().revision,0,'row revision alone has an ABA collision');
  assert.equal((await f.owner('POST',{action:'sharing',metric:'profile_7d_tokens',enabled:true,revision:0,captureRevision})).status,409);
  assert.equal((await f.owner('DELETE',{metric:'profile_7d_tokens',revision:0,captureRevision})).status,409);
  const current=f.sql.prepare('SELECT value,shared FROM gpt_owner_metrics').get();
  assert.equal(current.value,999);assert.equal(current.shared,0);
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,null);
});

test('revocation during the final metric reread discards every previously approved observation',async()=>{
  const f=fixture();f.grant();await f.save('profile_7d_tokens',10);
  await f.owner('POST',{action:'sharing',metric:'profile_7d_tokens',enabled:true,revision:0});
  let reads=0;
  f.hook(q=>{
    if(q.startsWith('SELECT metric,value,source,recorded_at,revision,shared FROM gpt_owner_metrics ORDER BY')&&++reads===2)
      f.sql.exec("UPDATE gpt_owner_metrics SET shared=0,revision=revision+1 WHERE metric='profile_7d_tokens'");
  });
  const published=await readPublicGptSnapshot(f.env,f.now());
  assert.equal(reads,2);assert.equal(published.count,null);assert.deepEqual(published.observations,[]);
});

test('the aggregate signal reprojects GPT consent after awaiting a slow GitHub provider',async()=>{
  const f=fixture();
  for(const file of ['0003_presence_preferences.sql','0004_editor_pairing.sql','0006_cloud_presence.sql','0007_activity_tasks.sql'])
    f.sql.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
  f.grant();await f.save('profile_7d_tokens',10);
  await f.owner('POST',{action:'sharing',metric:'profile_7d_tokens',enabled:true,revision:0});
  const signal=createLiveSignal({clock:f.now,
    readGithub:async()=>{
      assert.equal((await f.owner('POST',{action:'sharing',metric:'profile_7d_tokens',enabled:false,revision:1})).status,200);
      return [];
    },
    readListening:async()=>Response.json({version:1,mode:'hidden',detailsVisible:false}),
  });
  const published=await signal(f.env);
  assert.equal(f.sql.prepare('SELECT shared FROM gpt_owner_metrics').get().shared,0);
  assert.equal(published.gpt.count,null);assert.deepEqual(published.gpt.observations,[]);
});

test('a missing capture-state sentinel cannot bootstrap itself through a batch write',async()=>{
  const f=fixture();f.sql.exec('DELETE FROM gpt_capture_state');
  assert.equal((await batch(f,0,[{metric:'profile_7d_tokens',value:10}])).status,409);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM gpt_owner_metrics').get().n,0);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM gpt_capture_state').get().n,0);
});
