import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHandler } from '../src/worker.mjs';
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
  let time=START, hook=()=>{};
  const db={prepare(q) {
    const stmt=sql.prepare(q);
    let values=[];
    return {
      bind(...v){values=v;return this;},
      async first(){const result=stmt.get(...values)||null;await hook(q);return result;},
      async all(){const result={results:stmt.all(...values)};await hook(q);return result;},
      async run(){const result=stmt.run(...values);return {meta:{changes:Number(result.changes)}};},
    };
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
  const owner=(method='GET',data,ctx=identity,origin)=>api(req(method,data,origin),env,ctx);
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
  await f.save('profile_lifetime_tokens_approx',2700000000);
  const one=await (await f.owner()).json();
  await f.owner('POST',{action:'sharing',metric:'profile_lifetime_tokens_approx',enabled:true,revision:0});
  f.advance(5*60_000);
  const old=await readPublicGptSnapshot(f.env,f.now());
  assert.equal(old.count,2700000000);
  assert.equal(old.asOf,one.observations[0].asOf);
  f.advance(21*60*60_000);
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).freshness,'recent');
  f.advance(4*60*60_000);
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).freshness,'historical');
  assert.equal((await f.save('profile_lifetime_tokens_approx',2800000000)).status,200);
  const newer=await readPublicGptSnapshot(f.env,f.now());
  assert.equal(newer.count,2800000000);
  assert.equal(newer.freshness,'recent');
  assert.equal(newer.source,'owner-profile-capture');
  assert.equal(newer.sourceUpdatedAt,null);
});
test('revocation, deletion and source failures never leave a published snapshot behind',async()=>{
  const f=fixture();f.grant();
  await f.save('profile_7d_messages',50);
  assert.equal((await f.owner('POST',{action:'sharing',metric:'profile_7d_messages',enabled:true,revision:0})).status,200);
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,50);
  assert.equal((await f.owner('POST',{action:'sharing',metric:'profile_7d_messages',enabled:false,revision:1})).status,200);
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,null);
  await f.owner('POST',{action:'sharing',metric:'profile_7d_messages',enabled:true,revision:2});
  assert.equal((await f.owner('DELETE',{metric:'profile_7d_messages'})).status,200);
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,null);
  f.env.GPT_SNAPSHOT_PUBLIC_RELEASE_APPROVED='false';
  f.env.LISTENING_DB={prepare(){throw Error('database should not be read without public gate');}};
  assert.equal((await readPublicGptSnapshot(f.env,f.now())).count,null);
});
test('different analytics scopes are typed; latest real observation wins, with no combined API totals',async()=>{
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
  assert.equal(latest.metric,'profile_streak_days');
  assert.equal(latest.count,3);
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
